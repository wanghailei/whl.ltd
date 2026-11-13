import { Editor } from "../editor/editor.js"
import { BrowserStore } from "../editor/browser-store.js"
import { MindMap } from "../model/mind-map.js"
import { MapFile } from "../file/map-file.js"
import { MapReader } from "../file/map-reader.js"
import { MapPicture } from "../drawing/map-picture.js"
import { CanvasMeasure } from "./canvas-measure.js"
import { CanvasView } from "./canvas-view.js"
import { TextEditor } from "./text-editor.js"
import { Keyboard, holdsItsKeys } from "./keyboard.js"
import { Pointer } from "./pointer.js"
import { Panel } from "./panel.js"
import { ColourPicker } from "./colour-picker.js"
import { Language, CENTRAL_PLACEHOLDER } from "./language.js"
import { FileDoor } from "./file-door.js"
import { Output } from "./output.js"
import { HELP } from "./help.js"
import { RemarkField } from "./remark-field.js"
import { OutlineView } from "./outline-view.js"
import { FindBar } from "./find-bar.js"
import { highlightOn, glowOn, laidOver, rgbToHex } from "../drawing/colour.js"
import { Search } from "../editor/search.js"

/* The version of the last release: it rises once per release, when the
	release is published, at the master's word (2026-11-13, 07:54): one minor
	step if the release holds any feature, otherwise one patch step; the major
	is the master's. A commit leaves it as it is; the changes since gather
	under CHANGELOG.md's Unreleased heading, which the release then numbers. */
const VERSION = "0.42.0"
/* How long a notice stays, unless another takes its place. */
const NOTICE_TIME = 7000
/* The notice for each reason a file would not open. */
const FILE_TROUBLES = { "not-a-map": "notAMap", newer: "newer", broken: "broken", empty: "emptyOutline" }
/* The node opened for words straight after a node's words are kept by
	Enter, Tab or Shift+Tab: a sibling below, a child, or a parent. */
const NEXT_NODE = { sibling: editor => editor.addSibling(), child: editor => editor.addChild(), parent: editor => editor.addParent() }

/* The page: it makes the editor and everything that shows and drives it,
	wires each to the others through named actions, and redraws whenever the
	editor changes. It holds no state of the map's own — only the view's: the
	picture last drawn. */
