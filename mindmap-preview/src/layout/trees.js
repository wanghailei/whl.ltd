import { Point, Box } from "./geometry.js"
import { Arrangement } from "./arrangement.js"

/* The tree layouts: right, both and down. Each subtree is given a band of its
	own — as tall as its node or its children's bands together, whichever is
	more — and children are stacked in their parent's band, centred on it. Two
	subtrees never share a band, so no two nodes can overlap.

	The nodes of one level line up, at the master's word (2026-11-12): growing
	to the right, every node of a level starts at one left edge; to the left,
	ends at one right edge; downwards, stands from one top edge. Each level
	stands a gap past the widest, or tallest, node of the level before, so no
	level reaches into the next. */


const SIBLING_GAP = 12
const LEVEL_GAP = 56
const ROW_GAP = 48
const COLUMN_GAP = 18

/* A side a horizontal tree grows to. Its levels stand in columns, each at one
	edge: the left edge growing right, the right edge growing left. */
class RightSide {
	get direction(){ return new Point( 1, 0 ) }

	/* The edge of the first level's column, a gap past the central node. */
	firstEdge( root ){ return root.right + LEVEL_GAP }

	/* The edge of the next level's column, a gap past this level's widest node. */
	nextEdge( edge, widest ){ return edge + widest + LEVEL_GAP }

	/* The left of a node of this width standing at a column's edge. */
	left( edge ){ return edge }
}

class LeftSide {
	get direction(){ return new Point( -1, 0 ) }
	firstEdge( root ){ return root.left - LEVEL_GAP }
	nextEdge( edge, widest ){ return edge - widest - LEVEL_GAP }
	left( edge, width ){ return edge - width }
}

/* Growing sideways: each child's band stacked down its parent's band. */
class HorizontalGrowth {
	constructor( faces ){
		this.faces = faces
		this.spans = new Map()
	}

	span( topic ){
		if( !this.spans.has( topic ) ){
			const children = topic.shownChildren
			const stacked = children.reduce( ( total, child ) => total + this.span( child ), 0 ) + SIBLING_GAP * Math.max( 0, children.length - 1 )
			this.spans.set( topic, Math.max( this.faces.of( topic ).size.y, stacked ) )
		}
		return this.spans.get( topic )
	}

	/* Places these main nodes of the placed central node, and everything under them, to one side. */
	grow( arrangement, root, mains, side ){
		this.place( arrangement, root, mains, side, this.columns( arrangement.boxOf( root ), mains, side ) )
	}

	/* The edge each level's column stands at on this side, by depth: the
		 first a gap past the central node, each after a gap past the widest
		 node of the level before it. */
	columns( rootBox, mains, side ){
		const widest = []
		for( const main of mains ){
			for( const topic of main.walkShown() ) widest[ topic.depth ] = Math.max( widest[ topic.depth ] ?? 0, this.faces.of( topic ).size.x )
		}
		const edges = [ undefined, side.firstEdge( rootBox ) ]
		for( let depth = 2; depth < widest.length; depth++ ) edges[ depth ] = side.nextEdge( edges[ depth - 1 ], widest[ depth - 1 ] )
		return edges
	}

	place( arrangement, parent, children, side, edges ){
		const parentBox = arrangement.boxOf( parent )
		const total = children.reduce( ( sum, child ) => sum + this.span( child ), 0 ) + SIBLING_GAP * Math.max( 0, children.length - 1 )
		let top = parentBox.centre.y - total / 2
		for( const child of children ){
			const size = this.faces.of( child ).size
			const middle = top + this.span( child ) / 2
			arrangement.place( child, new Box( side.left( edges[ child.depth ], size.x ), middle - size.y / 2, size.x, size.y ), side.direction )
			this.place( arrangement, child, child.shownChildren, side, edges )
			top += this.span( child ) + SIBLING_GAP
		}
	}
}

function placeRoot( arrangement, root, faces, direction ){
	const size = faces.of( root ).size
	arrangement.place( root, Box.around( new Point( 0, 0 ), size.x, size.y ), direction )
}

/* A tree growing to the right of the central node. */
export class RightTree {
	arrange( root, faces ){
		const arrangement = new Arrangement()
		const side = new RightSide()
		placeRoot( arrangement, root, faces, side.direction )
		new HorizontalGrowth( faces ).grow( arrangement, root, root.shownChildren, side )
		return arrangement
	}
}

/* A tree growing to both sides. The first main branches go right and the
	rest left, cut where the two sides come nearest to the same height; read
	clockwise, so the left side runs from the bottom up. */
export class BothTree {
	arrange( root, faces ){
		const arrangement = new Arrangement()
		const growth = new HorizontalGrowth( faces )
		const right = new RightSide(), left = new LeftSide()
		placeRoot( arrangement, root, faces, right.direction )
		const children = root.shownChildren
		const cut = this.cut( children.map( child => growth.span( child ) ) )
		growth.grow( arrangement, root, children.slice( 0, cut ), right )
		growth.grow( arrangement, root, children.slice( cut ).reverse(), left )
		return arrangement
	}

	/* How many go right: the count that makes the two sides most nearly equal,
		 at least one on the right, and one on the left once there are two. */
	cut( spans ){
		const total = spans.reduce( ( sum, span ) => sum + span, 0 )
		let best = Math.min( 1, spans.length ), bestDifference = Infinity, rightSum = 0
		for( let count = 1; count <= Math.max( 1, spans.length - 1 ); count++ ){
			rightSum += spans[ count - 1 ] ?? 0
			const difference = Math.abs( 2 * rightSum - total )
			if( difference < bestDifference ){
				best = count
				bestDifference = difference
			}
		}
		return best
	}
}

/* A tree growing downwards, the central node at the top, like an
	organisation chart. Every depth shares a row as tall as its tallest node,
	its nodes standing from the row's top edge, so a level of the hierarchy
	reads straight across. */
export class DownTree {
	arrange( root, faces ){
		this.faces = faces
		this.spans = new Map()
		this.rows = this.rowsOf( root )
		const arrangement = new Arrangement()
		this.grow( arrangement, root, 0 )
		return arrangement
	}

	span( topic ){
		if( !this.spans.has( topic ) ){
			const children = topic.shownChildren
			const sideBySide = children.reduce( ( total, child ) => total + this.span( child ), 0 ) + COLUMN_GAP * Math.max( 0, children.length - 1 )
			this.spans.set( topic, Math.max( this.faces.of( topic ).size.x, sideBySide ) )
		}
		return this.spans.get( topic )
	}

	/* The top and height of each depth's row, the central node's row centred on the origin. */
	rowsOf( root ){
		const heights = []
		for( const topic of root.walkShown() ) heights[ topic.depth ] = Math.max( heights[ topic.depth ] ?? 0, this.faces.of( topic ).size.y )
		let top = -heights[ 0 ] / 2
		return heights.map( height => {
			const row = { top, height }
			top += height + ROW_GAP
			return row
		} )
	}

	grow( arrangement, topic, middle ){
		const size = this.faces.of( topic ).size
		const row = this.rows[ topic.depth ]
		arrangement.place( topic, new Box( middle - size.x / 2, row.top, size.x, size.y ), new Point( 0, 1 ) )
		const children = topic.shownChildren
		const total = children.reduce( ( sum, child ) => sum + this.span( child ), 0 ) + COLUMN_GAP * Math.max( 0, children.length - 1 )
		let left = middle - total / 2
		for( const child of children ){
			this.grow( arrangement, child, left + this.span( child ) / 2 )
			left += this.span( child ) + COLUMN_GAP
		}
	}
}
