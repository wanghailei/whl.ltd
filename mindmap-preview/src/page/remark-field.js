import { RemarkDraft } from "./remark-draft.js"

/* The selected node's remark, fixed at the canvas's foot. This owns only
	the editing session; the draft owns validation, and the page owns saving.
	It talks only to its supplied field, labels and callbacks. The original
	is kept apart from its single-line projection until an edit is committed. */
export class RemarkField {
	constructor( { area, field, prompt, notice, original, say, write, leave, confirm } ){
		Object.assign( this, { area, field, prompt, notice, original, say, write, leave, confirm } )
		this.shownFor = null
		this.composing = false
		field.addEventListener( "beforeinput", event => {
			this.rememberSelection()
			if( !this.composing && !event.isComposing && event.cancelable && /[\r\n]/.test( event.data ?? "" ) ){
				event.preventDefault()
				this.insert( event.data )
			}
		} )
		field.addEventListener( "input", event => {
			if( !this.composing && !event.isComposing ) this.accept( field.value )
			this.showPrompt()
		} )
		field.addEventListener( "paste", event => this.paste( event ) )
		field.addEventListener( "compositionstart", () => {
			this.rememberSelection()
			this.composing = true
		} )
		field.addEventListener( "compositionend", () => {
			this.composing = false
			this.accept( field.value )
		} )
		field.addEventListener( "keydown", event => this.press( event ) )
		field.addEventListener( "blur", () => {
			this.commit()
			/* Chromium and WebKit reset an input's scroll after blur handlers.
				Centre after that native reset, without fighting the focused caret. */
			field.ownerDocument.defaultView.requestAnimationFrame( () => this.centre() )
		} )
	}

	show( topic, name ){
		this.area.classList.toggle( "hidden", !topic )
		if( !topic ) return
		this.field.placeholder = name
		this.field.setAttribute( "aria-label", name )
		this.prompt.textContent = name.toUpperCase()
		const typing = this.field.ownerDocument.activeElement === this.field && this.shownFor === topic.id
		this.shownFor = topic.id
		if( !typing ) this.reset( topic.remark )
		/* A language change translates an already visible error too. */
		if( !this.notice.hidden ) this.notice.textContent = this.say( "remarkLimit" )
	}

	reset( text ){
		this.draft = new RemarkDraft( text )
		this.field.value = this.draft.value
		if( text ) this.field.title = text
		else this.field.removeAttribute( "title" )
		this.original.textContent = text
		this.original.hidden = !this.draft.isLegacy
		this.notice.hidden = true
		this.showPrompt()
		this.centre()
	}

	centre(){
		if( this.field.ownerDocument.activeElement === this.field ) return
		this.field.scrollLeft = ( this.field.scrollWidth - this.field.clientWidth ) / 2
	}

	showPrompt(){
		this.prompt.hidden = this.field.value !== ""
	}

	rememberSelection(){
		/* Keep the range from before the rejected edit, including an IME's
			whole replacement, rather than move the caret to the end. */
		if( this.composing ) return
		this.selection = [ this.field.selectionStart, this.field.selectionEnd ]
	}

	accept( text ){
		const accepted = this.draft.accept( text )
		if( this.field.value !== this.draft.value ) this.field.value = this.draft.value
		this.notice.hidden = accepted
		if( !accepted ){
			this.notice.textContent = this.say( "remarkLimit" )
			if( this.selection ) this.field.setSelectionRange( ...this.selection )
		}
		this.showPrompt()
	}

	paste( event ){
		/* Text inputs strip newlines before input fires, so intercept paste
			before that information is lost and turn each break into a space. */
		/* A copied screenshot has no text: treating that as an empty string
			would delete the selected words instead of leaving them alone. */
		if( this.composing || !event.clipboardData?.types.includes( "text/plain" ) ) return
		event.preventDefault()
		this.rememberSelection()
		this.insert( event.clipboardData.getData( "text/plain" ) )
	}

	insert( text ){
		const [ start, end ] = this.selection
		const words = text.replace( /\r\n|\r|\n/g, " " )
		const candidate = this.field.value.slice( 0, start ) + words + this.field.value.slice( end )
		this.accept( candidate )
		if( this.notice.hidden ) this.field.setSelectionRange( start + words.length, start + words.length )
	}

	press( event ){
		if( this.composing || event.isComposing || event.keyCode === 229 ) return
		if( event.key !== "Enter" && event.key !== "Escape" ) return
		event.preventDefault()
		event.stopPropagation()
		if( event.key === "Escape" ) this.reset( this.draft.original )
		this.field.blur()
		this.leave()
	}

	commit(){
		if( !this.shownFor || !this.draft ) return
		/* A window can lose focus while an IME is still active. Validate its
			final candidate before saving; unedited legacy projections stay put. */
		if( this.composing ){
			this.composing = false
			this.accept( this.field.value )
		}
		if( !this.draft.changed ) return
		const text = this.draft.value
		if( this.draft.isLegacy && !this.confirm( this.say( "remarkReplace" ) ) ){
			this.reset( this.draft.original )
			return
		}
		/* Reset before writing: saving redraws synchronously and may show the
			field again. Never leave a pending edit for that redraw to commit. */
		this.reset( text )
		this.write( this.shownFor, text )
	}
}