class Page {
	constructor( document ){
		this.document = document
		this.document.title = "WHL Mindmap " + VERSION
		this.store = new BrowserStore()
		this.mapFile = new MapFile()
		this.language = new Language( document )
		this.measure = new CanvasMeasure( document )
		this.stage = this.element( "stage" )
		this.view = new CanvasView( { stage: this.stage, viewport: this.element( "viewport" ) } )
		this.textField = this.element( "text-editor" )
		this.textEditor = new TextEditor( { field: this.textField, view: this.view, measure: this.measure, typed: ( topic, text ) => this.drawWhileWriting( topic, text ) } )
		this.door = new FileDoor( { document, input: this.element( "open-file" ), stage: this.stage } )
		this.reader = new MapReader( { mapFile: this.mapFile } )
		this.output = new Output( { document, door: this.door } )
		this.editor = new Editor( { map: this.openingMap(), file: this.mapFile } )
		this.remarkField = new RemarkField( {
			area: this.element( "remark-area" ),
			field: this.element( "remark" ),
			prompt: this.element( "remark-prompt" ),
			notice: this.element( "remark-notice" ),
			original: this.element( "remark-original" ),
			say: word => this.language.say( word ),
			confirm: words => this.document.defaultView.confirm( words ),
			leave: () => this.armKeyboard(),
			write: ( id, text ) => {
				const topic = this.editor.map.find( id )
				if( topic ) this.editor.writeRemark( topic, text )
			},
		} )
		this.panel = new Panel( { document, actions: this.panelActions(), picker: new ColourPicker( document ), language: this.language } )
		this.outline = new OutlineView( { rows: this.element( "outline-rows" ), placeholder: CENTRAL_PLACEHOLDER, say: word => this.language.say( word ), actions: this.outlineActions() } )
		this.finder = new FindBar( { bar: this.element( "find" ), field: this.element( "find-field" ), count: this.element( "find-count" ), actions: this.findActions() } )
		/* Where the user last worked, the map or the outline: the node's words
			 are written there, and the arrow keys step that way. Told before the
			 press itself is handled, which may redraw. */
		this.writingIn = "map"
		this.stage.addEventListener( "pointerdown", () => { this.writingIn = "map" } )
		this.element( "outline" ).addEventListener( "pointerdown", () => { this.writingIn = "outline" }, { capture: true } )
		new Keyboard( { document, actions: this.keyActions() } )
		new Pointer( { stage: this.stage, view: this.view, marquee: this.element( "marquee" ), actions: this.pointerActions() } )
		this.door.acceptDrops( file => this.open( file ) )
		/* A press on the canvas moves the browser's focus away from the waiting
			 text field before anything is redrawn; once the press is over, it waits again. */
		this.stage.addEventListener( "pointerup", () => this.armKeyboard() )
		/* So does a click on a control of the panel or the title line, and a return to the window. */
		for( const id of [ "toolbar", "tools" ] ) this.element( id ).addEventListener( "click", event => {
			if( !event.target.closest( "input, textarea, select" ) ) this.armKeyboard()
		} )
		document.defaultView.addEventListener( "focus", () => this.armKeyboard() )
		this.showHighlight()
		this.editor.listen( change => this.redraw( change ) )
		this.view.listen( () => this.viewChanged() )
		this.wireTitleLine()
		this.element( "title" ).innerHTML = "WHL MINDMAP <span id=\"version\">" + VERSION + "</span>"
		this.element( "help-text" ).innerHTML = HELP.en
		this.redraw( { mapChanged: true } )
		this.view.centre()
		this.tellOfSetAside()
		/* The house face arrives after the first drawing; widths measured before it are wrong. */
		document.fonts.ready.then( () => {
			this.measure.forget()
			this.redraw( { mapChanged: true } )
			this.view.centre()
		} )
	}

	element( id ){
		return this.document.getElementById( id )
	}

	// ── Maps ────────────────────────────────────────────────────────

	/* The draft kept in this browser, if there is one that opens; else a new
		 map. A draft that does not open — one kept by a newer Mindmap, say — is
		 set aside in the browser first, so the new map's autosave cannot
		 overwrite it, and the user is told. */
	openingMap(){
		const draft = this.store.draft()
		if( draft ){
			try {
				return this.mapFile.read( draft )
			} catch {
				this.setAside = { text: draft, kept: this.store.setAside( draft ) !== null }
			}
		}
		return this.freshMap()
	}

	/* A draft set aside can be saved as a file, to open in the Mindmap that made it. */
	tellOfSetAside(){
		if( !this.setAside ) return
		const { text, kept } = this.setAside
		this.notice( this.language.say( kept ? "draftSetAside" : "draftLost" ), {
			lasting: true,
			action: {
				label: this.language.say( "saveSetAside" ),
				run: () => this.door.download( new Blob( [ text ], { type: "application/json" } ), "Set aside" + MapFile.SUFFIX ),
			},
		} )
	}

	/* A new map in the default styles and the appearance last chosen, or the
		 system's. Its central node has no words unless given some: the words
		 it shows are only its placeholder, drawn in their place until words
		 are typed (found in use, 2026-11-12: 0.1.0 gave "Central idea" as the
		 node's own words, which stayed when the node was edited in place, and
		 what was typed was added after them). */
	freshMap( text = "" ){
		const systemDark = this.document.defaultView.matchMedia?.( "(prefers-color-scheme: dark)" ).matches ?? true
		return MindMap.fresh( {
			text,
			style: this.store.defaults()?.toJSON(),
			appearance: this.store.appearance() ?? ( systemDark ? "dark" : "light" ),
		} )
	}

