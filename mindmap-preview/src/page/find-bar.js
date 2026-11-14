/* The find field, opened by Cmd+F under the title line, at the master's word
	(2026-11-12, 23:07): as words are typed, every node whose words or remark
	hold them is found and glows, and the first is gone to; Enter goes to the
	next and Shift+Enter to the one before, round and round; beside the field,
	which of how many is shown; Esc closes it.

	Pre-flight answers. The bar knows only the words typed, the identities of
	the nodes they find, and which of them was gone to; what finds them, and
	what going to one means — opening the folds above it, selecting it,
	bringing it into sight — are the page's actions. */
export class FindBar {
	constructor( { bar, field, count, actions } ){
		this.bar = bar
		this.field = field
		this.count = count
		this.actions = actions
		this.found = []
		this.at = -1
		field.addEventListener( "input", () => this.search() )
		field.addEventListener( "keydown", event => this.press( event ) )
	}

	get isOpen(){
		return !this.bar.classList.contains( "hidden" )
	}

	/* Opens the field, or, open already, takes the keyboard back to it, its
		 words selected to be typed over. Words kept from before find their
		 nodes again, the first gone to, as if typed afresh: kept with no
		 nodes found, Enter went nowhere (found in review, 2026-11-13). */
	open(){
		const reopening = !this.isOpen
		this.bar.classList.remove( "hidden" )
		this.field.focus()
		this.field.select()
		if( reopening && this.field.value.trim() !== "" ) this.search()
	}

	/* Closes the field: nothing glows any more, and the node last gone to
		 stays selected. The field lets the keyboard go first: a hidden field
		 keeps the focus until the browser's next frame, and the map's keyboard
		 was not given back (found in review, 2026-11-13). */
	close(){
		this.field.blur()
		this.bar.classList.add( "hidden" )
		this.found = []
		this.at = -1
		this.count.textContent = ""
		this.actions.closed()
	}

	/* What the words find as the map now stands, without going anywhere: kept in step at every change. */
	refresh(){
		this.found = this.actions.matching( this.field.value )
		this.at = Math.min( this.at, this.found.length - 1 )
		this.tell()
	}

	// ── Inside ──────────────────────────────────────────────────────

	search(){
		this.found = this.actions.matching( this.field.value )
		this.at = this.found.length > 0 ? 0 : -1
		this.go()
	}

	step( by ){
		if( this.found.length === 0 ) return
		this.at = ( this.at + by + this.found.length ) % this.found.length
		this.go()
	}

	go(){
		this.tell()
		if( this.at >= 0 ) this.actions.go( this.found[ this.at ] )
		else this.actions.marked()
	}

	/* Which of how many: "3 / 7"; none found, "0 / 0"; with no words, nothing. */
	tell(){
		this.count.textContent = this.field.value.trim() === "" ? "" : ( this.at + 1 ) + " / " + this.found.length
	}

	/* The field's own keys: Enter and Shift+Enter step, Esc closes, Cmd+F selects its words. */
	press( event ){
		if( event.isComposing || event.keyCode === 229 ) return
		if( event.key === "Enter" ){
			event.preventDefault()
			this.step( event.shiftKey ? -1 : 1 )
		} else if( event.key === "Escape" ){
			event.preventDefault()
			this.close()
		} else if( ( event.metaKey || event.ctrlKey ) && event.key.toLowerCase() === "f" ){
			event.preventDefault()
			this.field.select()
		}
	}
}
