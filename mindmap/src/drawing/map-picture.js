import { Look } from "./look.js"
import { Faces } from "./face.js"
import { Layout } from "../layout/layout.js"
import { Box, Point } from "../layout/geometry.js"
import { branchShapeFor } from "./branch-shapes.js"
import { inkOver } from "./colour.js"
import { fontFamily } from "./fonts.js"
import { attributes, escaped, rounded } from "./markup.js"
import { LineRoute } from "./line-route.js"
import { labelPlace } from "./label-place.js"

/* Room round the map in an exported picture. */
const FRAME_MARGIN = 40
const FOLD_BADGE_RADIUS = 8
/* The radius a curved auxiliary line turns its corners by, at most. */
const LINE_CORNER = 24
const LABEL_SIZE = 12
/* A label's edge of the map's background, half its outline's width. */
const LABEL_EDGE = 2
/* How wide the unseen stroke is that takes a press on a line, and how far
	apart the lanes of lines joining the same two nodes run: a lane's press
	target is the lane's width, so two never overlap. */
const LINE_TARGET = 14
const LANE_GAP = 8

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
		this.route = map.lines.length > 0 ? new LineRoute( this.arrangement.topics.map( topic => this.arrangement.boxOf( topic ) ) ) : null
		/* Shaped in turn, so each label keeps clear of the labels before it. */
		this.lineShapes = []
		for( const line of map.lines ){
			const shape = this.lineShape( line )
			if( shape ) this.lineShapes.push( shape )
		}
	}

	/* The drawing's elements: branches first, then auxiliary lines over them,
		 then the nodes over both, and last the lines' labels. A line drawn over
		 the nodes hid their words where it crossed them, and its wide click
		 target took the clicks meant for them; its label, though, must be read
		 (found in use, 2026-11-12). */
	markup( { screen = false } = {} ){
		const shown = this.arrangement.topics
		return "<g class=\"branches\">" + shown.filter( topic => !topic.isRoot ).map( topic => this.branchMarkup( topic ) ).join( "" ) + "</g>" +
			"<g class=\"lines\">" + this.lineShapes.map( shape => this.lineMarkup( shape, screen ) ).join( "" ) + "</g>" +
			"<g class=\"topics\">" + shown.map( topic => this.topicMarkup( topic, screen ) ).join( "" ) + "</g>" +
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
	branchMarkup( topic ){
		const parent = topic.parent
		const arriving = this.arrangement.directionOf( topic )
		const leaving = parent.isRoot ? arriving : this.arrangement.directionOf( parent )
		const from = this.faces.of( parent ).anchor( this.arrangement.boxOf( parent ), arriving )
		const to = this.faces.of( topic ).anchor( this.arrangement.boxOf( topic ), arriving.times( -1 ) )
		const style = this.look.branch( topic )
		return "<path" + attributes( {
			class: "branch",
			d: branchShapeFor( style.get( "shape" ) ).path( from, to, { leaving, arriving } ),
			fill: "none",
			...stroke( style ),
		} ) + "/>"
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
		 into the tail of the other, round every node between (line-route.js),
		 its corners rounded when it is curved. A way that keeps no room round
		 the nodes turns sharply even then, since a rounded corner cuts across
		 the inside of its turn, where the node it turns round stands; so does
		 a line in a lane, whose inner lanes may stand at the very edge of the
		 room kept (found in review, 2026-11-12). A line
		 to a node under a fold is not drawn. */
	lineShape( line ){
		const from = this.map.find( line.from ), to = this.map.find( line.to )
		if( !from || !to || !this.arrangement.boxOf( from ) || !this.arrangement.boxOf( to ) ) return null
		/* Lines joining the same two nodes share one route, found always from
			 the same end, since the search from the other end need not find the
			 same way; each then runs in its own lane of it (found in use,
			 2026-11-12: they were drawn one on another, and a press took either). */
		const forward = line.from <= line.to
		const [ first, second ] = forward ? [ from, to ] : [ to, from ]
		const outward = this.arrangement.directionOf( first ), inward = this.arrangement.directionOf( second )
		const { offset, shared, beside } = this.laneOf( line )
		const [ firstBox, secondBox ] = [ this.arrangement.boxOf( first ), this.arrangement.boxOf( second ) ]
		const { waypoints: route, keepsRoom, room } = this.route.between( this.faces.of( first ).anchor( firstBox, outward ), outward, this.faces.of( second ).anchor( secondBox, inward ), inward, { beside, joined: [ firstBox, secondBox ] } )
		/* Where the way left the lanes less room than they need, they draw closer by as much. */
		const narrowing = beside > 0 ? room / beside : 1
		const laned = alongside( route, offset * narrowing )
		const waypoints = forward ? laned : laned.reverse()
		const style = this.look.line( line )
		const label = this.labelAt( line, waypoints )
		return { line, style, start: waypoints[ 0 ], end: waypoints[ waypoints.length - 1 ], waypoints, label: label.point, labelHalf: label.half, target: shared && narrowing > 0 ? LANE_GAP * narrowing : LINE_TARGET, corner: style.get( "shape" ) === "curve" && keepsRoom && !shared ? LINE_CORNER : 0 }
	}

	/* A line's lane among the lines joining the same two nodes, as how far it
		 runs to the left of their shared route, the lanes a gap apart and
		 centred on the route; whether it shares the route at all; and how far
		 the outermost lanes run to either side of it. */
	laneOf( line ){
		const twins = this.map.lines.filter( other => ( other.from === line.from && other.to === line.to ) || ( other.from === line.to && other.to === line.from ) )
		return { offset: ( twins.indexOf( line ) - ( twins.length - 1 ) / 2 ) * LANE_GAP, shared: twins.length > 1, beside: ( twins.length - 1 ) / 2 * LANE_GAP }
	}

	/* Where a line's label stands, and how far it reaches from there: clear
		 of the nodes' words and of the labels placed before it (label-place.js);
		 a line with no label has its middle kept for one. */
	labelAt( line, waypoints ){
		if( !line.label ) return { point: halfway( waypoints ), half: null }
		const half = { x: this.measure.width( line.label, { family: fontFamily( "mono" ), size: LABEL_SIZE } ) / 2 + LABEL_EDGE, y: LABEL_SIZE / 2 + LABEL_EDGE }
		const labels = this.lineShapes.filter( shape => shape.labelHalf ).map( shape => Box.around( shape.label, 2 * shape.labelHalf.x, 2 * shape.labelHalf.y ) )
		return { point: labelPlace( waypoints, half, [ ...this.arrangement.topics.map( topic => this.arrangement.boxOf( topic ) ), ...labels ] ), half }
	}

	lineMarkup( shape, screen ){
		const { line, style, start, end, waypoints } = shape
		const d = roundedPath( waypoints, shape.corner )
		const target = screen ? "<path" + attributes( { class: "line-target", d, fill: "none", stroke: "transparent", "stroke-width": shape.target } ) + "/>" : ""
		const halo = screen ? "<path" + attributes( { class: "line-halo", d, fill: "none" } ) + "/>" : ""
		const path = "<path" + attributes( { class: "line-path", d, fill: "none", ...stroke( style ) } ) + "/>"
		const arrows = ( line.hasArrowAtStart ? this.arrow( start, start.minus( waypoints[ 1 ] ).unit, style ) : "" ) + ( line.hasArrowAtEnd ? this.arrow( end, end.minus( waypoints[ waypoints.length - 2 ] ).unit, style ) : "" )
		return "<g" + attributes( { class: "line", "data-line": line.id } ) + ">" + target + halo + path + arrows + "</g>"
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

	/* A solid arrowhead with its tip on the line's end, pointing along the line. */
	arrow( tip, pointing, style ){
		const length = 7 + style.get( "width" ) * 2
		const base = tip.minus( pointing.times( length ) )
		const side = pointing.perpendicular.times( length * 0.45 )
		const corners = [ tip, base.plus( side ), base.minus( side ) ].map( corner => rounded( corner.x ) + "," + rounded( corner.y ) ).join( " " )
		return "<polygon" + attributes( { class: "arrow", points: corners, fill: style.get( "colour" ) } ) + "/>"
	}
}

/* A branch's or a line's stroke: its colour and width, and for a dash a
	pattern that grows with the width so a thick dash still reads as one. */
function stroke( style ){
	const width = style.get( "width" )
	const dashed = style.get( "dash" ) === "dashed"
	return {
		stroke: style.get( "colour" ),
		"stroke-width": width,
		"stroke-linecap": dashed ? "butt" : "round",
		"stroke-dasharray": dashed ? rounded( width * 3 + 2 ) + " " + rounded( width * 2.5 + 2 ) : undefined,
	}
}

/* A path through these points, each corner between two straight runs rounded
	by up to this radius — none for a line drawn straight. */
function roundedPath( points, radius ){
	const at = point => rounded( point.x ) + " " + rounded( point.y )
	let d = "M " + at( points[ 0 ] )
	for( let index = 1; index < points.length - 1; index++ ){
		const corner = points[ index ], before = points[ index - 1 ], after = points[ index + 1 ]
		const turn = Math.min( radius, corner.minus( before ).length / 2, after.minus( corner ).length / 2 )
		if( turn <= 0 ){
			d += " L " + at( corner )
			continue
		}
		d += " L " + at( corner.minus( corner.minus( before ).unit.times( turn ) ) ) + " Q " + at( corner ) + " " + at( corner.plus( after.minus( corner ).unit.times( turn ) ) )
	}
	return d + " L " + at( points[ points.length - 1 ] )
}

/* A run of straight pieces moved to its left by a distance, each piece
	kept parallel to its own and each corner where the moved pieces meet. */
function alongside( points, by ){
	const run = points.filter( ( point, index ) => index === 0 || point.minus( points[ index - 1 ] ).length > 0 )
	if( by === 0 || run.length < 2 ) return run
	const lefts = run.slice( 1 ).map( ( point, index ) => {
		const toward = point.minus( run[ index ] ).unit
		return new Point( -toward.y, toward.x )
	} )
	return run.map( ( point, index ) => {
		const before = lefts[ Math.max( 0, index - 1 ) ], after = lefts[ Math.min( lefts.length - 1, index ) ]
		const turn = before.x * after.x + before.y * after.y
		/* A piece turning straight back has no corner to meet at: it keeps the piece before's side. */
		return turn < -0.999 ? point.plus( before.times( by ) ) : point.plus( before.plus( after ).times( by / ( 1 + turn ) ) )
	} )
}

/* The point halfway along a run of straight pieces. */
function halfway( points ){
	const lengths = points.slice( 1 ).map( ( point, index ) => point.minus( points[ index ] ).length )
	let left = lengths.reduce( ( sum, length ) => sum + length, 0 ) / 2
	for( let index = 0; index < lengths.length; index++ ){
		if( left <= lengths[ index ] && lengths[ index ] > 0 ) return points[ index ].plus( points[ index + 1 ].minus( points[ index ] ).times( left / lengths[ index ] ) )
		left -= lengths[ index ]
	}
	return points[ points.length - 1 ]
}