	async open( file ){
		this.settleFields()
		const text = await file.text()
		let map
		try {
			map = this.reader.read( file.name, text, words => this.freshMap( words ) )
		} catch( error ){
			this.notice( this.language.say( FILE_TROUBLES[ error.reason ] ?? "notAMap", { version: error.version } ) )
			return
		}
		this.editor.replace( map )
		this.view.centre()
	}

	save(){
		const map = this.editor.map
		this.door.download( new Blob( [ this.mapFile.write( map ) ], { type: "application/json" } ), this.mapFile.nameFor( map ) )
	}

	/* PNG, SVG, PDF or MD of the map as drawn. A failure is said in a notice,
		 and its cause written to the browser's console, where a fault in the
		 page itself shows rather than passing for a map too large. */
	async export( kind, make ){
		try {
			await make()
		} catch( error ){
			console.error( error )
			this.notice( this.language.say( "exportFailed", { kind } ) )
		}
	}

	/* A field being typed in keeps what it holds before anything else
		 changes: its change lands on what was selected when it was typed. */
	settleFields(){
		const active = this.document.activeElement
		if( active?.matches?.( "input, textarea, select" ) ) active.blur()
	}

	// ── Drawing ─────────────────────────────────────────────────────

	/* After every change: a change to the map draws it afresh and keeps the
		 draft; a change of selection only marks it. A map drawn afresh while a
		 node's words are written, as when the house face arrives, is drawn with
		 those words as they stand and the node's own hidden under the field,
		 which has no ground of its own to cover them (found in audit,
		 2026-11-13: the face arriving mid-writing drew the node's old words
		 under the field). */
	redraw( { mapChanged } ){
		if( mapChanged ){
			this.drawnWhileWriting = false
			this.picture = new MapPicture( this.editor.map, { measure: this.measure, placeholder: CENTRAL_PLACEHOLDER } )
			this.view.show( this.picture, this.editor )
			this.keepDraft()
			this.textEditor.retell()
		} else this.view.mark( this.editor )
		this.document.documentElement.style.setProperty( "--ground", this.picture.look.background )
		this.document.documentElement.classList.toggle( "ink-dark", this.picture.look.isLight )
		/* The ink itself the look's, which reads on any ground at 4.5 to 1:
			 near-black fell short on greys round #777777 (found in audit, 2026-11-13). */
		this.document.documentElement.style.setProperty( "--ink", this.picture.look.ink )
		this.showHighlightMark()
		this.panel.sync( { editor: this.editor, look: this.picture.look, zoom: this.view.zoom, highlight: this.highlight() } )
		if( this.shown?.outline ) this.outline.show( this.editor )
		this.markFound()
		this.showRemark()
		this.markJoining()
		this.armKeyboard()
	}

	/* Whether the outline is open and the user last worked in it. */
	get inOutline(){
		return this.writingIn === "outline" && this.shown?.outline === true
	}

	/* The canvas shows it is waiting for a line's second node exactly while the editor is waiting. */
	markJoining(){
		const joining = this.editor.isJoining
		this.stage.classList.toggle( "joining", joining )
		if( !joining && this.joiningNotice ){
			this.joiningNotice = false
			this.notice( "" )
		}
	}

	/* The waiting text field goes over the selected node, unless another
		 field — of the panel, or the remark — is being typed in, or a button
		 the keyboard has reached holds the focus, or words are being written
		 already. While the user works in the outline, the outline holds the
		 keyboard's focus instead. A button pressed from the keyboard keeps the
		 focus, so the keyboard goes on through the panel (found in audit,
		 2026-11-12); one clicked has let it go first (keyboard.js), and the
		 keys come back to the map. */
	armKeyboard(){
		if( !this.picture || this.textEditor.isOpen || this.outline.isWriting ) return
		const focus = this.editor.focus
		const box = focus && this.picture.arrangement.boxOf( focus )
		const active = this.document.activeElement
		const held = active !== this.textField && holdsItsKeys( active )
		if( !box || held || this.inOutline ){
			this.textEditor.disarm()
			if( this.inOutline && !held ) this.outline.focus()
			return
		}
		const map = this.editor.map
		this.textEditor.arm( {
			face: this.picture.faces.of( focus ),
			box,
			done: result => this.finishEditing( focus.id, false, map, result ),
		} )
	}

