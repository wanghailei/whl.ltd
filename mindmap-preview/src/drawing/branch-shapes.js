import { rounded } from "./markup.js"

/* The shape of a branch, from where it leaves its parent to where it meets
	its node, given the way it leaves — the way the parent grows — and the
	way it arrives — the way the node grows; in a tree the two are the same.
	Each shape is one path; the factory picks it by the style's word. */
class CurveBranch {
	/* Leaving along the parent's growth and arriving along the node's, one
		 turn between, so neighbouring branches fan out side by side. */
	path( from, to, { leaving, arriving } ){
		const chord = to.minus( from )
		const first = from.plus( leaving.times( Math.max( 12, Math.abs( chord.dot( leaving ) ) / 2 ) ) )
		const second = to.minus( arriving.times( Math.max( 12, Math.abs( chord.dot( arriving ) ) / 2 ) ) )
		return `M ${ point( from ) } C ${ point( first ) } ${ point( second ) } ${ point( to ) }`
	}
}

/* Out along the growth to half way, across, then on to the node, the turns
	softened by a small radius: the organisation chart's line. */
class ElbowBranch {
	path( from, to, { arriving } ){
		return arriving.isLevel ? this.level( from, to ) : this.upright( from, to )
	}

	level( from, to ){
		const middle = ( from.x + to.x ) / 2
		const across = Math.sign( to.x - from.x ) || 1, down = Math.sign( to.y - from.y )
		const radius = Math.min( 6, Math.abs( to.y - from.y ) / 2, Math.abs( to.x - from.x ) / 4 )
		if( down === 0 || radius === 0 ) return `M ${ point( from ) } H ${ rounded( to.x ) }`
		return `M ${ point( from ) } H ${ rounded( middle - across * radius ) } Q ${ rounded( middle ) } ${ rounded( from.y ) } ${ rounded( middle ) } ${ rounded( from.y + down * radius ) } V ${ rounded( to.y - down * radius ) } Q ${ rounded( middle ) } ${ rounded( to.y ) } ${ rounded( middle + across * radius ) } ${ rounded( to.y ) } H ${ rounded( to.x ) }`
	}

	upright( from, to ){
		const middle = ( from.y + to.y ) / 2
		const down = Math.sign( to.y - from.y ) || 1, across = Math.sign( to.x - from.x )
		const radius = Math.min( 6, Math.abs( to.x - from.x ) / 2, Math.abs( to.y - from.y ) / 4 )
		if( across === 0 || radius === 0 ) return `M ${ point( from ) } V ${ rounded( to.y ) }`
		return `M ${ point( from ) } V ${ rounded( middle - down * radius ) } Q ${ rounded( from.x ) } ${ rounded( middle ) } ${ rounded( from.x + across * radius ) } ${ rounded( middle ) } H ${ rounded( to.x - across * radius ) } Q ${ rounded( to.x ) } ${ rounded( middle ) } ${ rounded( to.x ) } ${ rounded( middle + down * radius ) } V ${ rounded( to.y ) }`
	}
}

class StraightBranch {
	path( from, to ){
		return `M ${ point( from ) } L ${ point( to ) }`
	}
}

const BRANCHES = { curve: new CurveBranch(), elbow: new ElbowBranch(), straight: new StraightBranch() }

export function branchShapeFor( name ){
	return BRANCHES[ name ] ?? BRANCHES.curve
}

function point( at ){
	return rounded( at.x ) + " " + rounded( at.y )
}
