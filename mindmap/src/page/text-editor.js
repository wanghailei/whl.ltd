import { Point } from "../layout/geometry.js"

/* The keys that end the writing, and how each ends it; Shift+Enter is none of them: it starts a new line. */
const FINISHING = [
	{ key: "Enter", shift: false, how: "sibling" },
	{ key: "Tab", shift: false, how: "child" },
	{ key: "Tab", shift: true, how: "parent" },
	{ key: "Escape", shift: false, how: "cancel" },
	{ key: "Escape", shift: true, how: "cancel" },
]

/* How a key pressed while a node's words are written ends the writing —
	sibling, child, parent or cancel — or null where it does not: on the map
	and in the outline alike. */
export function finishingBy( event ){
	return FINISHING.find( finishing => finishing.key === event.key && finishing.shift === event.shiftKey )?.how ?? null
}

/* The field a node's words are typed in, laid exactly over the node's own
	words, in their face, size and colour, growing as they are typed.

	Enter keeps the words and asks for a sibling below, so a list is typed in
	one go, at the master's word (2026-11-12, 23:07), and Shift+Enter starts a
	new line; Tab keeps them and asks for a child, and Shift+Tab for a parent;
	Esc throws them away; leaving the field keeps them.

	While a node is selected and nothing is being written, the field waits
	over it unseen, holding the keyboard's focus — armed. The page's keys
	pass through it to the keyboard map as ever; but an input method can only
	compose in a field, so Chinese typed by pinyin or zhuyin starts composing
	here, and the first character composed, typed or pasted turns the waiting
	field into the visible one, the node's words begun afresh. A key pressed
	while an input method is composing belongs to the input method.

	While words are written, the node's drawn words are hidden, so none of
	them shows round the field as what is typed grows shorter; an empty
	central node's placeholder is the field's own, gone at the first
	character typed or composed. */
export class TextEditor {
	constructor( { field, view, measure, typed = () => {} } ){
		this.field = field
		this.view = view
		this.measure = measure
		/* Hears the words as they stand at every keystroke: the node they are written into, and the words. */
		this.typed = typed
		this.session = null
		field.addEventListener( "keydown", event => this.press( event ) )
		field.addEventListener( "compositionstart", () => this.wake() )
		field.addEventListener( "input", event => {
			if( !event.isComposing ) this.wake()
			this.fit()
			if( this.isOpen ) this.typed( this.session.face.topic, this.field.value )
		} )
		field.addEventListener( "blur", () => this.isOpen ? this.finish( "keep" ) : this.disarm() )
	}

	/* Whether words are being written in it. */
	get isOpen(){
		return this.session?.writing === true
	}

	/* Waits unseen over a node for the first character typed onto it; `done` hears how the writing ended. */
	arm( { face, box, ground, done } ){
		this.session = { face, box, ground, done, writing: false }
		this.place()
		this.field.value = ""
		this.field.classList.add( "armed" )
		this.field.classList.remove( "hidden" )
		this.field.focus( { preventScroll: true } )
	}

	/* Puts the waiting field away, and its focus with it: a hidden field keeps
		 the focus until the browser's next frame, and a key pressed then landed
		 in a field no longer waiting, which the keyboard map leaves alone — an
		 Escape straight after ADD was lost (found in review, 2026-11-12). */
	disarm(){
		if( !this.session || this.session.writing ) return
		this.session = null
		this.field.classList.add( "hidden" )
		this.field.classList.remove( "armed" )
		if( this.field.ownerDocument.activeElement === this.field ) this.field.blur()
	}

	/* Opens on a node: `replace` starts the words afresh with that character; `done` hears how it ended. */
	open( { face, box, ground, replace = null, done } ){
		this.session = { face, box, ground, done, writing: true }
		this.place()
		this.field.classList.remove( "armed", "hidden" )
		this.field.value = replace ?? face.topic.text
		this.markWriting( true )
		this.fit()
		this.field.focus( { preventScroll: true } )
		this.field.setSelectionRange( this.field.value.length, this.field.value.length )
		/* A character that starts the words afresh is set here, not typed into
			 the field, so no input is heard for it: it is told as typed (found in
			 review, 2026-11-12: the node kept its old width until the second). */
		if( replace !== null ) this.typed( face.topic, this.field.value )
	}

	/* The waiting field becomes the visible one, where the view now shows the node. */
	wake(){
		if( !this.session || this.session.writing ) return
		this.session.writing = true
		this.place()
		this.field.classList.remove( "armed" )
		this.markWriting( true )
		this.fit()
	}

	/* The node drawn anew with the words as they stand: the field moves and fits to it. */
	follow( face, box ){
		Object.assign( this.session, { face, box } )
		this.place()
		this.markWriting( true )
		this.fit()
	}

	/* The view moved or scaled the map — panned, zoomed, or the canvas
		 resized: the field, waiting or open, moves with the node under it, its
		 words left as they are (found in audit, 2026-11-13: the map kept the
		 canvas's middle as the window was resized, and the open field stood
		 where the node had been). */
	moveWithView(){
		if( !this.session ) return
		this.place()
		this.fit()
	}

	/* Marks the node as drawn while its words are written, which hides them under the field. */
	markWriting( writing ){
		this.view.topicElement( this.session.face.topic.id )?.classList.toggle( "writing", writing )
	}

	place(){
		const { face, box, ground } = this.session
		const zoom = this.view.zoom
		const words = face.wordsIn( box )
		const corner = this.view.toStage( new Point( words.left, words.top ) )
		this.field.placeholder = face.placeholder
		Object.assign( this.field.style, {
			left: corner.x + "px",
			top: corner.y + "px",
			fontFamily: face.font.family,
			fontSize: face.font.size * zoom + "px",
			lineHeight: face.lineHeight * zoom + "px",
			color: face.style.get( "textColour" ),
			/* What the drawn words stand on: a node whose shape shows no fill
				 stood its field on the stored fill, white words on white (found in
				 audit, 2026-11-13). */
			background: face.backdrop( ground ),
		} )
	}

	/* As wide as its longest line and as tall as its lines, at the view's zoom. */
	fit(){
		if( !this.isOpen ) return
		const { face } = this.session
		const zoom = this.view.zoom
		const lines = this.field.value.split( "\n" )
		const shown = this.field.value === "" ? [ face.placeholder ] : lines
		const widest = Math.max( face.font.size * 1.2, ...shown.map( line => this.measure.width( line, face.font ) ) )
		this.field.style.width = ( widest + face.font.size ) * zoom + "px"
		this.field.style.height = lines.length * face.lineHeight * zoom + "px"
	}

	/* While words are written, their keys stay here; while waiting, every key goes on to the keyboard map. */
	press( event ){
		if( !this.isOpen ) return
		event.stopPropagation()
		if( event.isComposing || event.keyCode === 229 ) return
		const how = finishingBy( event )
		if( !how ) return
		event.preventDefault()
		this.finish( how )
	}

	/* Closes the field and says how — keep, sibling, child, parent or cancel — with the words. */
	finish( how ){
		const session = this.session
		if( !session?.writing ) return
		const text = this.field.value
		this.markWriting( false )
		this.session = null
		this.field.classList.add( "hidden" )
		this.field.blur()
		session.done( { how, text } )
	}
}