	/* While words are written, the map is drawn with them as they stand, so
		 the node is as wide as what is typed (found in use, 2026-11-12: it kept
		 its placeholder's width); the map itself changes only when the writing
		 is kept. The node is always in the map drawn: a map is replaced only
		 after the field is settled, which ends the writing. As the node grows,
		 the map moves just enough to keep it all in sight, as it does when the
		 writing opens (found in use, 2026-11-12: a node's words ran it past
		 the canvas's edge, under the panel); the field moves with the map. A
		 node grown larger than the canvas keeps its end in sight, where the
		 words go in. */
	drawWhileWriting( topic, text ){
		this.picture = new MapPicture( this.editor.map, { measure: this.measure, placeholder: CENTRAL_PLACEHOLDER, writing: { topic, text } } )
		this.view.show( this.picture, this.editor )
		this.drawnWhileWriting = true
		this.textEditor.follow( this.picture.faces.of( topic ), this.picture.arrangement.boxOf( topic ) )
		this.reveal( topic, { keep: "end" } )
	}

	/* The colour the selection glows in: the one picked and kept, or the stylesheet's own. */
	showHighlight(){
		const kept = this.store.highlight()
		if( kept ) this.document.documentElement.style.setProperty( "--highlight", kept )
		else this.document.documentElement.style.removeProperty( "--highlight" )
		this.showHighlightMark()
	}

	/* How every mark in the highlight is drawn, so it is seen where it lies,
		 light, dark or between (colour.js), set again whenever the ground or
		 the highlight changes: on the canvas, the bands under words and the
		 selection's glow, whose blur lets only part of its strength reach the
		 eye; and on the colour picker's and the notices' own dark tiles, their
		 words white, the bands drawn for that ground (found in audit,
		 2026-11-13: a band drawn for a white canvas left the picker's white
		 close mark at 2 to 1). A band is drawn solid, in its colour already
		 laid over its ground, so a node lying under a tile or the title line
		 cannot change what its words stand on (found in audit, 2026-11-13: a
		 white node under a notice left its words at 3 to 1 on a clear band). */
	showHighlightMark(){
		if( !this.picture ) return
		const highlight = this.highlight(), canvas = this.picture.look.background
		const root = this.document.documentElement
		root.style.setProperty( "--highlight-mark", bandOn( highlight, canvas ) )
		const glow = glowOn( highlight, canvas, this.view.zoom )
		root.style.setProperty( "--glow-mark", glow.colour )
		root.style.setProperty( "--glow-strength", String( glow.strength ) )
		for( const tile of [ this.element( "picker" ), this.element( "note" ) ] ) tile.style.setProperty( "--highlight-mark", bandOn( highlight, groundOf( tile, canvas ) ) )
	}

	highlight(){
		return getComputedStyle( this.document.documentElement ).getPropertyValue( "--highlight" ).trim()
	}

	/* Brings a node into sight, clear of the remark at the canvas's foot,
		 which would otherwise hide the node it belongs to; a node larger than
		 the canvas keeps the edge `keep` names in sight (canvas-view.js). */
	reveal( topic, { keep = "start" } = {} ){
		const remark = this.element( "remark-area" )
		const below = remark.classList.contains( "hidden" ) ? 0 : this.stage.getBoundingClientRect().bottom - remark.getBoundingClientRect().top
		this.view.reveal( topic, { below, keep } )
	}

	/* Scrolls the panel so a control's row is in sight: a line or a branch
		 is clicked to change its look, its colour first, and in a short window
		 its rows stood below the panel's fold (found in use, 2026-11-12). */
	showControl( id ){
		this.element( id ).closest( ".control-row" ).scrollIntoView( { block: "nearest" } )
	}

	/* The remark of the one node selected, if it is drawn; with none or several, none. */
	showRemark(){
		const topics = this.editor.selectedTopics
		const topic = topics.length === 1 ? topics[ 0 ] : null
		const drawn = topic && this.picture.arrangement.boxOf( topic )
		this.remarkField.show( drawn ? topic : null, this.language.say( "remark" ) )
	}

