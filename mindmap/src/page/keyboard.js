/* The keyboard map, in one place: which key does what, as SPEC.md's table
	says. Keys are turned into the page's named actions; what an action does
	is the page's. Keys typed into a field — of the panel, or the remark —
	stay with the field.

	Cmd on the Mac and Ctrl elsewhere are taken alike, so the same map serves
	both; a page can take over the browser's own Cmd+S, Cmd+O, Cmd+A, Cmd+F
	and Cmd+C, Cmd+X and Cmd+V while it has the focus, and it does: Cmd+F
	opens the map's own find field, and the last three copy, cut and paste
	whole branches, in a field they are the field's. Zoom has no keys, at the
	master's word (2026-11-12): Cmd+= and Cmd+- are left to the browser. */
const ARROWS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }
/* The step among its siblings each arrow moves a node by, with Alt held. */
const REORDERING = { ArrowUp: -1, ArrowDown: 1 }

export class Keyboard {
	constructor( { document, actions } ){
		this.actions = actions
		document.addEventListener( "keydown", event => this.press( event ) )
	}

	/* A key an input method is composing with is the input method's. */
	press( event ){
		if( event.isComposing || event.keyCode === 229 ) return
		if( typingInField( event.target ) ) return
		const action = this.actionFor( event )
		if( !action ) return
		event.preventDefault()
		action()
	}

	actionFor( event ){
		const actions = this.actions
		const command = event.metaKey || event.ctrlKey
		const key = event.key
		if( command ){
			const lower = key.toLowerCase()
			if( lower === "z" ) return event.shiftKey ? actions.redo : actions.undo
			if( lower === "y" ) return actions.redo
			if( lower === "a" ) return actions.selectAll
			if( lower === "s" ) return actions.save
			if( lower === "o" ) return actions.open
			if( lower === "c" ) return actions.copy
			if( lower === "x" ) return actions.cut
			if( lower === "v" ) return actions.paste
			if( lower === "f" ) return actions.find
			if( key === "0" ) return actions.centre
			return null
		}
		/* Alt with ↑ or ↓ moves the node among its siblings, at the master's word (2026-11-12, 23:07). */
		if( event.altKey ) return REORDERING[ key ] ? () => actions.reorder( REORDERING[ key ] ) : null
		if( key === "Tab" ) return event.shiftKey ? actions.addParent : actions.addChild
		if( key === "Enter" ) return actions.addSibling
		if( key === "Delete" || key === "Backspace" ) return actions.deleteSelected
		if( key === " " ) return actions.fold
		if( key === "Escape" ) return actions.escape
		if( ARROWS[ key ] ) return () => actions.move( ARROWS[ key ] )
		/* Any other single character starts the text afresh with it. */
		if( [ ...key ].length === 1 ) return () => actions.edit( key )
		return null
	}
}

/* The text field waiting unseen over a node is not a field being typed in: its keys are the map's. */
function typingInField( target ){
	return target instanceof Element && ( target.closest( "input, textarea:not(.armed), select, [contenteditable]" ) !== null )
}
