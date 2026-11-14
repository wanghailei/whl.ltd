import { fileName } from "./file-name.js"

/* A heading, its closing hashes taken off only when a space stands before them, as Markdown has it. */
const HEADING = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/
const ITEM = /^([ \t]*)(?:[-*+]|\d+[.)])\s+(.*)$/
/* What would read as markup — a heading, an item, a code fence, a heading's
	underline: a remark's line like it is written with a backslash before it,
	and read back without. */
const MARKUP = String.raw`#{1,6}\s|[-*+]\s|\d+[.)]\s|` + "```" + String.raw`|~~~|=+\s*$|-+\s*$`
const LOOKS_LIKE_MARKUP = new RegExp( "^(?:" + MARKUP + ")" )
const ESCAPED_MARKUP = new RegExp( String.raw`^\\(?=(?:` + MARKUP + "))" )
const FENCE = /^\s*(```|~~~)/
const UNDERLINE = /^(=+|-+)\s*$/
/* Items rank below every heading: an item belongs to the heading above it. */
const ITEM_RANK = 100
/* A Markdown link round all the words — they may hold brackets, but no
	"](" — or one among them. An address may hold brackets of its own, one
	pair deep, as Markdown allows. A node has no link, so only the link's
	words are kept. */
const WHOLE_LINK = /^\[((?:(?!\]\().)*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)$/
const INNER_LINK = /\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g

/* Why an outline could not be made into a map: it had nothing to make one of. */
export class OutlineError extends Error {
	constructor( reason ){
		super( "The outline could not be made into a map: " + reason + "." )
		this.reason = reason
	}
}

/* A map as a Markdown outline, and an outline as a map.

	Written, the central node is a heading and every other node an item,
	nested two spaces a level, with its remark on the lines under it, blank
	lines and all. That much reads back exactly; a node's words on several
	lines come back as one, a remark's lines lose their indentation, and
	styles, folds and auxiliary lines are not in an outline at all — the
	.mindmap.json file keeps those.

	Read, any outline will do: headings of any depth, underlined or not, and
	items marked -, *, + or 1., nested by indentation; code blocks are passed
	over, and a link keeps its words but not its address. A single
	top-level heading or item is the central node; with several, a new
	central node holds them. The map is begun by `newMap`, the page's own
	way of beginning a new map. */
export class Outline {
	static SUFFIX = ".md"

	write( map ){
		/* A hash closing the central node's words is escaped, or it would read as the heading's closing mark. */
		const lines = [ "# " + this.words( map.root ).replace( /(\s#*)#$/, "$1\\#" ), "" ]
		if( map.root.remark ) lines.push( ...this.remarkLines( map.root, "" ), "" )
		for( const child of map.root.children ) this.writeItem( child, 0, lines )
		return lines.join( "\n" ).replace( /\n*$/, "\n" )
	}

	read( text, newMap ){
		const tops = this.tree( new OutlineReading( text ).entries )
		if( tops.length === 0 ) throw new OutlineError( "empty" )
		const single = tops.length === 1
		const map = single ? newMap( "" ) : newMap()
		if( single ) this.fillTopic( map.root, tops[ 0 ] )
		for( const entry of single ? tops[ 0 ].children : tops ) this.grow( map, map.root, entry )
		return map
	}

	nameFor( map ){
		return fileName( map.title, Outline.SUFFIX )
	}

	// ── Writing ─────────────────────────────────────────────────────

	writeItem( topic, depth, lines ){
		const indent = "  ".repeat( depth )
		lines.push( indent + "- " + this.words( topic ) )
		lines.push( ...this.remarkLines( topic, indent + "  " ) )
		for( const child of topic.children ) this.writeItem( child, depth + 1, lines )
	}

	words( topic ){
		return topic.text.split( "\n" ).join( " " )
	}

	/* A remark's lines under its node; a blank one stays blank, and one that would read as an entry is escaped. */
	remarkLines( topic, indent ){
		if( !topic.remark ) return []
		return topic.remark.split( "\n" ).map( line => line.trim() ).map( line => line === "" ? "" : indent + ( LOOKS_LIKE_MARKUP.test( line ) ? "\\" : "" ) + line )
	}

	// ── Reading ─────────────────────────────────────────────────────

	/* Each entry under the nearest entry before it of a higher rank. */
	tree( entries ){
		const tops = [], open = []
		for( const entry of entries ){
			while( open.length > 0 && open[ open.length - 1 ].rank >= entry.rank ) open.pop()
			if( open.length > 0 ) open[ open.length - 1 ].children.push( entry )
			else tops.push( entry )
			open.push( entry )
		}
		return tops
	}

	grow( map, parent, entry ){
		const topic = map.newTopic()
		this.fillTopic( topic, entry )
		parent.adopt( topic )
		for( const child of entry.children ) this.grow( map, topic, child )
	}

	/* An entry's words into a node, and the lines under it into its remark.
		 A link among the words, or round them all, keeps its words and drops
		 its address; an emoji is a word like any other. */
	fillTopic( topic, entry ){
		const words = entry.words.trim()
		const whole = WHOLE_LINK.exec( words )
		topic.text = whole ? whole[ 1 ] : words.replace( INNER_LINK, "$1" )
		topic.remark = entry.remark.join( "\n" )
	}
}

/* One pass down an outline's lines, gathering its headings and items in
	order, each with its rank and the remark lines under it. A paragraph before
	the first entry has nothing to belong to and is left out. */
class OutlineReading {
	constructor( text ){
		this.entries = []
		this.blanks = 0
		this.inCode = false
		this.lastPlain = null
		for( const line of text.split( /\r?\n/ ) ) this.take( line )
	}

	take( line ){
		if( FENCE.test( line ) ){
			this.inCode = !this.inCode
			return
		}
		if( this.inCode ) return
		const plain = this.lastPlain
		this.lastPlain = null
		if( plain && UNDERLINE.test( line ) ){
			this.underline( plain, line.trim()[ 0 ] === "=" ? 1 : 2 )
			return
		}
		const heading = HEADING.exec( line ), item = ITEM.exec( line )
		if( heading ) this.add( heading[ 1 ].length, heading[ 2 ].replace( /\\#$/, "#" ) )
		else if( item ) this.add( ITEM_RANK + indentWidth( item[ 1 ] ), item[ 2 ] )
		else if( line.trim() === "" ) this.blanks += 1
		else this.plainLine( line.trim() )
	}

	add( rank, words ){
		this.entries.push( { rank, words, remark: [], children: [] } )
		this.blanks = 0
	}

	/* A line of words under an entry is its remark; blank lines between two of them stay. */
	plainLine( line ){
		const entry = this.entries[ this.entries.length - 1 ]
		this.lastPlain = { line, entry }
		if( !entry ) return
		if( entry.remark.length > 0 ) for( let blank = 0; blank < this.blanks; blank++ ) entry.remark.push( "" )
		entry.remark.push( line.replace( ESCAPED_MARKUP, "" ) )
		this.blanks = 0
	}

	/* A line of words underlined with = or - is a heading, taken back from the remark it was put in. */
	underline( { line, entry }, level ){
		if( entry ) entry.remark.pop()
		this.add( level, line )
	}
}

/* Indentation as a width, a tab counting as four spaces. */
function indentWidth( indent ){
	return [ ...indent ].reduce( ( width, character ) => width + ( character === "\t" ? 4 : 1 ), 0 )
}
