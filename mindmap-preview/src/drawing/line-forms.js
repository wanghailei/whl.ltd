import { Point } from "../layout/geometry.js"
import { LineRoute } from "./line-route.js"
import { rounded } from "./markup.js"
import { labelPlace } from "./label-place.js"

/* The radius a straight line turns its corners by, where it fits. */
const LINE_CORNER = 24
/* The least radius a straight line's corner turns by, where every larger one
	would cut across a node: still round, never sharp. */
const LEAST_CORNER = 1
/* How many steps a corner's turn is followed in, to check it passes under no node. */
const TURN_STEPS = 16
/* How much of its circle an arc is: sixty degrees, the same for every arc,
	so every arc is the same shape at its own size. */
const ARC_SWEEP = Math.PI / 3
/* How far apart, at most, the points stand that an arc is known by, where
	its label is placed and the picture framed. */
const ARC_STEP = 6
/* How near the line through an arc's two tails the central node's centre
	may stand and still count as on it, so that the side away from it is not
	told by a stray fraction of a pixel. */
const ON_LINE = 1

/* The form a map's auxiliary lines take, chosen for the whole map at the
	master's word (2026-11-12): straight, routed round the nodes in straight
	runs, or arcs. The factory picks one by the map's word; nothing else asks
	which form the lines take.

	Pre-flight answers. A form knows only how a line runs from one tail to
	another, each given as its point, the way out of it, and its node's box,
	and whether its lines lie under the nodes or over them: straight lines
	know the nodes' boxes, to run round them, and arcs the central node's
	centre, to bow away from it. Which tails, and the line's look, are the
	picture's. What it gives back is a course, which answers for itself: the
	points it passes, for the picture's frame, its path, its middle and where
	its label stands, and the same course run the other way. */
class StraightLines {
	constructor( { boxes } ){
		this.boxes = boxes
		this.route = new LineRoute( boxes )
	}

	/* Routed round every node, a straight line crosses none: it lies under
		 the nodes, whose edges cover the very ends of it at their tails. */
	get liesOverNodes(){
		return false
	}

	/* Round every node between, in level and upright runs alone, at the
		 master's word (2026-11-12, 23:12) (line-route.js), every corner round,
		 at the master's word (2026-11-12, 22:28): a line has no sharp corners
		 to choose any more. A point where the way goes on as it went is no
		 corner, and is left out. */
	course( start, end ){
		const points = straightened( distinct( this.route.between( start.point, start.outward, end.point, end.outward ).waypoints ) )
		return new Route( points, points.slice( 1, -1 ).map( ( corner, index ) => cornerRadius( points[ index ], corner, points[ index + 2 ], this.boxes ) ) )
	}
}

/* Lines drawn as arcs, at the master's word (2026-11-12, 23:10): "an arc is
	simply part of a true circle". Each runs from the tail of one node to the
	tail of the other as sixty degrees of a circle, the same share for every
	line, so every arc is the same shape at its own size. 0.31.0's arcs were
	cubic curves leaving each tail straight out, which the master found drawn
	wrong; between two tails on one line they ran back over themselves. An
	arc does not bend round the nodes between, as 0.27.0's did, following no
	rule the eye could see: it may pass over a node it does not join, so it
	lies over the nodes, never hidden behind one. */
class ArcLines {
	constructor( { centre } ){
		this.centre = centre
	}

	get liesOverNodes(){
		return true
	}

	course( start, end ){
		return new Arc( start.point, end.point, this.bowBetween( start.point, end.point ) )
	}

	/* The side an arc between two tails bows to: away from the central node.
		 Where the central node stands on the line through the two tails, as
		 between two nodes level with it on either side of it, no side is away
		 from it, so every such arc bows the same way: up, or for an upright
		 line, to the right. The side comes out the same whichever tail the arc
		 starts from, so a line runs the same drawn either way. */
	bowBetween( start, end ){
		const along = end.minus( start ), across = along.perpendicular.unit
		const away = start.plus( end ).times( 0.5 ).minus( this.centre ).dot( across )
		if( Math.abs( away ) > ON_LINE ) return across.times( Math.sign( away ) )
		return across.times( Math.sign( along.isLevel ? -across.y : across.x ) || 1 )
	}
}

const FORMS = { straight: StraightLines, arc: ArcLines }

/* The form of this name, made for a map whose nodes stand in these boxes, its central node's centre at this point. */
export function lineFormFor( name, { boxes, centre } ){
	return new FORMS[ name ]( { boxes, centre } )
}

/* A line drawn straight: its points, and the radius each corner between them turns by. */
class Route {
	constructor( points, radii ){
		this.points = points
		this.radii = radii
	}

	get start(){ return this.points[ 0 ] }
	get end(){ return this.points[ this.points.length - 1 ] }

	get path(){
		return roundedPath( this.points, this.radii )
	}

	/* The point halfway along it, where a line with no label keeps room for one. */
	get middle(){
		return halfway( this.points )
	}

	/* Where its label stands: on a clear stretch nearest its middle, or beside it (label-place.js). */
	labelPoint( half, keepClear ){
		return labelPlace( this.points, half, keepClear )
	}

	reversed(){
		return new Route( [ ...this.points ].reverse(), [ ...this.radii ].reverse() )
	}
}

