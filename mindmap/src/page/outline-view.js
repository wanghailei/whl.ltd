import { finishingBy } from "./text-editor.js"

/* Carbon's chevrons, 16px (IBM Carbon Design System, Apache-2.0): a folded
	line's mark points right, an open line's down. */
const CHEVRONS = {
	folded: "M11 8 6 13 5.3 12.3 9.6 8 5.3 3.7 6 3z",
	open: "M8 11 3 6 3.7 5.3 8 9.6 12.3 5.3 13 6z",
}
const SVG = "http://www.w3.org/2000/svg"

/* The outline: the map as an indented list in the left column, one row a
	shown node, its title then its remark, in the map's order, set in by its depth, at the master's word
	(2026-11-12, 23:07).

	Pre-flight answers. The outline owns no state of the map's: it is drawn
	afresh from the editor at every change, so it is always in step, and
	what is done in it — a line pressed, a fold mark pressed, a line
	double-clicked — goes to the map through the page's actions, coming back
	when the map is drawn. Its one state is the words being written in a
	line's field, ended by the same keys that end them on the map; while
	they are written, the outline is not drawn afresh, so the field stays. */
export class OutlineView {
	constructor( { rows, placeholder, say, actions } ){
		this.rows = rows
		this.placeholder = placeholder
		this.say = say
		this.actions = actions
		this.order = []
		this.writing = null
		this.deferredEditor = null
		rows.addEventListener( "pointerdown", event => this.press( event ) )
		rows.addEventListener( "click", event => this.pressFromKeyboard( event ) )
		rows.addEventListener( "dblclick", event => {
			const row = event.target.closest( ".outline-row" )
			if( row && !event.target.closest( ".outline-fold, .outline-field" ) ) this.actions.edit( row.dataset.topic )
		} )
	}

	/* Whether a node's words are being written in a line of the outline. */
	get isWriting(){
		return this.writing !== null
	}

	/* Every shown node's line, the selected ones marked and the first of
		 them kept in sight; while words are written, nothing is drawn afresh. */
	show( editor ){
		if( this.isWriting ){
			this.deferredEditor = editor
			return
		}
		this.order = [ ...editor.map.root.walkShown() ]
		this.rows.replaceChildren( ...this.order.map( topic => this.line( topic, editor.selection.includes( topic ) ) ) )
		this.rows.querySelector( ".selected" )?.scrollIntoView( { block: "nearest" } )
	}

	/* The keyboard's focus on the outline, so the map's keys reach the page from it. */
	focus(){
		if( !this.isWriting ) this.rows.focus( { preventScroll: true } )
	}

	/* The node an arrow key goes to from a line: the line above or below, the parent, or the first child shown. */
	neighbour( topic, way ){
		const at = this.order.indexOf( topic )
		if( at === -1 ) return null
		if( way === "up" ) return this.order[ at - 1 ] ?? null
		if( way === "down" ) return this.order[ at + 1 ] ?? null
		if( way === "left" ) return topic.parent
		return topic.shownChildren[ 0 ] ?? null
	}

	/* Opens a field in a node's line for its words, `replace` starting them
		 afresh with that character; `done` hears how the writing ended and
		 the words, as on the map. Says whether the line was there to write in. */
	write( { topic, replace = null, done } ){
		const words = this.rowOf( topic.id )?.querySelector( ".outline-text" )
		if( !words ) return false
		const field = this.rows.ownerDocument.createElement( "textarea" )
		field.className = "outline-field"
		field.spellcheck = false
		field.placeholder = topic.isRoot ? this.placeholder : ""
		field.value = replace ?? topic.text
		const fit = () => { field.rows = field.value.split( "\n" ).length }
		fit()
		field.addEventListener( "input", fit )
		field.addEventListener( "keydown", event => {
			event.stopPropagation()
			if( event.isComposing || event.keyCode === 229 ) return
			const how = finishingBy( event )
			if( !how ) return
			event.preventDefault()
			this.finish( how )
		} )
		field.addEventListener( "blur", () => this.finish( "keep" ) )
		words.replaceWith( field )
		this.writing = { field, words, done }
		field.focus( { preventScroll: true } )
		field.setSelectionRange( field.value.length, field.value.length )
		return true
	}

