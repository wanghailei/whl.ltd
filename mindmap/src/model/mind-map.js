import { Topic } from "./topic.js"
import { AuxiliaryLine } from "./auxiliary-line.js"
import { NODE, BRANCH, LINE, hexColour } from "./style.js"
import { ColourScheme } from "./colour-scheme.js"

export const LAYOUTS = [ "right", "both", "down" ]
export const APPEARANCES = [ "light", "dark" ]
/* The forms a map's auxiliary lines take, all alike: routed round the nodes in straight runs, or arcs (drawing/line-forms.js). */
export const LINE_FORMS = [ "straight", "arc" ]

/* The map owns kind defaults, an independent Canvas and one scheme value.
	Manual fills retain their precedence. Obsolete whole-level fills are
	ignored on both decoding paths, as ruled on 2026-11-12. */
export class MapStyle {
	constructor( { root = NODE.style(), node = NODE.style(), branch = BRANCH.style(), line = LINE.style(), colourScheme = ColourScheme.from(), canvas = "" } = {} ){
		Object.assign( this, { root, node, branch, line, colourScheme, canvas } )
	}

	static from( values = {} ){
		return new MapStyle( {
			root: NODE.style( values?.root ),
			node: NODE.style( values?.node ),
			branch: BRANCH.style( values?.branch ),
			line: LINE.style( values?.line ),
			colourScheme: ColourScheme.from( values?.colourScheme ),
			canvas: hexColour( values?.canvas ) ?? "",
		} )
	}

	/* Shared interpretation for v1/v2 files and unversioned old defaults.
		A v3 record, including imported colours re-saved in v3, uses from(). */
	static legacy( values = {}, theme ){
		return MapStyle.from( { ...values, colourScheme: ColourScheme.legacy( { theme, colourStyle: values?.colourStyle } ) } )
	}

	forTopic( topic ){
		return topic.isRoot ? this.root : this.node
	}

	withStyleFor( topic, style ){
		return this.withKind( topic.isRoot ? "root" : "node", style )
	}

	withKind( kind, style ){
		return new MapStyle( { ...this, [ kind ]: style } )
	}

	withColourScheme( scheme ){
		return new MapStyle( { ...this, colourScheme: ColourScheme.from( scheme ) } )
	}

	withCanvas( colour ){
		return new MapStyle( { ...this, canvas: colour ?? "" } )
	}

	toJSON(){
		return { root: this.root.toJSON(), node: this.node.toJSON(), branch: this.branch.toJSON(), line: this.line.toJSON(), colourScheme: this.colourScheme.toJSON(), canvas: this.canvas }
	}
}

/* A mind map: the tree of topics under its central node, the auxiliary lines
	between them and the form they take, and the map's layout,
	appearance and styles, including its colour scheme.

	Pre-flight answers. The map owns the identities of its topics and lines and
	hands out new ones, so two never share one. It owns removal too: a topic
	that goes takes its lines with it, which no caller could be trusted to
	remember. Layout, appearance and line form refuse a name the map does not know,
	so a map is never in a state no code can draw. Two topics are joined by one
	line at most, either way, at the master's word (2026-11-12): the map makes
	no second, and of several handed to it, as an older file may hold, it
	keeps the first. A line joins two topics, never one to itself: the editor
	never made one, and an arc cannot be drawn from a tail to that same tail
	(found in review, 2026-11-12: one in a hand-edited file stopped the page
	drawing), so the map makes none and keeps none handed to it. */
export class MindMap {
	constructor( { root, layout = "right", appearance = "dark", lineForm = "straight", style = new MapStyle(), lines = [] } ){
		this.root = root
		this.chosenLayout = "right"
		this.chosenAppearance = "dark"
		this.chosenLineForm = "straight"
		this.layout = layout
		this.appearance = appearance
		this.lineForm = lineForm
		this.style = style
		this.lines = lines.filter( ( line, index ) => line.from !== line.to && lines.findIndex( other => other.joins( line.from, line.to ) ) === index )
		this.counters = { topic: highest( this.topics.map( topic => topic.id ), "n" ), line: highest( lines.map( line => line.id ), "l" ) }
	}

	/* A new map: one central node, and the styles a user saved as their default. */
	static fresh( { text, style, appearance = "dark" } ){
		const defaults = style ?? { colourScheme: { mode: "uniform", fill: appearance === "light" ? "#000000" : "#ffffff" }, canvas: appearance === "light" ? "#ffffff" : "#000000" }
		return new MindMap( { root: new Topic( { id: "n1", text } ), style: MapStyle.from( defaults ), appearance } )
	}

	get topics(){
		return [ ...this.root.walk() ]
	}

	find( id ){
		return this.topics.find( topic => topic.id === id ) ?? null
	}

	/* A topic with an identity no other in this map has; it is not yet in the tree. */
	newTopic( fields = {} ){
		this.counters.topic += 1
		return new Topic( { ...fields, id: "n" + this.counters.topic } )
	}

	/* A copy of a topic and everything under it, words, remarks, folds and
		 styles, each given an identity of this map's; it is not yet in the tree.
		 Styles are frozen values, so the copies share them. */
	copyOf( topic ){
		const copy = this.newTopic( { text: topic.text, remark: topic.remark, folded: topic.folded, style: topic.style, branch: topic.branch } )
		for( const child of topic.children ) copy.adopt( this.copyOf( child ) )
		return copy
	}

	/* The central node stays: a map without one is not a map. */
	remove( topic ){
		if( topic.isRoot ) return
		const leaving = [ ...topic.walk() ]
		topic.parent.release( topic )
		this.lines = this.lines.filter( line => !leaving.some( gone => line.touches( gone ) ) )
	}

	/* A new line between two topics, or, where a line already joins them either way, that line, and none is made; none from a topic to itself. */
	newLine( fields ){
		if( fields.from === fields.to ) return null
		const joining = this.lineBetween( fields.from, fields.to )
		if( joining ) return joining
		this.counters.line += 1
		const line = new AuxiliaryLine( { ...fields, id: "l" + this.counters.line } )
		this.lines.push( line )
		return line
	}

	findLine( id ){
		return this.lines.find( line => line.id === id ) ?? null
	}

	/* The line joining the topics of these two identities, either way, or null. */
	lineBetween( one, other ){
		return this.lines.find( line => line.joins( one, other ) ) ?? null
	}

	removeLine( line ){
		this.lines = this.lines.filter( each => each !== line )
	}

	/* The first line of the central node's text, which names the map's files. */
	get title(){
		return this.root.text.split( "\n" )[ 0 ].trim()
	}

	get layout(){ return this.chosenLayout }
	set layout( name ){ if( LAYOUTS.includes( name ) ) this.chosenLayout = name }

	get appearance(){ return this.chosenAppearance }
	set appearance( name ){ if( APPEARANCES.includes( name ) ) this.chosenAppearance = name }

	get lineForm(){ return this.chosenLineForm }
	set lineForm( name ){ if( LINE_FORMS.includes( name ) ) this.chosenLineForm = name }

	toJSON(){
		return {
			layout: this.layout,
			appearance: this.appearance,
			lineForm: this.lineForm,
			style: this.style.toJSON(),
			root: this.root.toJSON(),
			auxiliaryLines: this.lines.map( line => line.toJSON() ),
		}
	}
}

/* The largest number among identities of the form prefix-and-digits, so new
	ones carry on past every one already in use. */
function highest( ids, prefix ){
	const numbers = ids.map( id => new RegExp( "^" + prefix + "(\\d+)$" ).exec( id ) ).filter( Boolean ).map( match => Number( match[ 1 ] ) )
	return Math.max( 0, ...numbers )
}