	viewChanged(){
		/* Keep the glow legible below half size without thickening it above
			that point. The viewport survives every redraw, and show() notifies
			this listener even on its first drawing; exports never inherit it. */
		const viewport = this.element( "viewport" ), scale = String( Math.max( 1, 0.5 / this.view.zoom ) )
		if( viewport.style.getPropertyValue( "--glow-scale" ) !== scale ) viewport.style.setProperty( "--glow-scale", scale )
		/* Colour calibration varies above half size too, where width stays
			unchanged. Panning alone does not change the retained strength. */
		if( this.glowZoom !== this.view.zoom ){
			this.glowZoom = this.view.zoom
			this.showHighlightMark()
		}
		if( !this.panel ) return
		this.element( "zoom-value" ).textContent = Math.round( this.view.zoom * 100 ) + "%"
		this.textEditor.moveWithView()
	}

	/* Kept in the browser at every change; only a refusal is said. */
	keepDraft(){
		if( !this.store.keepDraft( this.mapFile.write( this.editor.map ) ) ) this.notice( this.language.say( "notSaved" ) )
	}

	/* A notice, gone after a while unless lasting; it may carry one press, its next step. */
	notice( message, { lasting = false, action = null } = {} ){
		const note = this.element( "note" )
		clearTimeout( this.noticeTimer )
		note.textContent = message
		note.classList.toggle( "hidden", !message )
		if( action ){
			const button = this.document.createElement( "button" )
			button.className = "word"
			button.textContent = action.label
			button.addEventListener( "click", action.run )
			note.append( " ", button )
		}
		if( message && !lasting ) this.noticeTimer = setTimeout( () => note.classList.add( "hidden" ), NOTICE_TIME )
	}

	// ── Writing words ───────────────────────────────────────────────

	/* Opens a field on a node for its words, the node selected and in sight:
		 in its line of the outline while the user works there, else over the
		 node on the map. A fresh node is one just added. */
	editTopic( id, { replace = null, fresh = false } = {} ){
		const topic = this.editor.map.find( id )
		if( !topic || !this.picture.arrangement.boxOf( topic ) ) return
		if( !this.editor.selection.includes( topic ) ) this.editor.select( topic )
		this.reveal( topic )
		const map = this.editor.map
		const done = result => this.finishEditing( id, fresh, map, result )
		if( this.inOutline && this.outline.write( { topic, replace, done } ) ) return
		this.textEditor.open( {
			face: this.picture.faces.of( topic ),
			box: this.picture.arrangement.boxOf( topic ),
			replace,
			done: result => this.finishEditing( id, fresh, map, result ),
		} )
	}

	/* The words written, given to the editor — unless the map has been
		 replaced meanwhile, by a file dropped or opened, when they belong to a
		 map that is gone. */
	finishEditing( id, fresh, map, result ){
		this.applyWriting( id, fresh, map, result )
		/* Drawn with words that were thrown away or left as they were: drawn again as the map stands. */
		if( this.drawnWhileWriting ) this.redraw( { mapChanged: true } )
		/* Whether or not anything changed, the unseen field waits again over what is selected. */
		this.armKeyboard()
	}

	applyWriting( id, fresh, map, { how, text } ){
		if( this.editor.map !== map ) return
		const topic = map.find( id )
		if( !topic ) return
		if( fresh ){
			this.editor.finishWriting( topic, how === "cancel" ? "" : text )
			/* A node just added and left empty goes, and the list it would have carried on ends there. */
			if( how === "cancel" || text.trim() === "" ) return
		} else {
			if( how === "cancel" ) return
			if( text !== topic.text ) this.editor.rename( topic, text )
		}
		const next = NEXT_NODE[ how ]
		if( next ) this.addAndEdit( () => next( this.editor ) )
	}

	addAndEdit( add ){
		const added = add()
		if( added ) this.editTopic( added.id, { fresh: true } )
	}

