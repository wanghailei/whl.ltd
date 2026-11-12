import { Point, Box } from "./geometry.js"

const WAYS = { up: new Point( 0, -1 ), down: new Point( 0, 1 ), left: new Point( -1, 0 ), right: new Point( 1, 0 ) }
/* How far past a parent's first or last child the gap before or after it reaches, in map pixels. */
const END_GAP = 16

/* Where every shown node stands, as a layout placed it, and the direction its
	branch runs in from its parent. A node under a fold is not placed. */
export class Arrangement {
	constructor(){
		this.placed = new Map()
	}

	/* A node's box, and the way its branch grows, which is also the way its own children grow. */
	place( topic, box, direction ){
		this.placed.set( topic, { box, direction } )
	}

	boxOf( topic ){
		return this.placed.get( topic )?.box ?? null
	}

	directionOf( topic ){
		return this.placed.get( topic )?.direction ?? WAYS.right
	}

	get topics(){
		return [ ...this.placed.keys() ]
	}

	get boxes(){
		return this.topics.map( topic => ( { id: topic.id, ...this.boxOf( topic ).toJSON() } ) )
	}

	get bounds(){
		return Box.enclosing( this.topics.map( topic => this.boxOf( topic ) ) )
	}

	/* Where a node being moved would stand if let go at a point, at the
		 master's word (2026-11-12, 23:07): the gap among some parent's drawn
		 children that holds the point, the one whose middle is nearest it, or
		 null where none holds it. A node cannot go under itself or anything
		 under it, and the gaps either side of where it already stands would
		 leave it there, so none of those is offered. */
	gapAt( point, moving ){
		const gaps = this.topics.filter( parent => !moving.contains( parent ) ).flatMap( parent => this.gapsAmong( parent ) )
		const holding = gaps.filter( gap => gap.holds( point ) && !gap.leaves( moving ) )
		return holding.reduce( ( nearest, gap ) => nearest && nearest.distanceTo( point ) <= gap.distanceTo( point ) ? nearest : gap, null )
	}

	/* The gaps among a parent's drawn children, on each side they stand: before the first, between each two, and after the last. */
	gapsAmong( parent ){
		const sides = new Map()
		for( const child of parent.children.filter( each => this.placed.has( each ) ) ){
			const way = this.directionOf( child ), key = way.x + " " + way.y
			sides.set( key, [ ...( sides.get( key ) ?? [] ), child ] )
		}
		return [ ...sides.values() ].flatMap( side => this.gapsAlong( parent, side ) )
	}

	/* The gaps along one side's children, in the order they are drawn: the
		 map's order, or on the left of BOTH its reverse, read clockwise from
		 the bottom up (found in review, 2026-11-13: those gaps ran backwards
		 and none was offered). Children growing level stand one under
		 another, so a gap runs across between them; children growing down
		 stand side by side, so a gap runs up and down. A gap between two
		 stands in the map's order just before the later of them; the gaps at
		 the ends, before the first or after the last in the map's order,
		 whichever end is drawn first. */
	gapsAlong( parent, children ){
		const level = this.directionOf( children[ 0 ] ).isLevel
		const [ start, end ] = level ? [ box => box.top, box => box.bottom ] : [ box => box.left, box => box.right ]
		const drawn = [ ...children ].sort( ( one, other ) => start( this.boxOf( one ) ) - start( this.boxOf( other ) ) )
		const boxes = drawn.map( child => this.boxOf( child ) )
		const [ low, high ] = level ? [ Math.min( ...boxes.map( box => box.left ) ), Math.max( ...boxes.map( box => box.right ) ) ] : [ Math.min( ...boxes.map( box => box.top ) ), Math.max( ...boxes.map( box => box.bottom ) ) ]
		const edges = [ start( boxes[ 0 ] ) - END_GAP, ...boxes.flatMap( box => [ start( box ), end( box ) ] ), end( boxes[ boxes.length - 1 ] ) + END_GAP ]
		const forwards = drawn.length < 2 || drawn[ 0 ].index < drawn[ 1 ].index
		const [ first, last ] = [ drawn[ 0 ], drawn[ drawn.length - 1 ] ]
		const places = [ forwards ? first.index : first.index + 1, ...drawn.slice( 1 ).map( ( child, at ) => Math.max( child.index, drawn[ at ].index ) ), forwards ? last.index + 1 : last.index ]
		return places.map( ( index, at ) => new Gap( { parent, index, level, from: edges[ 2 * at ], to: edges[ 2 * at + 1 ], low, high } ) )
	}

	/* The node an arrow key moves to: of those whose centres lie past this
		 node's edge that way, the one nearest along it, a step across counted
		 twice a step along, so the move keeps to its line. Past the edge, not
		 past the centre: nodes stacked in one column are of different widths,
		 and a neighbour's centre a few pixels to the left is not to the left.
		 Null when there is none that way. */
	nearest( topic, way ){
		const direction = WAYS[ way ]
		const box = this.boxOf( topic )
		/* A node hidden under a fold — selected before an undo folded it — has nowhere to go from. */
		if( !box ) return null
		const from = box.centre
		const edge = Math.abs( direction.x ) * box.width / 2 + Math.abs( direction.y ) * box.height / 2
		let best = null, bestScore = Infinity
		for( const other of this.topics ){
			const offset = this.boxOf( other ).centre.minus( from )
			const along = offset.dot( direction )
			if( other === topic || along <= edge ) continue
			const score = along + 2 * Math.abs( offset.dot( direction.perpendicular ) )
			if( score < bestScore ){
				best = other
				bestScore = score
			}
		}
		return best
	}
}

/* A gap among a parent's children, where a node let go would stand: the
	parent, the place among its children, the band of the map the gap takes
	up, and the marker drawn across its middle while a node is dragged over it. */
class Gap {
	/* `from` and `to` bound the gap along the way the children stand; `low` and `high` across it. */
	constructor( { parent, index, level, from, to, low, high } ){
		this.parent = parent
		this.index = index
		this.band = level ? new Box( low, from, high - low, to - from ) : new Box( from, low, to - from, high - low )
		const middle = ( from + to ) / 2
		this.from = level ? new Point( low, middle ) : new Point( middle, low )
		this.to = level ? new Point( high, middle ) : new Point( middle, high )
	}

	holds( point ){
		return point.x >= this.band.left && point.x <= this.band.right && point.y >= this.band.top && point.y <= this.band.bottom
	}

	/* How far a point is from the marker's line. */
	distanceTo( point ){
		return Math.abs( point.minus( this.from ).dot( this.to.minus( this.from ).perpendicular.unit ) )
	}

	/* Whether a node let go here would stand where it stands already: in the gap just before it or just after it. */
	leaves( moving ){
		return moving.parent === this.parent && ( this.index === moving.index || this.index === moving.index + 1 )
	}
}
