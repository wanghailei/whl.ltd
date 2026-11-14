import { Point, Box } from "../layout/geometry.js"

/* How far a line runs straight out of a node's tail before it may turn. */
const STUB = 18
/* Room kept between a line and every node it passes. */
const CLEARANCE = 8
/* Room round the whole map a route may go through, to pass round its outside. */
const ROOM = 120
/* What a turn costs, in pixels of length: a way with fewer turns is taken
	unless it runs this much longer, so a line does not zigzag. */
const TURN = 30
/* The most lines the search's lattice has each way, so its crossings, and
	the memory and time a way takes to find, stay bounded however many nodes
	the map holds (found in review, 2026-11-12: a lattice of every edge took
	20 seconds for one line among 3000 nodes). */
const MOST_LINES = 240

/* Where an auxiliary line runs, as waypoints from one node's tail to the
	other's, passing under no node, at the master's word (2026-11-12): a line
	is never hidden behind a node it does not join. Every run is level or
	upright, never slanting, at the master's word (2026-11-12, 23:12): "每节
	线应该都是水平或垂直的，不能是斜的。"

	It leaves the first node's tail, the end away from its parent, straight
	out for a short stub, and comes into the second node's tail the same way.
	Between the two stubs it runs straight where the two stubs' ends stand on
	one level or upright line and nothing stands in the way; otherwise a
	search finds the shortest way round every node, kept a little clear of
	each, in level and upright runs, a turn counted as so much more length,
	so the way turns only where it must.

	The search runs over a lattice of the lines through every node's edges,
	room kept, and through the two stubs' ends, so a run lies along the edge
	of the room kept round a node, and both stubs' ends lie on it exactly. A
	slanting run between cell centres, as the grid of 0.22.8 to 0.33.0 drew,
	cannot arise. Runs keep to the room's edge, not the middle of a gap: an
	elbow branch turns in the middle of the gap between a node and its
	children, and a dotted line down that middle ran along it (found in use,
	2026-11-12).

	A node's children can stand just past its tail, nearer than the stub and
	the room kept round them (found in review, 2026-11-12: lines ran straight
	under nodes). So a stub stops halfway to the first node ahead, the room
	kept round a node is cut back to a stub's end where the end lies within
	it, and where keeping room leaves no way, the way is sought round the
	nodes themselves. Only where there is no way at all does the line turn
	once, level then upright, over whatever stands between. */
export class LineRoute {
	constructor( boxes ){
		this.boxes = boxes
		/* The nodes as the search avoids them, a set for each room it tries
			 to keep in turn: first grown by the room kept round each, then as
			 they stand. Named margins before, which they are not (#4). */
		this.obstacleSets = [ CLEARANCE, 0 ].map( clearance => ( { keepsRoom: clearance > 0, obstacles: boxes.map( box => box.grown( clearance ) ) } ) )
	}

	/* The waypoints from the start, leaving along `outward`, to the end,
		 arriving against `inward`, and whether the way keeps room round the
		 nodes it passes or, finding none, runs close along them. */
	between( start, outward, end, inward ){
		const first = start.plus( outward.times( this.stub( start, outward ) ) ), last = end.plus( inward.times( this.stub( end, inward ) ) )
		const { turns, keepsRoom } = this.middle( first, outward, last, inward.times( -1 ) )
		return { waypoints: [ start, first, ...turns, last, end ], keepsRoom }
	}

	/* How far a line runs straight out of a tail: the stub, or half the way to the first node ahead, if that is nearer. */
	stub( from, toward ){
		return Math.min( STUB, ...this.boxes.map( box => distanceInto( from, toward, box ) / 2 ) )
	}

