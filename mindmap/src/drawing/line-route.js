import { Point, Box } from "../layout/geometry.js"

/* How far a line runs straight out of a node's tail before it may turn. */
const STUB = 18
/* Room kept between a line and every node it passes. */
const CLEARANCE = 8
/* Room round the whole map a route may go through, to pass round its outside. */
const ROOM = 120
/* The most cells the search grid has; a larger map gets coarser cells. */
const MOST_CELLS = 60000
const FINEST_CELL = 8

/* Where an auxiliary line runs, as waypoints from one node's tail to the
	other's, passing under no node, at the master's word (2026-11-12): a line
	is never hidden behind a node it does not join.

	It leaves the first node's tail, the end away from its parent, straight
	out for a short stub, and comes into the second node's tail the same way.
	Between the two stubs it runs straight when nothing stands in the way;
	otherwise a search over a grid of the map finds the shortest way round
	every node, kept a little clear of each, and the way found is pulled taut,
	so it turns only where a node makes it.

	A node's children can stand just past its tail, nearer than the stub and
	the room kept round them, as they did in the radial layout (found in
	review, 2026-11-12: a third of its lines ran straight under nodes), and
	on large maps the search's coarse cells can miss a narrow gap. So a stub
	stops halfway to the first node ahead of it, and where keeping room
	leaves no way, the way is sought round the nodes themselves. Only where
	there is no way at all does the line run straight. */
export class LineRoute {
	constructor( boxes ){
		this.boxes = boxes
	}

	/* The waypoints from the start, leaving along `outward`, to the end,
		 arriving against `inward`; whether the way keeps room round the nodes
		 it passes or, finding none, runs close along them; and how far to
		 either side of it lanes may run. Lines that share the way in lanes need
		 up to `beside` on either side, so it keeps that much more room from
		 every node, and from the two `joined` nodes, which the lanes leave and
		 meet square, as much as their stubs allow. Without it, the outer lanes
		 of three or more lines ran under nodes (found in review, 2026-11-12). */
	between( start, outward, end, inward, { beside = 0, joined = [] } = {} ){
		const first = start.plus( outward.times( this.stub( start, outward ) ) ), last = end.plus( inward.times( this.stub( end, inward ) ) )
		const { turns, keepsRoom, room } = this.middle( first, last, beside, joined )
		return { waypoints: [ start, first, ...turns, last, end ], keepsRoom, room }
	}

	/* How far a line runs straight out of a tail: the stub, or half the way to the first node ahead, if that is nearer. */
	stub( from, toward ){
		return Math.min( STUB, ...this.boxes.map( box => distanceInto( from, toward, box ) / 2 ) )
	}

	/* The turning points between the stubs, none where the way is clear,
		 else the shortest way round, and the room it keeps for lanes: all they
		 need, else half, else none, so where a gap between nodes is too narrow
		 for the lanes they draw closer rather than the line, finding no way,
		 running straight under the nodes (found in review, 2026-11-12). At each,
		 room is kept round the nodes where it can be, else none. */
	middle( first, last, beside, joined ){
		for( const room of beside > 0 ? [ beside, beside / 2, 0 ] : [ 0 ] ){
			for( const [ index, clearance ] of [ CLEARANCE, 0 ].entries() ){
				const obstacles = this.boxes.map( box => box.grown( joined.includes( box ) ? Math.max( clearance, room ) : clearance + room ) )
				const keepsRoom = index === 0
				if( isClear( first, last, obstacles ) ) return { turns: [], keepsRoom, room }
				const turns = this.search( first, last, obstacles )
				if( turns ) return { turns, keepsRoom, room }
			}
		}
		return { turns: [], keepsRoom: true, room: 0 }
	}

	/* The turning points of the shortest way round from one point to another, or null when there is no way. */
	search( from, to, obstacles ){
		const grid = new Grid( Box.enclosing( [ ...obstacles, new Box( from.x, from.y, 0, 0 ), new Box( to.x, to.y, 0, 0 ) ] ).grown( ROOM ), obstacles )
		const cells = grid.path( grid.cellOf( from ), grid.cellOf( to ) )
		if( cells.length === 0 ) return null
		return taut( [ from, ...cells.slice( 1, -1 ).map( cell => grid.centreOf( cell ) ), to ], obstacles ).slice( 1, -1 )
	}
}