	// ── Auxiliary lines ─────────────────────────────────────────────

	startJoining(){
		const selected = this.editor.selectedTopics.length
		this.editor.beginLine()
		if( this.editor.isJoining ){
			this.markJoining()
			this.notice( this.language.say( "joinPick" ), { lasting: true } )
			this.joiningNotice = true
		} else if( selected !== 2 ) this.notice( this.language.say( "joinSelect" ) )
	}

	stopJoining(){
		this.editor.cancelLine()
		this.markJoining()
	}

	keepDefault(){
		this.editor.setAsDefault()
		this.notice( this.language.say( this.store.keepDefaults( this.editor.map.style ) ? "defaultKept" : "defaultRefused" ) )
	}

	// ── The title line ──────────────────────────────────────────────

	/* The shell's columns, Alluvial's: OUTLINE toggles the outline, HELP the
		 help, FULLSCREEN / PANEL the controls, and FULLSCREEN folds the help
		 and the outline away too, a full screen being the map alone: the
		 outline is never shown in it, at the master's word (2026-11-12,
		 23:07), so OUTLINE in a full screen brings the panel back with it.
		 None of them is part of the map. */
	wireTitleLine(){
		const shown = this.shown = { help: false, panel: true, outline: false }
		const sync = () => {
			this.element( "shell" ).className = [ shown.outline && "with-outline", shown.help && "with-help", shown.panel && "with-panel" ].filter( Boolean ).join( " " )
			this.element( "view-full" ).classList.toggle( "on", !shown.panel )
			this.element( "view-panel" ).classList.toggle( "on", shown.panel )
			this.element( "help-button" ).classList.toggle( "on", shown.help )
			this.element( "outline-button" ).classList.toggle( "on", shown.outline )
			this.writingIn = shown.outline ? this.writingIn : "map"
		}
		const showOutline = open => {
			Object.assign( shown, open ? { outline: true, panel: true } : { outline: false } )
			if( open ){
				this.writingIn = "outline"
				this.outline.show( this.editor )
			}
			sync()
			this.armKeyboard()
		}
		this.showPanel = () => { shown.panel = true; sync() }
		this.element( "outline-button" ).addEventListener( "click", () => showOutline( !shown.outline ) )
		this.element( "outline" ).querySelector( ".sheet-close" ).addEventListener( "click", () => showOutline( false ) )
		this.element( "help-button" ).addEventListener( "click", () => { shown.help = !shown.help; sync() } )
		this.element( "help" ).querySelector( ".sheet-close" ).addEventListener( "click", () => { shown.help = false; sync() } )
		this.element( "view" ).addEventListener( "click", () => {
			if( shown.panel ) Object.assign( shown, { panel: false, help: false, outline: false } )
			else shown.panel = true
			sync()
		} )
		this.element( "language" ).addEventListener( "click", () => {
			this.language.toggle()
			this.element( "help-text" ).innerHTML = this.language.isChinese ? HELP.cn : HELP.en
			this.redraw( { mapChanged: false } )
		} )
		this.element( "appearance" ).addEventListener( "click", () => {
			/* The appearance as seen: a canvas colour's own, or the map's. */
			const appearance = this.picture.look.appearance === "dark" ? "light" : "dark"
			this.editor.changeAppearance( appearance )
			this.store.keepAppearance( appearance )
		} )
		sync()
	}

	// ── Actions ─────────────────────────────────────────────────────