	/* The turning points between the stubs, leaving the first the way it
		 heads and reaching the last the way it must go on: none where the way
		 is straight and clear, else the shortest way round, with room kept
		 where it can be. Where there is no way at all, the one turn runs over
		 whatever stands between, keeping no room, and says so: it said it
		 kept room (found in review, 2026-11-12, #4). */
	middle( first, heading, last, onward ){
		for( const { keepsRoom, obstacles: grown } of this.obstacleSets ){
			const obstacles = grown.map( box => cutBack( cutBack( box, first ), last ) )
			if( ( first.x === last.x || first.y === last.y ) && isClear( first, last, obstacles ) ) return { turns: [], keepsRoom }
			const turns = new Lattice( obstacles, [ first, last ] ).way( first, heading, last, onward )
			if( turns ) return { turns, keepsRoom }
		}
		return { turns: first.x === last.x || first.y === last.y ? [] : [ heading.isLevel ? new Point( last.x, first.y ) : new Point( first.x, last.y ) ], keepsRoom: false }
	}
}

function isClear( from, to, obstacles ){
	return obstacles.every( box => !crosses( from, to, box ) )
}

/* A box with the room kept round a node cut back, where a stub's end lies
	inside it, to that end, on the side nearest it: the node itself stays
	inside, since the end lies outside the node, beyond it on that side. */
function cutBack( box, end ){
	if( !( end.x > box.left && end.x < box.right && end.y > box.top && end.y < box.bottom ) ) return box
	const sides = [ [ end.x - box.left, () => new Box( end.x, box.y, box.right - end.x, box.height ) ], [ box.right - end.x, () => new Box( box.x, box.y, end.x - box.left, box.height ) ],
		[ end.y - box.top, () => new Box( box.x, end.y, box.width, box.bottom - end.y ) ], [ box.bottom - end.y, () => new Box( box.x, box.y, box.width, end.y - box.top ) ] ]
	return sides.reduce( ( nearest, side ) => side[ 0 ] < nearest[ 0 ] ? side : nearest )[ 1 ]()
}

/* How far a ray from a point, in a direction, runs before it enters a box:
	Infinity where it never does, or where it starts in the box or on its edge. */
function distanceInto( from, toward, box ){
	let enter = -Infinity, leave = Infinity
	for( const [ position, step, low, high ] of [ [ from.x, toward.x, box.left, box.right ], [ from.y, toward.y, box.top, box.bottom ] ] ){
		if( step === 0 ){
			if( position <= low || position >= high ) return Infinity
			continue
		}
		const [ near, far ] = [ ( low - position ) / step, ( high - position ) / step ].sort( ( one, other ) => one - other )
		enter = Math.max( enter, near )
		leave = Math.min( leave, far )
	}
	return enter > 0 && enter < leave ? enter : Infinity
}

/* The four ways a run can go, each by its step across and down the lattice. */
const WAYS = [ new Point( 1, 0 ), new Point( 0, 1 ), new Point( -1, 0 ), new Point( 0, -1 ) ]

/* The level and upright lines a way may run along, and where they cross:
	the lines through every obstacle's edges and through the ends sought
	between, with the area round them all. A crossing inside an obstacle, and
	a run through one, are shut; its edges stay open, as the room kept round
	a node is room. A map with more edges than a lattice may have lines for
	gets lines at an even step instead, each obstacle grown out to the lines
	round it, so the way keeps more room there, never less; the lines
	through the two ends are kept, and an end outside every obstacle, or on
	its edge, stays so once they are grown. */
class Lattice {
	constructor( obstacles, ends ){
		const area = Box.enclosing( [ ...obstacles, ...ends.map( end => new Box( end.x, end.y, 0, 0 ) ) ] ).grown( ROOM )
		this.columns = new Lines( [ area.left, area.right, ...obstacles.flatMap( box => [ box.left, box.right ] ) ], ends.map( end => end.x ) )
		this.rows = new Lines( [ area.top, area.bottom, ...obstacles.flatMap( box => [ box.top, box.bottom ] ) ], ends.map( end => end.y ) )
		const size = this.columns.length * this.rows.length
		this.shut = new Uint8Array( size )
		this.shutAcross = new Uint8Array( size )
		this.shutDown = new Uint8Array( size )
		for( const box of obstacles ) this.shutOut( box )
	}