/* A line drawn as an arc: sixty degrees of a circle from its start to its
	end, bowing to one side, drawn as the circle's own arc, never a curve
	that only looks like one. */
class Arc {
	constructor( start, end, bow ){
		this.start = start
		this.end = end
		this.bow = bow
	}

	/* Its circle's radius: the chord of a sixty-degree arc is as long as the radius. */
	get radius(){
		return this.end.minus( this.start ).length / ( 2 * Math.sin( ARC_SWEEP / 2 ) )
	}

	/* Its circle's centre, back from the middle of the chord away from the bow. */
	get centre(){
		return this.start.plus( this.end ).times( 0.5 ).minus( this.bow.times( this.radius * Math.cos( ARC_SWEEP / 2 ) ) )
	}

	/* The way it turns round its centre from start to end: clockwise on the
		 screen, where angles grow, or the other way; as SVG's sweep flag, 1 or 0. */
	get sweep(){
		const centre = this.centre
		return this.start.minus( centre ).cross( this.end.minus( centre ) ) > 0 ? 1 : 0
	}

	/* The points along it, a step apart at most and an even number of steps,
		 so its middle is one of them, and its two ends exactly. */
	get points(){
		const centre = this.centre, from = this.start.minus( centre ), turning = this.sweep ? ARC_SWEEP : -ARC_SWEEP
		const steps = 2 * Math.max( 2, Math.ceil( this.radius * ARC_SWEEP / ( 2 * ARC_STEP ) ) )
		return Array.from( { length: steps + 1 }, ( _, step ) => {
			if( step === 0 ) return this.start
			if( step === steps ) return this.end
			return centre.plus( from.turned( turning * step / steps ) )
		} )
	}

	get path(){
		const at = point => rounded( point.x ) + " " + rounded( point.y )
		const radius = rounded( this.radius )
		return "M " + at( this.start ) + " A " + radius + " " + radius + " 0 0 " + this.sweep + " " + at( this.end )
	}

	/* The point of the arc halfway round it. */
	get middle(){
		return this.centre.plus( this.bow.times( this.radius ) )
	}

	/* Where its label stands: at the middle of the arc, or where that would
		 cover a node or another label, slid along the arc to the nearest place
		 clear of them, as a straight line's is (label-place.js), at the
		 master's word (2026-11-12, 23:10). */
	labelPoint( half, keepClear ){
		return labelPlace( this.points, half, keepClear )
	}

	reversed(){
		return new Arc( this.end, this.start, this.bow )
	}
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

/* A run of points with no point twice in a row: a stub cut to nothing
	leaves its tail point twice. */
function distinct( points ){
	return points.filter( ( point, index ) => index === 0 || point.minus( points[ index - 1 ] ).length > 0 )
}

/* A run of level and upright points with every point between two others
	on one line with them left out: the way does not turn there, as where a
	stub runs on into the way beyond it. */
function straightened( points ){
	return points.filter( ( point, index ) => {
		if( index === 0 || index === points.length - 1 ) return true
		const before = points[ index - 1 ], after = points[ index + 1 ]
		return !( before.x === point.x && point.x === after.x ) && !( before.y === point.y && point.y === after.y )
	} )
}

/* A path through these points, each corner between two straight runs
	rounded by its radius. */
function roundedPath( points, radii ){
	const at = point => rounded( point.x ) + " " + rounded( point.y )
	const corners = radii.map( ( radius, index ) => {
		const [ before, corner, after ] = points.slice( index, index + 3 )
		const [ into, out ] = turnEnds( before, corner, after, radius )
		return " L " + at( into ) + " Q " + at( corner ) + " " + at( out )
	} )
	return "M " + at( points[ 0 ] ) + corners.join( "" ) + " L " + at( points[ points.length - 1 ] )
}

/* The radius a corner turns by: the usual one, unless either run beside it
	is too short for it, when half that run; or unless the turn would cut
	across a node, as it can where the way runs close along the nodes, finding
	no room to keep round them, since a turn cuts the inside of its corner,
	where the node it turns round stands. Then it turns by the largest of a
	half, a quarter and so on of that radius that passes under no node, and
	by the least radius at worst: a corner is never sharp. */
function cornerRadius( before, corner, after, boxes ){
	let radius = Math.min( LINE_CORNER, corner.minus( before ).length / 2, after.minus( corner ).length / 2 )
	while( radius > LEAST_CORNER && !turnsClear( before, corner, after, radius, boxes ) ) radius = Math.max( LEAST_CORNER, radius / 2 )
	return radius
}

/* Where a corner's turn by a radius starts and ends, on the runs into and out of it. */
function turnEnds( before, corner, after, radius ){
	return [ corner.minus( corner.minus( before ).unit.times( radius ) ), corner.plus( after.minus( corner ).unit.times( radius ) ) ]
}

/* Whether a corner's turn by a radius, the quadratic curve the path draws, passes inside none of these boxes. */
function turnsClear( before, corner, after, radius, boxes ){
	const [ into, out ] = turnEnds( before, corner, after, radius )
	for( let step = 0; step <= TURN_STEPS; step++ ){
		const t = step / TURN_STEPS, u = 1 - t
		const point = into.times( u * u ).plus( corner.times( 2 * u * t ) ).plus( out.times( t * t ) )
		if( boxes.some( box => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom ) ) return false
	}
	return true
}
