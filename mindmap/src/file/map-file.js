import { MindMap, MapStyle } from "../model/mind-map.js"
import { Topic } from "../model/topic.js"
import { AuxiliaryLine } from "../model/auxiliary-line.js"
import { NODE, BRANCH, LINE } from "../model/style.js"
import { fileName } from "./file-name.js"

export const FORMAT = "whl-mindmap"
/* 2 since 0.2.0: the map's style holds level fills and a canvas colour,
	which a Mindmap reading version 1 would lose without a word. */
export const VERSION = 2

/* Version 1 gave a new map's central node these words as its own, in
	English or Chinese, where later versions show only a placeholder. Read
	from a version-1 map, they were that placeholder, so the node opens with
	no words, shows the placeholder, and typing into it starts afresh — a
	draft kept in the browser by 0.1.0 would otherwise keep the very fault
	0.2.0 mends (found in review, 2026-11-12). */
const VERSION_ONE_CENTRAL_WORDS = [ "Central idea", "中心主題" ]

/* Why a file could not be opened, said as a reason the page can put into
	words: not-a-map, newer (with the version the file says) or broken. */
export class MapFileError extends Error {
	constructor( reason, { version } = {} ){
		super( "The file could not be opened as a map: " + reason + "." )
		this.reason = reason
		this.version = version
	}
}

/* The map's own file, `.mindmap.json`: every topic with its words, remark,
	styles and fold, every auxiliary line and the form the lines take, the
	map's styles, theme, appearance and layout, under the format's name and
	version. The lines' form came with 0.26.0 and needs no new version: a
	file without it, or a Mindmap before it reading one with it, draws the
	lines straight, as they were. Writing and reading are
	exact inverses for every map the editor makes, which the round-trip test
	holds it to.

	A file from before 0.2.0 may hold an icon or a link on a node, which
	Mindmap no longer has: both are passed over, as are the arrowheads a file
	from before 0.24.0 gives its lines. Its note is read as the
	node's remark, the same words under their new name, and its oval and
	underline shapes as pills (model/style.js).

	Reading is lenient where a hand-edited file can be mended without guessing
	— a doubled identity gets a new one, an unknown value falls back, a line to
	a topic that is not there is dropped, and of several lines between the same
	two topics the map keeps the first, and none from a topic to itself — and
	strict only where it cannot:
	text that is not a map, a newer version, no central node. */
export class MapFile {
	static SUFFIX = ".mindmap.json"

	write( map ){
		return JSON.stringify( { format: FORMAT, version: VERSION, ...map.toJSON() }, null, "\t" ) + "\n"
	}

	read( text ){
		const saved = parsed( text )
		if( saved.version > VERSION ) throw new MapFileError( "newer", { version: saved.version } )
		if( !isRecord( saved.root ) ) throw new MapFileError( "broken" )
		const root = new TopicReader().read( saved.root )
		if( !( saved.version >= 2 ) && VERSION_ONE_CENTRAL_WORDS.includes( root.text ) ) root.text = ""
		const lines = linesFrom( saved.auxiliaryLines, root )
		return new MindMap( { root, layout: saved.layout, theme: saved.theme, appearance: saved.appearance, lineForm: saved.lineForm, style: MapStyle.from( saved.style ), lines } )
	}

	nameFor( map ){
		return fileName( map.title, MapFile.SUFFIX )
	}
}

function parsed( text ){
	let saved
	try {
		saved = JSON.parse( text )
	} catch {
		throw new MapFileError( "not-a-map" )
	}
	if( !isRecord( saved ) || saved.format !== FORMAT ) throw new MapFileError( "not-a-map" )
	return saved
}

/* Builds the tree, giving any topic whose identity is missing or already
	taken one of its own: two topics sharing an identity would make every
	lookup, selection and line between them ambiguous. */
class TopicReader {
	constructor(){
		this.taken = new Set()
		this.pending = []
	}

	read( saved ){
		const root = this.topic( saved )
		this.namePending()
		return root
	}

	topic( saved ){
		const topic = new Topic( {
			id: this.claim( saved.id ),
			text: words( saved.text ),
			remark: [ saved.remark, saved.note ].find( value => typeof value === "string" ) ?? "",
			folded: saved.folded === true,
			style: NODE.style( saved.style ),
			branch: BRANCH.style( saved.branch ),
		} )
		if( topic.id === null ) this.pending.push( topic )
		const children = Array.isArray( saved.children ) ? saved.children.filter( isRecord ) : []
		for( const child of children ) topic.adopt( this.topic( child ) )
		return topic
	}

	claim( id ){
		if( typeof id !== "string" || id === "" || this.taken.has( id ) ) return null
		this.taken.add( id )
		return id
	}

	/* Every topic read without an identity of its own gets the next free one. */
	namePending(){
		let number = 0
		for( const topic of this.pending ){
			do number += 1; while( this.taken.has( "n" + number ) )
			topic.id = "n" + number
			this.taken.add( topic.id )
		}
	}
}

function linesFrom( saved, root ){
	const known = new Set( [ ...root.walk() ].map( topic => topic.id ) )
	const lines = Array.isArray( saved ) ? saved.filter( isRecord ) : []
	const read = lines.filter( line => known.has( line.from ) && known.has( line.to ) ).map( function( line ){
		return new AuxiliaryLine( { id: line.id, from: line.from, to: line.to, label: words( line.label ), style: LINE.style( line.style ) } )
	} )
	/* As with topics: a missing or doubled identity is replaced by the next free one. */
	const taken = new Set()
	const pending = read.filter( function( line ){
		const fine = typeof line.id === "string" && line.id !== "" && !taken.has( line.id )
		if( fine ) taken.add( line.id )
		return !fine
	} )
	let number = 0
	for( const line of pending ){
		do number += 1; while( taken.has( "l" + number ) )
		line.id = "l" + number
		taken.add( line.id )
	}
	return read
}

function words( value ){
	if( value === undefined || value === null ) return ""
	return String( value )
}

function isRecord( value ){
	return typeof value === "object" && value !== null && !Array.isArray( value )
}