	/* Shuts the crossings strictly inside a box, grown out to the lines round it, and the runs through it. */
	shutOut( box ){
		const [ left, right ] = [ this.columns.atOrBefore( box.left ), this.columns.atOrAfter( box.right ) ]
		const [ top, bottom ] = [ this.rows.atOrBefore( box.top ), this.rows.atOrAfter( box.bottom ) ]
		for( let row = top; row <= bottom; row++ ){
			for( let column = left; column <= right; column++ ){
				const crossing = this.crossing( column, row ), insideRow = row > top && row < bottom, insideColumn = column > left && column < right
				if( insideRow && insideColumn ) this.shut[ crossing ] = 1
				if( insideRow && column < right ) this.shutAcross[ crossing ] = 1
				if( insideColumn && row < bottom ) this.shutDown[ crossing ] = 1
			}
		}
	}

	crossing( column, row ){
		return row * this.columns.length + column
	}

	/* The turning points of the way from one end to the other, leaving the
		 first the way it heads, never back on itself, and reaching the second
		 so as to go on the way it must; null where there is none. The search
		 is Dijkstra's with a guess, A*, over each crossing and the way the run
		 into it goes, a turn costing as much as TURN pixels of length. */
	way( from, heading, to, onward ){
		const start = this.crossing( this.columns.at( from.x ), this.rows.at( from.y ) ), goal = this.crossing( this.columns.at( to.x ), this.rows.at( to.y ) )
		const startWay = WAYS.findIndex( way => way.x === Math.sign( heading.x ) && way.y === Math.sign( heading.y ) )
		const goalWay = WAYS.findIndex( way => way.x === Math.sign( onward.x ) && way.y === Math.sign( onward.y ) )
		const cost = new Float64Array( this.shut.length * 4 ).fill( Infinity ), came = new Int32Array( this.shut.length * 4 ).fill( -1 )
		const guess = crossing => Math.abs( this.columns.values[ crossing % this.columns.length ] - to.x ) + Math.abs( this.rows.values[ Math.floor( crossing / this.columns.length ) ] - to.y )
		const open = new Queue()
		cost[ start * 4 + startWay ] = 0
		open.push( start * 4 + startWay, guess( start ) )
		let reached = -1
		while( open.length > 0 ){
			const state = open.pop(), crossing = state >> 2, way = state & 3
			if( crossing === goal && way !== ( goalWay + 2 ) % 4 ){
				reached = state
				break
			}
			for( let next = 0; next < 4; next++ ){
				if( next === ( way + 2 ) % 4 ) continue
				const step = this.step( crossing, next )
				if( !step ) continue
				const into = step.crossing * 4 + next
				const spent = cost[ state ] + step.length + ( next === way ? 0 : TURN ) + ( step.crossing === goal && next !== goalWay ? TURN : 0 )
				if( spent < cost[ into ] ){
					cost[ into ] = spent
					came[ into ] = state
					open.push( into, spent + guess( step.crossing ) )
				}
			}
		}
		if( reached === -1 ) return null
		const states = [ reached ]
		while( came[ states[ 0 ] ] !== -1 ) states.unshift( came[ states[ 0 ] ] )
		/* The crossings where the way turns. */
		return states.slice( 1, -1 ).filter( ( state, at ) => ( state & 3 ) !== ( states[ at + 2 ] & 3 ) ).map( state => this.pointOf( state >> 2 ) )
	}

	/* One run from a crossing to the next that way, and what it costs, or null where the run or the crossing it reaches is shut. */
	step( crossing, way ){
		const column = crossing % this.columns.length, row = Math.floor( crossing / this.columns.length )
		const [ nextColumn, nextRow ] = [ column + WAYS[ way ].x, row + WAYS[ way ].y ]
		if( nextColumn < 0 || nextRow < 0 || nextColumn >= this.columns.length || nextRow >= this.rows.length ) return null
		const next = this.crossing( nextColumn, nextRow )
		if( this.shut[ next ] ) return null
		const level = WAYS[ way ].y === 0
		const runStart = level ? this.crossing( Math.min( column, nextColumn ), row ) : this.crossing( column, Math.min( row, nextRow ) )
		if( ( level ? this.shutAcross : this.shutDown )[ runStart ] ) return null
		const length = level ? Math.abs( this.columns.values[ nextColumn ] - this.columns.values[ column ] ) : Math.abs( this.rows.values[ nextRow ] - this.rows.values[ row ] )
		return { crossing: next, length }
	}

