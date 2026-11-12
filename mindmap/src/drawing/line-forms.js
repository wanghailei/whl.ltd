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
/* How far an arc's handles reach out of its two tails, as a share of the way
	between them: a half, so two siblings' arc swings out round and wide. */
const ARC_REACH = 0.5
/* How far apart, at most, the points stand that an arc is known by, where
	its middle is found and the picture framed. */
const ARC_STEP = 6

/* The form a map's auxiliary lines take, chosen for the whole map at the
	master's word (2026-11-12): straight, routed round the nodes in straight
	runs, or arcs. The factory picks one by the map's word; nothing else asks
	which form the lines take.

	Pre-flight answers. A form knows only how a line runs from one tail to
	another, each given as its point, the way out of it, and its node's box,
	and whether its lines lie under the nodes or over them; which tails, and
	the line's look, are the picture's. What it gives back is a course, which
	answers for itself: the points it passes, for the picture's frame, its
	path, its middle and where its label stands, and the same course run the
	other way. */
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

	/* Round every node between (line-route.js), as 0.22.8 ran it, every
		 corner round, at the master's word (2026-11-12, 22:28): a line has no
		 sharp corners to choose any more. */
	course( start, end ){
		const points = distinct( this.route.between( start.point, start.outward, end.point, end.outward ).waypoints )
		return new Route( points, points.slice( 1, -1 ).map( ( corner, index ) => cornerRadius( points[ index ], corner, points[ index + 2 ], this.boxes ) ) )
	}
}

/* Lines drawn as arcs, at the master's word (2026-11-12, 22:28): each one
	simple, regular curve, the same shape for every line, a single cubic that
	leaves the tail of one node straight out and comes into the tail of the
	other straight in, its handles reaching out of each tail a share of the
	way between them. It does not bend round the nodes between: 0.27.0's
	arcs, which bent round them as often as they must, followed no rule the
	eye could see, and the master would not have them. So an arc may pass over
	a node it does not join, and it lies over the nodes, never hidden behind
	one. */
class ArcLines {
	get liesOverNodes(){
		return true
	}

	course( start, end ){
		const reach = end.point.minus( start.point ).length * ARC_REACH
		return new Arc( start.point, start.point.plus( start.outward.times( reach ) ), end.point.plus( end.outward.times( reach ) ), end.point )
	}
}

const FORMS = { straight: StraightLines, arc: ArcLines }

/* The form of this name, made for a map whose nodes stand in these boxes. */
export function lineFormFor( name, { boxes } ){
	return new FORMS[ name ]( { boxes } )
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

/* A line drawn as an arc: one cubic curve from its start to its end, with a
	handle out of each. */
class Arc {
	constructor( start, first, second, end ){
		this.start = start
		this.first = first
		this.second = second
		this.end = end
	}

	/* The points along it, a step apart at most, its two ends exactly. */
	get points(){
		const steps = Math.max( 4, Math.ceil( ( this.first.minus( this.start ).length + this.second.minus( this.first ).length + this.end.minus( this.second ).length ) / ARC_STEP ) )
		return Array.from( { length: steps + 1 }, ( _, step ) => {
			const t = step / steps, u = 1 - t
			return this.start.times( u * u * u ).plus( this.first.times( 3 * u * u * t ) ).plus( this.second.times( 3 * u * t * t ) ).plus( this.end.times( t * t * t ) )
		} )
	}

	get path(){
		const at = point => rounded( point.x ) + " " + rounded( point.y )
		return "M " + at( this.start ) + " C " + at( this.first ) + " " + at( this.second ) + " " + at( this.end )
	}

	/* The point halfway along the curve. */
	get middle(){
		return halfway( this.points )
	}

	/* Its label stands at the middle of the curve, at the master's word
		 (2026-11-12, 22:28), so every arc carries its label alike. */
	labelPoint(){
		return this.middle
	}

	reversed(){
		return new Arc( this.end, this.second, this.first, this.start )
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
