import { Look } from "./look.js"
import { Faces } from "./face.js"
import { Layout } from "../layout/layout.js"
import { Box } from "../layout/geometry.js"
import { branchShapeFor } from "./branch-shapes.js"
import { inkOver } from "./colour.js"
import { fontFamily } from "./fonts.js"
import { attributes, escaped, rounded } from "./markup.js"
import { lineFormFor } from "./line-forms.js"

/* Room round the map in an exported picture. */
const FRAME_MARGIN = 40
const FOLD_BADGE_RADIUS = 8
const LABEL_SIZE = 12
/* A label's edge of the map's background, half its outline's width. */
const LABEL_EDGE = 2
/* How wide the unseen stroke is that takes a press on a line or a branch. */
const LINE_TARGET = 14

/* The map as a picture: laid out by its layout, every node in its look, its
	branches and auxiliary lines, as SVG.

	The screen and every export are drawn from this one picture, so what is
	seen is what leaves the page. The screen's own additions — the selection
	halos, the open fold dots, the wide invisible strokes that make a thin line
	easy to click, the placeholder of an empty central node — are asked for
	with `screen` and never reach a file. */
export class MapPicture {
	/* `writing`, a node and the words being written into it, draws the map
		 as it would stand with them, while the map itself keeps its own. */
	constructor( map, { measure, placeholder = "", writing = null } ){
		this.map = map
		this.look = new Look( map )
		this.measure = measure
		this.faces = new Faces( this.look, measure, placeholder, writing )
		this.arrangement = Layout.for( map ).arrange( map.root, this.faces )
		this.lineForm = map.lines.length > 0 ? lineFormFor( map.lineForm, { boxes: this.arrangement.topics.map( topic => this.arrangement.boxOf( topic ) ) } ) : null
		/* Shaped in turn, so each label keeps clear of the labels before it. */
		this.lineShapes = []
		for( const line of map.lines ){
			const shape = this.lineShape( line )
			if( shape ) this.lineShapes.push( shape )
		}
	}

	/* The drawing's elements: branches first; on the screen, the auxiliary
		 lines' wide unseen press targets, under the nodes, since a line's
		 target over the nodes took the clicks meant for them (found in use,
		 2026-11-12); then the lines and the nodes, in the order the lines' form
		 gives: straight lines, routed round the nodes, under them, and arcs,
		 which may cross a node, over them, so an arc is never hidden behind a
		 node (the master's word, 2026-11-12, 22:28); and last the lines'
		 labels, which must be read. */
	markup( { screen = false } = {} ){
		const shown = this.arrangement.topics
		const targets = screen ? "<g class=\"line-targets\">" + this.lineShapes.map( shape => this.targetMarkup( shape ) ).join( "" ) + "</g>" : ""
		const lines = "<g class=\"lines\">" + this.lineShapes.map( shape => this.lineMarkup( shape, screen ) ).join( "" ) + "</g>"
		const topics = "<g class=\"topics\">" + shown.map( topic => this.topicMarkup( topic, screen ) ).join( "" ) + "</g>"
		return "<g class=\"branches\">" + shown.filter( topic => !topic.isRoot ).map( topic => this.branchMarkup( topic, screen ) ).join( "" ) + "</g>" +
			targets + ( this.lineForm?.liesOverNodes ? topics + lines : lines + topics ) +
			"<g class=\"line-labels\">" + this.lineShapes.map( shape => this.labelMarkup( shape ) ).join( "" ) + "</g>"
	}

	/* The picture as a standalone SVG file, on the map's background, framing
		 everything drawn. A font face may be given for a rasteriser, which
		 cannot reach the page's own fonts. */
	document( { fontFace = "" } = {} ){
		const frame = this.frame
		const style = fontFace ? "<style>" + fontFace + "</style>" : ""
		return "<svg" + attributes( { xmlns: "http://www.w3.org/2000/svg", width: frame.width, height: frame.height, viewBox: [ frame.x, frame.y, frame.width, frame.height ].map( rounded ).join( " " ) } ) + ">" +
			style +
			"<rect" + attributes( { class: "background", x: frame.x, y: frame.y, width: frame.width, height: frame.height, fill: this.look.background } ) + "/>" +
			this.markup() + "</svg>\n"
	}

