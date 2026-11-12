import { Point, Box } from "./geometry.js"

const WAYS = { up: new Point( 0, -1 ), down: new Point( 0, 1 ), left: new Point( -1, 0 ), right: new Point( 1, 0 ) }

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
