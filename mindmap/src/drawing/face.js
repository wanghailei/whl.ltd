import { Point, Box } from "../layout/geometry.js"
import { shapeFor, shownFill } from "./shapes.js"
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

	/* What its words stand on: the fill it shows, or else the ground under it. */
	backdrop( ground ){
		return shownFill( this.style ) ?? ground
	}

	/* Where the words and marks stand in the node's box: in its middle. */
	wordsIn( box ){
		const content = this.content
		return Box.around( box.centre, content.x, content.y )
	}

	/* The node drawn in its box on the map's background: outline, words, marks. */
	markup( box, ground, { screen = false } = {} ){
		const { left, top } = this.wordsIn( box )
		const ink = { class: this.placeholder ? "words placeholder" : "words", fill: this.style.get( "textColour" ), opacity: this.placeholder ? PLACEHOLDER_INK : undefined }
		const words = this.drawsWords( screen ) ? this.wordsMarkup( left, top, ink ) : ""
		return this.shape.outline( box, this.style, ground ) + words + this.marksMarkup( box )
	}

	/* The words' own shapes and the marks' squares, where they are drawn:
		 what a mask keeps clear of the lines drawn over the nodes, so the
		 words read whole and a line still shows between them (map-picture.js). */
	clearing( box, { screen = false } = {} ){
		const { left, top } = this.wordsIn( box )
		const words = this.drawsWords( screen ) ? this.wordsMarkup( left, top, { class: "clearing" } ) : ""
		const marks = this.markBoxes( box ).map( mark => "<rect" + attributes( { x: mark.x, y: mark.y, width: mark.width, height: mark.height } ) + "/>" )
		return words + marks.join( "" )
	}

	/* A placeholder is the page's prompt, drawn on the screen alone; words are drawn everywhere. */
	drawsWords( screen ){
		return screen || !this.placeholder
	}

	/* One text element per line, each centred on its own line's middle, so
		 every renderer — browser, rasteriser, editor — sets them alike, in the
		 paint given. */
	wordsMarkup( left, top, { class: name, ...paint } ){
		return this.lines.map( ( line, index ) => "<text" + attributes( {
			class: name,
			x: left,
			y: top + ( index + 0.5 ) * this.lineHeight,
			"dominant-baseline": "central",
			"font-family": this.font.family,
			"font-size": this.font.size,
			...paint,
		} ) + ">" + escaped( line ) + "</text>" ).join( "" )
	}

	/* The remark mark is three short strokes, a page of lines, in the text's
		 colour, drawn rather than set as characters, since not every face has
		 the glyph. */
	marksMarkup( box ){
		const colour = this.style.get( "textColour" )
		return this.markBoxes( box ).map( ( mark, index ) => MARKS[ this.marks[ index ] ]( mark, colour ) ).join( "" )
	}

	/* Each mark's square, after the words, on the box's middle line. */
	markBoxes( box ){
		const size = MARK_SIZE * this.font.size
		const left = this.wordsIn( box ).left + this.textWidth
		return this.marks.map( ( mark, index ) => new Box( left + MARK_GAP * this.font.size + index * ( MARK_SIZE + MARK_GAP ) * this.font.size, box.centre.y - size / 2, size, size ) )
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
