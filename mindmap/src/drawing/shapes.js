import { Point } from "../layout/geometry.js"
import { attributes } from "./markup.js"

/* How far outside a node its selection's glow runs. */
const GLOW_GAP = 3

/* The shape a node is drawn in. Each shape knows how much room it needs
	round its words, how it is drawn, and where a branch meets it. The factory
	picks one by the style's word; nothing else asks which shape a node is.

	Every shape but none draws one element of class "outline", which carries
	the fill and the border. */
class Shape {
	/* Room round the words: across, then up and down, in parts of the font size. */
	get padding(){ return new Point( 0.85, 0.5 ) }

	size( content, fontSize ){
		return new Point( content.x + 2 * this.padding.x * fontSize, content.y + 2 * this.padding.y * fontSize )
	}

	/* Where a branch leaves or meets the node, going out in this direction. */
	anchor( box, direction ){
		return box.edgeToward( direction )
	}

	outline( box, style ){
		return "<rect" + attributes( { class: "outline", x: box.x, y: box.y, width: box.width, height: box.height, rx: this.radius( box ), ...paint( style ) } ) + "/>"
	}

	radius(){ return 0 }

	/* The selection's glow: the shape's own outline a little outside it,
		 drawn on screen only and coloured by the page's stylesheet. */
	glow( box ){
		const around = box.grown( GLOW_GAP )
		return "<rect" + attributes( { class: "halo", x: around.x, y: around.y, width: around.width, height: around.height, rx: this.radius( around ) } ) + "/>"
	}

	/* Whether the node's fill is seen behind its words. */
	get showsFill(){ return true }
}

class BoxShape extends Shape {}

class RoundShape extends Shape {
	radius( box ){ return Math.min( 8, box.height * 0.3 ) }
}

class PillShape extends Shape {
	get padding(){ return new Point( 1.2, 0.5 ) }
	radius( box ){ return box.height / 2 }
}

/* No shape at all: the words alone, on a bare rectangle of the map's own
	background — unseen, yet it masks a line passing behind the node, and the
	whole node takes the pointer and not only its letters. */
class PlainShape extends Shape {
	get padding(){ return new Point( 0.4, 0.35 ) }
	get showsFill(){ return false }

	outline( box, style, ground ){
		return "<rect" + attributes( { class: "bare", x: box.x, y: box.y, width: box.width, height: box.height, fill: ground, stroke: "none" } ) + "/>"
	}
}

const SHAPES = { box: new BoxShape(), round: new RoundShape(), pill: new PillShape(), none: new PlainShape() }

export function shapeFor( name ){
	return SHAPES[ name ] ?? SHAPES.pill
}

function paint( style ){
	return { fill: style.get( "fill" ), stroke: style.get( "borderWidth" ) > 0 ? style.get( "border" ) : "none", "stroke-width": style.get( "borderWidth" ) }
}
