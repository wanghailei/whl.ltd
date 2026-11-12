import { Editor } from "../editor/editor.js"
import { BrowserStore } from "../editor/browser-store.js"
import { MindMap } from "../model/mind-map.js"
import { MapFile } from "../file/map-file.js"
import { MapReader } from "../file/map-reader.js"
import { MapPicture } from "../drawing/map-picture.js"
import { CanvasMeasure } from "./canvas-measure.js"
import { CanvasView } from "./canvas-view.js"
import { TextEditor } from "./text-editor.js"
import { Keyboard } from "./keyboard.js"
import { Pointer } from "./pointer.js"
import { Panel } from "./panel.js"
import { ColourPicker } from "./colour-picker.js"
import { Language, CENTRAL_PLACEHOLDER } from "./language.js"
import { FileDoor } from "./file-door.js"
import { Output } from "./output.js"
import { HELP } from "./help.js"
import { RemarkField } from "./remark-field.js"

/* The version: a feature change is a minor, a fix or small tweak a patch,
	the major the master's. Every change raises it one step in its own
	commit, and it is always the newest version CHANGELOG.md names, its first
	entry; TAI's check-commits holds every commit to this (bin/check,
	.check-commits.json). */
const VERSION = "0.31.0"
/* How long a notice stays, unless another takes its place. */
const NOTICE_TIME = 7000
/* The notice for each reason a file would not open. */
const FILE_TROUBLES = { "not-a-map": "notAMap", newer: "newer", broken: "broken", empty: "emptyOutline" }

/* The page: it makes the editor and everything that shows and drives it,
	wires each to the others through named actions, and redraws whenever the
	editor changes. It holds no state of the map's own — only the view's: the
	picture last drawn. */
class Page {
	constructor( document ){
		this.document = document
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
			write: ( id, text ) => {
				const topic = this.editor.map.find( id )
				if( topic ) this.editor.writeRemark( topic, text )
			},
		} )
		this.panel = new Panel( { document, actions: this.panelActions(), picker: new ColourPicker( document ), language: this.language } )
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
		 draft; a change of selection only marks it. */
	redraw( { mapChanged } ){
		if( mapChanged ){
			this.drawnWhileWriting = false
			this.picture = new MapPicture( this.editor.map, { measure: this.measure, placeholder: CENTRAL_PLACEHOLDER } )
			this.view.show( this.picture, this.editor )
			this.keepDraft()
		} else this.view.mark( this.editor )
		this.document.documentElement.style.setProperty( "--ground", this.picture.look.background )
		this.document.documentElement.classList.toggle( "ink-dark", this.picture.look.isLight )
		this.panel.sync( { editor: this.editor, look: this.picture.look, zoom: this.view.zoom, highlight: this.highlight() } )
		this.showRemark()
		this.markJoining()
		this.armKeyboard()
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
		 field — of the panel, or the remark — is being typed in, or words are
		 being written already. */
	armKeyboard(){
		if( !this.picture || this.textEditor.isOpen ) return
		const focus = this.editor.focus
		const box = focus && this.picture.arrangement.boxOf( focus )
		const active = this.document.activeElement
		const typing = active !== this.textField && active?.matches?.( "input, textarea, select" )
		if( !box || typing ){
			this.textEditor.disarm()
			return
		}
		const map = this.editor.map
		this.textEditor.arm( {
			face: this.picture.faces.of( focus ),
			box,
			ground: this.picture.look.background,
			done: result => this.finishEditing( focus.id, false, map, result ),
		} )
	}

	/* While words are written, the map is drawn with them as they stand, so
		 the node is as wide as what is typed (found in use, 2026-11-12: it kept
		 its placeholder's width); the map itself changes only when the writing
		 is kept. The node is always in the map drawn: a map is replaced only
		 after the field is settled, which ends the writing. */
	drawWhileWriting( topic, text ){
		this.picture = new MapPicture( this.editor.map, { measure: this.measure, placeholder: CENTRAL_PLACEHOLDER, writing: { topic, text } } )
		this.view.show( this.picture, this.editor )
		this.drawnWhileWriting = true
		this.textEditor.follow( this.picture.faces.of( topic ), this.picture.arrangement.boxOf( topic ) )
	}

	/* The colour the selection glows in: the one picked and kept, or the stylesheet's own. */
	showHighlight(){
		const kept = this.store.highlight()
		if( kept ) this.document.documentElement.style.setProperty( "--highlight", kept )
		else this.document.documentElement.style.removeProperty( "--highlight" )
	}

	highlight(){
		return getComputedStyle( this.document.documentElement ).getPropertyValue( "--highlight" ).trim()
	}

	/* Brings a node into sight, clear of the remark at the canvas's foot,
		 which would otherwise hide the node it belongs to. */
	reveal( topic ){
		const remark = this.element( "remark-area" )
		const below = remark.classList.contains( "hidden" ) ? 0 : this.stage.getBoundingClientRect().bottom - remark.getBoundingClientRect().top
		this.view.reveal( topic, { below } )
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
		if( !this.panel ) return
		this.element( "zoom-value" ).textContent = Math.round( this.view.zoom * 100 ) + "%"
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

	/* Opens the text field on a node, selected and in sight. A fresh node is one just added. */
	editTopic( id, { replace = null, fresh = false } = {} ){
		const topic = this.editor.map.find( id )
		if( !topic || !this.picture.arrangement.boxOf( topic ) ) return
		if( !this.editor.selection.includes( topic ) ) this.editor.select( topic )
		this.reveal( topic )
		const map = this.editor.map
		this.textEditor.open( {
			face: this.picture.faces.of( topic ),
			box: this.picture.arrangement.boxOf( topic ),
			ground: this.picture.look.background,
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
			if( how !== "child" || text.trim() === "" ) return
		} else {
			if( how === "cancel" ) return
			if( text !== topic.text ) this.editor.rename( topic, text )
		}
		if( how === "child" ) this.addAndEdit( () => this.editor.addChild() )
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

	/* The shell's columns, Alluvial's: HELP toggles the help, FULLSCREEN /
		 PANEL the controls, and FULLSCREEN folds the help away too, a full
		 screen being the map alone. Neither is part of the map. */
	wireTitleLine(){
		const shown = { help: false, panel: true }
		const sync = () => {
			this.element( "shell" ).className = "show-canvas" + ( shown.help ? "-help" : "" ) + ( shown.panel ? "-panel" : "" )
			this.element( "view-full" ).classList.toggle( "on", !shown.panel )
			this.element( "view-panel" ).classList.toggle( "on", shown.panel )
			this.element( "help-button" ).classList.toggle( "on", shown.help )
		}
		this.showPanel = () => { shown.panel = true; sync() }
		this.element( "help-button" ).addEventListener( "click", () => { shown.help = !shown.help; sync() } )
		this.element( "help" ).querySelector( ".sheet-close" ).addEventListener( "click", () => { shown.help = false; sync() } )
		this.element( "view" ).addEventListener( "click", () => {
			if( shown.panel ) Object.assign( shown, { panel: false, help: false } )
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
			deleteSelected: () => editor.deleteSelected(),
			edit: replace => { if( editor.focus ) this.editTopic( editor.focus.id, { replace } ) },
			fold: () => editor.toggleFold(),
			move: way => {
				const focus = editor.focus
				const next = focus && this.picture.arrangement.nearest( focus, way )
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
			escape: () => editor.isJoining ? this.stopJoining() : editor.clearSelection(),
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
			"level-fill": ( fill, gesture ) => editor.fillLevels( fill, gesture ),
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

new Page( document )
