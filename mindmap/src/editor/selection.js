/* What is selected: some topics, in the order they were picked, or one
	auxiliary line, or one branch, held by the topic it leads to — never two
	kinds at once, since the panel styles one kind at a time.

	Held by identity, so it survives undo, redo and opening, which rebuild the
	map's objects: after each, the selection keeps whatever still exists. It
	is a value; every change is a new selection. */
export class Selection {
	constructor( { topics = [], line = null, branch = null } = {} ){
		this.topicIds = topics
		this.lineId = line
		this.branchId = branch
	}

	static of( topic ){
		return new Selection( { topics: [ topic.id ] } )
	}

	static ofLine( line ){
		return new Selection( { line: line.id } )
	}

	static ofBranch( topic ){
		return new Selection( { branch: topic.id } )
	}

	static ofMany( topics ){
		return new Selection( { topics: topics.map( topic => topic.id ) } )
	}

	/* A topic picked or put back. The last selected topic stays, so a toggle
		 never leaves the panel with nothing to show. */
	toggled( topic ){
		if( !this.topicIds.includes( topic.id ) ) return new Selection( { topics: [ ...this.topicIds, topic.id ] } )
		if( this.topicIds.length === 1 ) return this
		return new Selection( { topics: this.topicIds.filter( id => id !== topic.id ) } )
	}

	topicsIn( map ){
		return this.topicIds.map( id => map.find( id ) ).filter( Boolean )
	}

	lineIn( map ){
		return this.lineId === null ? null : map.findLine( this.lineId )
	}

	/* The topic whose branch is selected. */
	branchIn( map ){
		return this.branchId === null ? null : map.find( this.branchId )
	}

	includes( topic ){
		return this.topicIds.includes( topic.id )
	}
}