	/* Everything drawn, with room round it, in whole pixels. */
	get frame(){
		const points = this.lineShapes.flatMap( shape => [ ...shape.waypoints, shape.label ] ).map( point => new Box( point.x - 30, point.y - 10, 60, 20 ) )
		const drawn = Box.enclosing( [ this.arrangement.bounds, ...points ] ).grown( FRAME_MARGIN )
		return new Box( Math.floor( drawn.x ), Math.floor( drawn.y ), Math.ceil( drawn.width ), Math.ceil( drawn.height ) )
	}

	// ── Branches ────────────────────────────────────────────────────

	/* The central node grows every way, so a branch leaves it the way its own node grows. */
	/* On screen a branch, like an auxiliary line, has a wide unseen stroke
		 that takes a press, so it can be selected and its look changed at once,
		 and a glow for when it is (the master's word, 2026-11-12). */
	branchMarkup( topic, screen ){
		const parent = topic.parent
		const arriving = this.arrangement.directionOf( topic )
		const leaving = parent.isRoot ? arriving : this.arrangement.directionOf( parent )
		const from = this.faces.of( parent ).anchor( this.arrangement.boxOf( parent ), arriving )
		const to = this.faces.of( topic ).anchor( this.arrangement.boxOf( topic ), arriving.times( -1 ) )
		const style = this.look.branch( topic )
		const d = branchShapeFor( style.get( "shape" ) ).path( from, to, { leaving, arriving } )
		const target = screen ? "<path" + attributes( { class: "branch-target", d, fill: "none", stroke: "transparent", "stroke-width": LINE_TARGET } ) + "/>" : ""
		const halo = screen ? "<path" + attributes( { class: "branch-halo", d, fill: "none" } ) + "/>" : ""
		return "<g" + attributes( { "data-branch": topic.id } ) + ">" + target + halo + "<path" + attributes( { class: "branch", d, fill: "none", ...stroke( style ) } ) + "/></g>"
	}

	// ── Nodes ───────────────────────────────────────────────────────

	topicMarkup( topic, screen ){
		const box = this.arrangement.boxOf( topic )
		const face = this.faces.of( topic )
		const remark = topic.remark ? "<title>" + escaped( topic.remark ) + "</title>" : ""
		const halo = screen ? face.glow( box ) : ""
		return "<g" + attributes( { class: "topic", "data-topic": topic.id } ) + ">" + remark + halo + face.markup( box, this.look.background, { screen } ) + this.foldMarkup( topic, screen ) + "</g>"
	}

	/* A folded node wears a badge at its growing side with how many nodes it
		 hides. On screen, a node with open children has a small dot there to
		 fold them by. */
	foldMarkup( topic, screen ){
		if( topic.children.length === 0 ) return ""
		if( !topic.folded && !screen ) return ""
		const growth = this.arrangement.directionOf( topic )
		const edge = this.faces.of( topic ).anchor( this.arrangement.boxOf( topic ), growth )
		const colour = this.look.branch( topic.children[ 0 ] ).get( "colour" )
		if( !topic.folded ){
			const centre = edge.plus( growth.times( 6 ) )
			return "<circle" + attributes( { class: "fold-dot", cx: centre.x, cy: centre.y, r: 4, fill: this.look.background, stroke: colour, "stroke-width": 1.5 } ) + "/>"
		}
		const centre = edge.plus( growth.times( FOLD_BADGE_RADIUS + 2 ) )
		return "<g class=\"fold-badge\"><circle" + attributes( { cx: centre.x, cy: centre.y, r: FOLD_BADGE_RADIUS, fill: colour } ) + "/>" +
			"<text" + attributes( { x: centre.x, y: centre.y, "text-anchor": "middle", "dominant-baseline": "central", "font-family": fontFamily( "mono" ), "font-size": 10, fill: inkOver( colour ) } ) + ">" + topic.hiddenCount + "</text></g>"
	}

	// ── Auxiliary lines ─────────────────────────────────────────────

