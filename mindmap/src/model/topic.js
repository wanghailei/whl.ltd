import { NODE, BRANCH } from "./style.js"

/* A topic is one node of the map — what the page calls a node. The class is
	not called Node because the browser already owns that name, and a module
	that drew the map would shadow it.

	Pre-flight answers. A topic knows its own words, marks, styles and fold,
	and its place in the tree: its parent and its children. The tree is kept
	whole by the topic alone — adopting a child takes it from its old parent —
	so no caller can leave a child listed under two parents. Questions about
	the tree (depth, main branch, what is hidden) are answered by the topic
	from its own links, never worked out by a caller. */
export class Topic {
	constructor( { id, text = "", remark = "", folded = false, style = NODE.style(), branch = BRANCH.style() } = {} ){
		this.id = id
		this.text = text
		/* Longer words of its own, written under the map: the node's remark. */
		this.remark = remark
		this.folded = folded
		/* Its own look, set by hand: the node's style, and the style of its
			 branch, the line that joins it to its parent. */
		this.style = style
		this.branch = branch
		this.parent = null
		this.children = []
	}

	/* Takes a child at a place among its children, the end by default, from wherever it was. */
	adopt( child, index = this.children.length ){
		if( child.parent ) child.parent.release( child )
		this.children.splice( index, 0, child )
		child.parent = this
	}

	release( child ){
		this.children = this.children.filter( each => each !== child )
		child.parent = null
	}

	/* Whether the topic is this one or anywhere under it. */
	contains( topic ){
		for( let ancestor = topic; ancestor; ancestor = ancestor.parent ){
			if( ancestor === this ) return true
		}
		return false
	}

	/* This topic, then everything under it, depth first. */
	*walk(){
		yield this
		for( const child of this.children ) yield* child.walk()
	}

	/* The same walk, stopping at every fold: the topics that are drawn. */
	*walkShown(){
		yield this
		for( const child of this.shownChildren ) yield* child.walkShown()
	}

	get shownChildren(){
		return this.folded ? [] : this.children
	}

	/* How many topics a fold hides: everything under this one. */
	get hiddenCount(){
		return [ ...this.walk() ].length - 1
	}

	get isRoot(){
		return this.parent === null
	}

	/* Whether a fold somewhere above hides this topic. */
	get isHidden(){
		return this.shownAncestor !== this
	}

	/* This topic when it is drawn, or else the highest folded topic above it, which is drawn in its stead. */
	get shownAncestor(){
		let shown = this
		for( let ancestor = this.parent; ancestor; ancestor = ancestor.parent ){
			if( ancestor.folded ) shown = ancestor
		}
		return shown
	}

	get index(){
		return this.parent ? this.parent.children.indexOf( this ) : 0
	}

	get depth(){
		return this.parent ? this.parent.depth + 1 : 0
	}

	/* The fill its branch was given: the nearest fill set by hand on a node
		 above it — so a fill picked for a node is taken by every node under it
		 that has none of its own, those added later too. The central node's
		 fill is its own alone: the map is not one branch. Undefined when no
		 node above has one. */
	get branchFill(){
		for( let ancestor = this.parent; ancestor && !ancestor.isRoot; ancestor = ancestor.parent ){
			const fill = ancestor.style.get( "fill" )
			if( fill !== undefined ) return fill
		}
		return undefined
	}

	/* The ancestor that grows straight from the root, which a theme colours a main branch by. */
	get mainBranch(){
		if( this.isRoot ) return null
		return this.parent.isRoot ? this : this.parent.mainBranch
	}

	toJSON(){
		return {
			id: this.id,
			text: this.text,
			remark: this.remark,
			folded: this.folded,
			style: this.style.toJSON(),
			branch: this.branch.toJSON(),
			children: this.children.map( child => child.toJSON() ),
		}
	}
}