function isClear( from, to, obstacles ){
	return obstacles.every( box => !crosses( from, to, box ) )
}

/* A path pulled taut: from each point kept, on to the farthest point it can see past the obstacles. */
function taut( points, obstacles ){
	const kept = [ points[ 0 ] ]
	let at = 0
	while( at < points.length - 1 ){
		let next = points.length - 1
		while( next > at + 1 && !isClear( points[ at ], points[ next ], obstacles ) ) next -= 1
		kept.push( points[ next ] )
		at = next
	}
	return kept
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

/* The map as a grid of cells, a cell blocked where a node stands. */
class Grid {
	constructor( area, obstacles ){
		this.area = area
		this.size = Math.max( FINEST_CELL, Math.ceil( Math.sqrt( area.width * area.height / MOST_CELLS ) ) )
		this.columns = Math.ceil( area.width / this.size )
		this.rows = Math.ceil( area.height / this.size )
		this.blocked = new Uint8Array( this.columns * this.rows )
		for( const box of obstacles ){
			const left = Math.max( 0, Math.floor( ( box.left - area.left ) / this.size ) ), right = Math.min( this.columns - 1, Math.floor( ( box.right - area.left ) / this.size ) )
			const top = Math.max( 0, Math.floor( ( box.top - area.top ) / this.size ) ), bottom = Math.min( this.rows - 1, Math.floor( ( box.bottom - area.top ) / this.size ) )
			for( let row = top; row <= bottom; row++ ) this.blocked.fill( 1, row * this.columns + left, row * this.columns + right + 1 )
		}
	}

	cellOf( point ){
		const column = Math.min( this.columns - 1, Math.max( 0, Math.floor( ( point.x - this.area.left ) / this.size ) ) )
		const row = Math.min( this.rows - 1, Math.max( 0, Math.floor( ( point.y - this.area.top ) / this.size ) ) )
		return row * this.columns + column
	}

	centreOf( cell ){
		return new Point( this.area.left + ( cell % this.columns + 0.5 ) * this.size, this.area.top + ( Math.floor( cell / this.columns ) + 0.5 ) * this.size )
	}

	/* The cells of the shortest way, by A*, moving to any of the eight neighbours; the two ends may stand in blocked cells. */
	path( from, to ){
		const columns = this.columns, cost = new Float64Array( this.blocked.length ).fill( Infinity ), came = new Int32Array( this.blocked.length ).fill( -1 )
		const toColumn = to % columns, toRow = Math.floor( to / columns )
		const guess = cell => {
			const across = Math.abs( cell % columns - toColumn ), down = Math.abs( Math.floor( cell / columns ) - toRow )
			return Math.max( across, down ) + ( Math.SQRT2 - 1 ) * Math.min( across, down )
		}
		const open = new Queue()
		cost[ from ] = 0
		open.push( from, guess( from ) )
		while( open.length > 0 ){
			const cell = open.pop()
			if( cell === to ) break
			const column = cell % columns, row = Math.floor( cell / columns )
			for( const [ across, down ] of NEIGHBOURS ){
				const nextColumn = column + across, nextRow = row + down
				if( nextColumn < 0 || nextRow < 0 || nextColumn >= columns || nextRow >= this.rows ) continue
				const next = nextRow * columns + nextColumn
				if( this.blocked[ next ] && next !== to ) continue
				const step = cost[ cell ] + ( across && down ? Math.SQRT2 : 1 )
				if( step < cost[ next ] ){
					cost[ next ] = step
					came[ next ] = cell
					open.push( next, step + guess( next ) )
				}
			}
		}
		if( came[ to ] === -1 && from !== to ) return []
		const cells = [ to ]
		while( cells[ 0 ] !== from ) cells.unshift( came[ cells[ 0 ] ] )
		return cells
	}
}

const NEIGHBOURS = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ], [ 1, 1 ], [ 1, -1 ], [ -1, 1 ], [ -1, -1 ] ]

/* The cells still to look at, the most promising first: a binary heap. */
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