	/* Where a line runs, at the master's word (2026-11-12): out of the tail of
		 one node — the end away from its parent, the way the node grows — and
		 into the tail of the other, in the form the map's lines take
		 (line-forms.js): routed round every node between, or one arc. A line
		 to a node under a fold is not drawn. */
	lineShape( line ){
		const from = this.map.find( line.from ), to = this.map.find( line.to )
		if( !from || !to || !this.arrangement.boxOf( from ) || !this.arrangement.boxOf( to ) ) return null
		/* The way is found always from the same one of the two nodes, the
			 earlier by identity, as the search from the other end need not find
			 the same way: so a line runs the same whichever node it was drawn
			 from, and as 0.22.4 to 0.23.0 drew it. */
		const forward = line.from <= line.to
		const [ first, second ] = forward ? [ from, to ] : [ to, from ]
		const style = this.look.line( line )
		const found = this.lineForm.course( this.tailOf( first ), this.tailOf( second ) )
		const course = forward ? found : found.reversed()
		const label = this.labelAt( line, course )
		return { line, style, start: course.start, end: course.end, waypoints: course.points, path: course.path, label: label.point, labelHalf: label.half }
	}

	/* A node's tail, where an auxiliary line leaves or meets it, the way out of it, and the node's box. */
	tailOf( topic ){
		const outward = this.arrangement.directionOf( topic ), box = this.arrangement.boxOf( topic )
		return { point: this.faces.of( topic ).anchor( box, outward ), outward, box }
	}

	/* Where a line's label stands, and how far it reaches from there, as its
		 course places it (line-forms.js): a straight line's clear of the nodes'
		 words and of the labels placed before it, an arc's at its middle. A
		 line with no label has its middle kept for one. */
	labelAt( line, course ){
		if( !line.label ) return { point: course.middle, half: null }
		const half = { x: this.measure.width( line.label, { family: fontFamily( "mono" ), size: LABEL_SIZE } ) / 2 + LABEL_EDGE, y: LABEL_SIZE / 2 + LABEL_EDGE }
		const labels = this.lineShapes.filter( shape => shape.labelHalf ).map( shape => Box.around( shape.label, 2 * shape.labelHalf.x, 2 * shape.labelHalf.y ) )
		return { point: course.labelPoint( half, [ ...this.arrangement.topics.map( topic => this.arrangement.boxOf( topic ) ), ...labels ] ), half }
	}

	/* On the screen, the wide unseen stroke that takes a press on a line, which selects it. */
	targetMarkup( { line, path } ){
		return "<path" + attributes( { class: "line-target", "data-line": line.id, d: path, fill: "none", stroke: "transparent", "stroke-width": LINE_TARGET } ) + "/>"
	}

	lineMarkup( shape, screen ){
		const { line, style } = shape
		const d = shape.path
		const halo = screen ? "<path" + attributes( { class: "line-halo", d, fill: "none" } ) + "/>" : ""
		const path = "<path" + attributes( { class: "line-path", d, fill: "none", ...stroke( style ) } ) + "/>"
		return "<g" + attributes( { class: "line", "data-line": line.id } ) + ">" + halo + path + "</g>"
	}

	/* A line's label at its middle, haloed in the background so it reads over whatever it crosses; pressing it selects the line. */
	labelMarkup( { line, style, label } ){
		if( !line.label ) return ""
		return "<g" + attributes( { class: "line", "data-line": line.id } ) + "><text" + attributes( {
			class: "line-label", x: label.x, y: label.y, "text-anchor": "middle", "dominant-baseline": "central",
			"font-family": fontFamily( "mono" ), "font-size": LABEL_SIZE, fill: style.get( "colour" ),
			stroke: this.look.background, "stroke-width": 4, "paint-order": "stroke", "stroke-linejoin": "round",
		} ) + ">" + escaped( line.label ) + "</text></g>"
	}

}

/* How each dash is drawn at a width: the ends of its strokes, and the
	pattern of strokes and gaps, which grows with the width so a thick dash
	still reads as one. A dot is a stroke of no length with round ends, so a
	round dot as wide as the line. */
const DASH_PATTERNS = {
	solid: () => ( { cap: "round" } ),
	dashed: width => ( { cap: "butt", pattern: [ width * 3 + 2, width * 2.5 + 2 ] } ),
	dotted: width => ( { cap: "round", pattern: [ 0, width * 2 + 2 ] } ),
}

/* A branch's or a line's stroke: its colour and width, and its dash. */
function stroke( style ){
	const width = style.get( "width" )
	const { cap, pattern } = DASH_PATTERNS[ style.get( "dash" ) ]( width )
	return {
		stroke: style.get( "colour" ),
		"stroke-width": width,
		"stroke-linecap": cap,
		"stroke-dasharray": pattern ? pattern.map( rounded ).join( " " ) : undefined,
	}
}