	/* Puts the line's words back in place of the field and says how the writing ended, with the words. */
	finish( how ){
		const writing = this.writing
		if( !writing ) return
		this.writing = null
		const deferred = this.deferredEditor
		this.deferredEditor = null
		writing.field.replaceWith( writing.words )
		writing.done( { how, text: writing.field.value } )
		/* Cancel and an unchanged title emit no map change. Replay the deferred
			show even then; if done opened the next title, show defers again. */
		if( deferred ) this.show( deferred )
	}

	// ── Inside ──────────────────────────────────────────────────────

	/* A press on a line selects its node, with Shift or Cmd adding it or
		 taking it out; on its fold mark, folds or opens it. */
	press( event ){
		if( event.button !== 0 || event.target.closest( ".outline-field" ) ) return
		const row = event.target.closest( ".outline-row" )
		if( !row ) return
		if( event.target.closest( ".outline-fold" ) ) this.actions.fold( row.dataset.topic )
		else this.actions.press( row.dataset.topic, event.shiftKey || event.metaKey || event.ctrlKey )
	}

	/* A fold mark pressed from the keyboard, by Enter or Space, a click with
		 no pointer behind it, folds or opens its own line's node, and the new
		 mark of that line, drawn afresh, keeps the focus, so it is pressed
		 again. A fold mark the keyboard reached holds its keys (keyboard.js),
		 and folded only at a pointer's press (found in audit, 2026-11-13). */
	pressFromKeyboard( event ){
		const row = event.target.closest( ".outline-fold" )?.closest( ".outline-row" )
		if( !row || event.detail !== 0 ) return
		const id = row.dataset.topic
		this.actions.fold( id )
		this.rows.querySelector( `.outline-row[data-topic="${ CSS.escape( id ) }"] .outline-fold` )?.focus()
	}

	/* One node's row: a fold mark or spacer beside its title and remark. */
	line( topic, selected ){
		const row = this.rows.ownerDocument.createElement( "div" )
		row.className = "outline-row" + ( selected ? " selected" : "" )
		row.dataset.topic = topic.id
		row.style.setProperty( "--depth", topic.depth )
		row.setAttribute( "role", "treeitem" )
		row.setAttribute( "aria-level", topic.depth + 1 )
		row.setAttribute( "aria-selected", String( selected ) )
		if( topic.children.length > 0 ) row.setAttribute( "aria-expanded", String( !topic.folded ) )
		row.append( topic.children.length > 0 ? this.foldMark( topic ) : this.space(), this.content( topic ) )
		return row
	}

	/* The title alone is replaced by write(); the remark remains read-only.
		Both share a column so wrapping and title editing keep their left edge. */
	content( topic ){
		const document = this.rows.ownerDocument
		const content = document.createElement( "div" )
		content.className = "outline-content"
		content.append( this.words( topic ) )
		if( topic.remark !== "" ){
			const remark = document.createElement( "span" )
			remark.className = "outline-remark"
			remark.textContent = topic.remark
			content.append( remark )
		}
		return content
	}

	foldMark( topic ){
		const document = this.rows.ownerDocument
		const button = document.createElement( "button" )
		button.type = "button"
		button.className = "outline-fold"
		button.setAttribute( "aria-label", this.say( topic.folded ? "openBranch" : "foldBranch" ) )
		const svg = document.createElementNS( SVG, "svg" ), path = document.createElementNS( SVG, "path" )
		svg.setAttribute( "viewBox", "0 0 16 16" )
		svg.setAttribute( "fill", "currentColor" )
		svg.setAttribute( "aria-hidden", "true" )
		path.setAttribute( "d", topic.folded ? CHEVRONS.folded : CHEVRONS.open )
		svg.append( path )
		button.append( svg )
		return button
	}

	space(){
		const space = this.rows.ownerDocument.createElement( "span" )
		space.className = "outline-space"
		return space
	}

	/* The node's words as they are, put in as text, never as markup; an empty central node shows its placeholder. */
	words( topic ){
		const words = this.rows.ownerDocument.createElement( "span" )
		const placeholder = topic.isRoot && topic.text === ""
		words.className = "outline-text" + ( placeholder ? " placeholder" : "" )
		words.textContent = placeholder ? this.placeholder : topic.text
		return words
	}

	/* Identities come from files, so they are escaped before they stand in a selector. */
	rowOf( id ){
		return this.rows.querySelector( `.outline-row[data-topic="${ CSS.escape( id ) }"]` )
	}
}