	keyActions(){
		const editor = this.editor
		return {
			addChild: () => this.addAndEdit( () => editor.addChild() ),
			addSibling: () => this.addAndEdit( () => editor.addSibling() ),
			addParent: () => this.addAndEdit( () => editor.addParent() ),
			reorder: step => {
				editor.reorder( step )
				if( editor.focus ) this.reveal( editor.focus )
			},
			copy: () => editor.copy(),
			cut: () => editor.cut(),
			paste: () => editor.paste(),
			deleteSelected: () => editor.deleteSelected(),
			edit: replace => { if( editor.focus ) this.editTopic( editor.focus.id, { replace } ) },
			fold: () => editor.toggleFold(),
			/* On the map, to the nearest node that way; in the outline, to the line above or below, the parent or the first child. */
			move: way => {
				const focus = editor.focus
				const next = focus && ( this.inOutline ? this.outline.neighbour( focus, way ) : this.picture.arrangement.nearest( focus, way ) )
				if( !next ) return
				editor.select( next )
				this.reveal( next )
			},
			undo: () => editor.undo(),
			redo: () => editor.redo(),
			selectAll: () => editor.selectAll(),
			save: () => this.save(),
			open: () => this.door.choose( file => this.open( file ) ),
			centre: () => this.view.centre(),
			find: () => this.finder.open(),
			/* Esc stops waiting for a line's second node, or closes the find field, or else clears the selection. */
			escape: () => {
				if( editor.isJoining ) this.stopJoining()
				else if( this.finder.isOpen ) this.finder.close()
				else editor.clearSelection()
			},
		}
	}

	/* What the find field finds and where it goes: the nodes the words find,
		 by identity, and the one gone to, its folds opened, selected and
		 brought into sight. */
	findActions(){
		const editor = this.editor
		return {
			matching: words => new Search( words ).matchesIn( editor.map ).map( topic => topic.id ),
			go: id => {
				const topic = editor.map.find( id )
				if( !topic ) return
				editor.uncover( topic )
				this.reveal( topic )
			},
			marked: () => this.markFound(),
			closed: () => {
				this.markFound()
				this.armKeyboard()
			},
		}
	}

	/* While the find field is open, the nodes its words find glow, kept in step with the map. */
	markFound(){
		if( this.finder.isOpen ) this.finder.refresh()
		this.view.markFound( this.finder.isOpen ? this.finder.found : [] )
	}

	/* What is done in the outline: a line pressed selects its node as a
		 press on the map does, its fold mark folds as the map's fold dot does,
		 and a double-click writes the node's words in its line. */
	outlineActions(){
		const { settle, press, fold } = this.pointerActions()
		/* Words being written are kept first, as before a press on the map: a
			 fold made while a parent just added was empty went into the history
			 before the empty parent was taken away (found in review, 2026-11-13). */
		return {
			press: ( id, additive ) => {
				settle()
				press( id, additive )
			},
			fold: id => {
				settle()
				fold( id )
			},
			edit: id => this.editTopic( id ),
		}
	}

	pointerActions(){
		const editor = this.editor
		const topic = id => editor.map.find( id )
		return {
			settle: () => this.settleFields(),
			press: ( id, additive ) => {
				const pressed = topic( id )
				if( !pressed ) return
				if( additive ) editor.toggle( pressed )
				else if( !( editor.selectedTopics.length === 1 && editor.focus === pressed ) ) editor.select( pressed )
			},
			isJoining: () => editor.isJoining,
			join: id => {
				const to = topic( id )
				if( to ) editor.finishLine( to )
				else editor.cancelLine()
				this.markJoining()
			},
			selectLine: id => {
				const line = editor.map.findLine( id )
				if( !line ) return
				editor.selectLine( line )
				this.showControl( "line-colour" )
			},
			selectBranch: id => {
				const leading = topic( id )
				if( !leading ) return
				editor.selectBranch( leading )
				this.showControl( "branch-colour" )
			},
			clearSelection: () => editor.clearSelection(),
			fold: id => {
				const folding = topic( id )
				if( !folding ) return
				editor.select( folding )
				editor.toggleFold()
			},
			accepts: ( id, targetId ) => {
				const dragged = topic( id ), target = topic( targetId )
				return Boolean( dragged && target && !dragged.isRoot && !dragged.contains( target ) )
			},
			move: ( id, targetId ) => {
				const dragged = topic( id ), target = topic( targetId )
				if( !dragged || !target || !editor.move( dragged, target ) ) this.redraw( { mapChanged: true } )
			},
			/* The gap among the drawn nodes a dragged node would go into at this point of the map, or null. */
			gapAt: ( id, point ) => {
				const dragged = topic( id )
				return dragged && !dragged.isRoot ? this.picture.arrangement.gapAt( point, dragged ) : null
			},
			place: ( id, gap ) => {
				const dragged = topic( id )
				if( !dragged || !editor.move( dragged, gap.parent, gap.index ) ) this.redraw( { mapChanged: true } )
			},
			redraw: () => this.redraw( { mapChanged: true } ),
			selectArea: area => {
				const touched = this.picture.arrangement.topics.filter( each => area.overlaps( this.picture.arrangement.boxOf( each ) ) )
				if( touched.length > 0 ) editor.selectMany( touched )
			},
			editTopic: id => this.editTopic( id ),
			editLabel: id => {
				const line = editor.map.findLine( id )
				if( !line ) return
				editor.selectLine( line )
				this.showPanel()
				this.element( "line-label" ).focus()
			},
		}
	}