	pointOf( crossing ){
		return new Point( this.columns.values[ crossing % this.columns.length ], this.rows.values[ Math.floor( crossing / this.columns.length ) ] )
	}
}

/* The level or upright lines of a lattice in one direction, in order: one
	through each edge given and each end, or, where those are more than
	MOST_LINES, lines at an even step from the first edge to the last, with
	one through each end. */
class Lines {
	constructor( edges, ends ){
		const marks = [ ...new Set( [ ...edges, ...ends ] ) ].sort( byValue )
		this.values = marks.length <= MOST_LINES ? marks : evenLines( marks[ 0 ], marks[ marks.length - 1 ], MOST_LINES - ends.length, ends )
		this.index = new Map( this.values.map( ( value, at ) => [ value, at ] ) )
	}

	get length(){
		return this.values.length
	}

	/* The place of the line through an end. */
	at( value ){
		return this.index.get( value )
	}

	/* The place of the last line at or before a value. */
	atOrBefore( value ){
		let low = 0, high = this.values.length - 1
		while( low < high ){
			const middle = Math.ceil( ( low + high ) / 2 )
			if( this.values[ middle ] <= value ) low = middle
			else high = middle - 1
		}
		return low
	}

	/* The place of the first line at or after a value. */
	atOrAfter( value ){
		let low = 0, high = this.values.length - 1
		while( low < high ){
			const middle = Math.floor( ( low + high ) / 2 )
			if( this.values[ middle ] >= value ) high = middle
			else low = middle + 1
		}
		return low
	}
}

function byValue( one, other ){
	return one - other
}

/* So many lines at an even step from the first value to the last, both exactly, with the lines through the ends among them. */
function evenLines( first, last, count, ends ){
	const step = ( last - first ) / ( count - 1 )
	const even = Array.from( { length: count }, ( _, at ) => at === count - 1 ? last : first + at * step )
	return [ ...new Set( [ ...even, ...ends ] ) ].sort( byValue )
}

/* The states still to look at, the most promising first: a binary heap. */
class Queue {
	constructor(){
		this.items = []
	}

	get length(){
		return this.items.length
	}

	push( cell, priority ){
		const items = this.items
		items.push( { cell, priority } )
		let at = items.length - 1
		while( at > 0 ){
			const parent = ( at - 1 ) >> 1
			if( items[ parent ].priority <= items[ at ].priority ) break
			this.swap( parent, at )
			at = parent
		}
	}

	/* Trades the places of two items. */
	swap( one, other ){
		const items = this.items, held = items[ one ]
		items[ one ] = items[ other ]
		items[ other ] = held
	}

	pop(){
		const items = this.items, top = items[ 0 ], last = items.pop()
		if( items.length > 0 ){
			items[ 0 ] = last
			let at = 0
			while( true ){
				const left = 2 * at + 1, right = left + 1
				let least = at
				if( left < items.length && items[ left ].priority < items[ least ].priority ) least = left
				if( right < items.length && items[ right ].priority < items[ least ].priority ) least = right
				if( least === at ) break
				this.swap( least, at )
				at = least
			}
		}
		return top.cell
	}
}

/* Whether the segment from one point to another passes through a box: Liang and Barsky's clipping. */
function crosses( from, to, box ){
	const delta = to.minus( from )
	let enter = 0, leave = 1
	for( const [ toward, room ] of [ [ -delta.x, from.x - box.left ], [ delta.x, box.right - from.x ], [ -delta.y, from.y - box.top ], [ delta.y, box.bottom - from.y ] ] ){
		if( toward === 0 ){
			if( room < 0 ) return false
			continue
		}
		const share = room / toward
		if( toward < 0 ) enter = Math.max( enter, share )
		else leave = Math.min( leave, share )
		if( enter > leave ) return false
	}
	return true
}
