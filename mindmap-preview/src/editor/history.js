/* Undo and redo, as whole states of the map.

	Each state is the map's file text, as the map file writes it. A whole
	state is dearer than a list of inverse operations, but it cannot drift
	from the map the way a hand-written inverse can, and the file already
	reads back exactly what it wrote. At a few kilobytes a state, the default
	two hundred cost well under a megabyte.

	A state may carry the name of the change that followed it, so that change
	alone can be withdrawn later and nothing else by mistake. */
export class History {
	constructor( { limit = 200 } = {} ){
		this.limit = limit
		this.past = []
		this.future = []
	}

	/* The state before a change, kept for undo, with the change's name if it has one. A new change ends any redo. */
	record( state, change = null ){
		this.past.push( { state, change } )
		if( this.past.length > this.limit ) this.past.shift()
		this.future = []
	}

	/* The state to go back to, keeping the current one for redo; null when there is none. */
	undo( current ){
		if( !this.canUndo ) return null
		this.future.push( current )
		return this.past.pop().state
	}

	redo( current ){
		if( !this.canRedo ) return null
		this.past.push( { state: current, change: null } )
		return this.future.pop()
	}

	/* The state before the last change, taken back as if the change had never
		 been made: it cannot be redone. Given a name, only a last change of that
		 name is withdrawn — for a node added and left empty, when something else
		 may have changed since. Null when there is nothing to withdraw. */
	withdraw( change = null ){
		const last = this.past[ this.past.length - 1 ]
		if( !last || ( change !== null && last.change !== change ) ) return null
		return this.past.pop().state
	}

	get canUndo(){
		return this.past.length > 0
	}

	get canRedo(){
		return this.future.length > 0
	}
}