	panelActions(){
		const editor = this.editor
		const commands = {
			/* What is being typed in a field is kept first, on the map it was typed for:
				 a click does not take the focus from a field in every browser. */
			new: () => {
				this.settleFields()
				editor.replace( this.freshMap() )
				this.view.centre()
			},
			open: () => this.door.choose( file => this.open( file ) ),
			save: () => this.save(),
			"default-node": () => this.keepDefault(),
			"default-line": () => this.keepDefault(),
			"clear-style": () => editor.clearStyles(),
			"add-line": () => this.startJoining(),
			"delete-line": () => editor.deleteSelected(),
			centre: () => this.view.centre(),
			"zoom-in": () => this.view.zoomStep( 1 ),
			"zoom-out": () => this.view.zoomStep( -1 ),
			png: () => this.export( "PNG", () => this.output.png( this.picture ) ),
			svg: () => this.export( "SVG", () => this.output.svg( this.picture ) ),
			pdf: () => this.export( "PDF", () => this.output.pdf( this.picture ) ),
			markdown: () => this.export( "MD", () => this.output.markdown( editor.map ) ),
		}
		const stylers = {
			node: ( changes, gesture ) => editor.styleNodes( changes, gesture ),
			branch: ( changes, gesture ) => editor.styleBranches( changes, gesture ),
			line: ( changes, gesture ) => editor.styleLine( changes, gesture ),
		}
		const settings = {
			canvas: ( colour, gesture ) => editor.paintCanvas( colour, gesture ),
			/* The selection's colour is the user's, not the map's: kept by the browser, never undone. */
			highlight: colour => {
				this.store.keepHighlight( colour )
				this.showHighlight()
				this.redraw( { mapChanged: false } )
			},
		}
		/* A new layout moves every node, so the map is centred again; a theme moves none. */
		const choosers = {
			layout: value => { editor.changeLayout( value ); this.view.centre() },
			theme: value => editor.changeTheme( value ),
			colourStyle: value => editor.changeColourStyle( value ),
			lineForm: value => editor.changeLineForm( value ),
		}
		return {
			command: name => commands[ name ]?.(),
			style: ( kind, changes, gesture = null ) => stylers[ kind ]( changes, gesture ),
			map: ( which, value ) => choosers[ which ]( value ),
			setting: ( name, value, gesture = null ) => settings[ name ]( value, gesture ),
			label: text => editor.labelLine( text ),
			refuseColour: typed => {
				this.notice( this.language.say( "notAColour", { typed } ) )
				this.redraw( { mapChanged: false } )
			},
		}
	}
}

/* The solid colour a band in the highlight is drawn in on a ground: the mark as colour.js settles it, laid over that ground. */
function bandOn( highlight, ground ){
	const { colour, strength } = highlightOn( highlight, ground )
	return laidOver( ground, colour, strength )
}

/* What a tile of its own stands on: its colour, laid over the canvas at its strength. */
function groundOf( tile, canvas ){
	const [ red, green, blue, alpha = 1 ] = getComputedStyle( tile ).backgroundColor.match( /[\d.]+/g ).map( Number )
	return laidOver( canvas, rgbToHex( red, green, blue ), alpha )
}

new Page( document )
