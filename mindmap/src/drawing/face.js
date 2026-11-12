import { Point, Box } from "../layout/geometry.js"
import { shapeFor } from "./shapes.js"
import { fontFamily } from "./fonts.js"
import { attributes, escaped } from "./markup.js"

/* Lines of a node's text are this many font sizes apart. */
const LINE_SPACING = 1.3
/* The remark mark is drawn this many font sizes square, with this much room before it. */
const MARK_SIZE = 0.75
const MARK_GAP = 0.45
/* A placeholder is written in the words' own colour, held back to this much. */
const PLACEHOLDER_INK = 0.5

/* A node's face: its words and marks set in its style, and the shape
	round them — what decides the node's size, and how its inside is drawn.

	Measuring is injected: in the browser the page's canvas measures with the
	real face; under test a fixed width stands in.

	A central node with no words shows a placeholder in their place, in
	held-back ink, and is as wide as it, so the map does not jump when the
	first word is typed. It is the page's prompt, not the node's words: it is drawn
	only on screen, and the node's words stay empty until typed. */
export class Face {
	constructor( topic, style, measure, placeholder = "", text = topic.text ){
		this.topic = topic
		this.style = style
		this.shape = shapeFor( style.get( "shape" ) )
		this.font = { family: fontFamily( style.get( "font" ) ), size: style.get( "fontSize" ) }
		this.placeholder = topic.isRoot && text === "" ? placeholder : ""
		this.lines = ( this.placeholder || text ).split( "\n" )
		/* An empty node keeps the width of two characters, so it can still be seen and clicked. */
		this.textWidth = Math.max( this.font.size * 1.2, ...this.lines.map( line => measure.width( line, this.font ) ) )
		this.marks = topic.remark ? [ "remark" ] : []
	}

	get lineHeight(){
		return this.font.size * LINE_SPACING
	}

	/* The words and marks together, before the shape's room round them. */
	get content(){
		const marks = this.marks.length * ( MARK_SIZE + MARK_GAP ) * this.font.size
		return new Point( this.textWidth + marks, this.lines.length * this.lineHeight )
	}

	get size(){
		return this.shape.size( this.content, this.font.size )
	}

	anchor( box, direction ){
		return this.shape.anchor( box, direction )
	}

	glow( box ){
		return this.shape.glow( box )
	}

	/* The node drawn in its box on the map's background: outline, words, marks. */
	markup( box, ground, { screen = false } = {} ){
		const content = this.content
		const left = box.centre.x - content.x / 2
		const top = box.centre.y - content.y / 2
		const words = this.placeholder && !screen ? "" : this.wordsMarkup( left, top )
		return this.shape.outline( box, this.style, ground ) + words + this.marksMarkup( left + this.textWidth, box.centre.y )
	}

	/* One text element per line, each centred on its own line's middle, so
		 every renderer — browser, rasteriser, editor — sets them alike. */
	wordsMarkup( left, top ){
		return this.lines.map( ( line, index ) => "<text" + attributes( {
			class: this.placeholder ? "words placeholder" : "words",
			x: left,
			y: top + ( index + 0.5 ) * this.lineHeight,
			"dominant-baseline": "central",
			"font-family": this.font.family,
			"font-size": this.font.size,
			fill: this.style.get( "textColour" ),
			opacity: this.placeholder ? PLACEHOLDER_INK : undefined,
		} ) + ">" + escaped( line ) + "</text>" ).join( "" )
	}

	/* The remark mark is three short strokes, a page of lines, in the text's
		 colour, drawn rather than set as characters, since not every face has
		 the glyph. */
	marksMarkup( left, middle ){
		const size = MARK_SIZE * this.font.size
		const colour = this.style.get( "textColour" )
		return this.marks.map( ( mark, index ) => {
			const box = new Box( left + MARK_GAP * this.font.size + index * ( MARK_SIZE + MARK_GAP ) * this.font.size, middle - size / 2, size, size )
			return MARKS[ mark ]( box, colour )
		} ).join( "" )
	}
}

const MARKS = {
	remark( box, colour ){
		const strokes = [ 0.2, 0.5, 0.8 ].map( share => `M ${ box.left } ${ box.top + share * box.height } H ${ box.right - ( share === 0.8 ? box.width * 0.35 : 0 ) }` ).join( " " )
		return "<path" + attributes( { class: "remark-mark", d: strokes, stroke: colour, "stroke-width": Math.max( 1, box.width / 9 ), fill: "none" } ) + "/>"
	},
}

/* Every shown node's face, made once per drawing. The node whose words are
	being written, if any, is faced with those words as they stand. */
export class Faces {
	constructor( look, measure, placeholder = "", writing = null ){
		this.look = look
		this.measure = measure
		this.placeholder = placeholder
		this.writing = writing
		this.made = new Map()
	}

	of( topic ){
		const text = this.writing?.topic === topic ? this.writing.text : topic.text
		if( !this.made.has( topic ) ) this.made.set( topic, new Face( topic, this.look.node( topic ), this.measure, this.placeholder, text ) )
		return this.made.get( topic )
	}
}
