import { NODE, BRANCH, LINE, hexColour } from "../model/style.js"

const KINDS = { node: NODE, branch: BRANCH, line: LINE }
/* The map's own colour settings and what each would keep of what is typed:
	a level's fill may be none, the canvas only a solid colour. */
const SETTINGS = {
	"level-fill": typed => NODE.accept( "fill", typed ),
	canvas: typed => hexColour( typed ),
	highlight: typed => hexColour( typed ),
}

/* A hex field of a style — data-style and data-property — keeps what the
	style's kind accepts, and changes that style of what is selected. */
class StyleHexField {
	constructor( field ){
		this.field = field
	}

	/* The colour it would keep, or undefined when refused. */
	accept( typed ){
		return KINDS[ this.field.dataset.style ].accept( this.field.dataset.property, typed )
	}

	apply( actions, value, gesture ){
		actions.style( this.field.dataset.style, { [ this.field.dataset.property ]: value }, gesture )
	}
}

/* A hex field of one of the map's colour settings — data-setting — keeps
	what the setting accepts; left empty, it takes the setting away. */
class SettingHexField {
	constructor( field ){
		this.name = field.dataset.setting
	}

	/* The colour it would keep, null for none, or undefined when refused. */
	accept( typed ){
		return typed === "" ? null : SETTINGS[ this.name ]( typed )
	}

	apply( actions, value, gesture ){
		actions.setting( this.name, value, gesture )
	}
}

function hexFieldFor( field ){
	return field.dataset.setting ? new SettingHexField( field ) : new StyleHexField( field )
}

/* The control panel: its controls wired to the page's actions by what their
	data attributes say, and shown, after every change, what is selected.

	A control names what it changes — data-style and data-property for a
	style, data-map for the map, data-setting for one of the map's colour
	settings, data-command for a press — so the wiring is one walk over the markup and no control is
	wired by hand. A slider or a colour dragged is one gesture, which undo
	takes back as one step. */
export class Panel {
	constructor( { document, actions, picker, language } ){
		this.document = document
		this.actions = actions
		this.picker = picker
		this.language = language
		/* Each drag of a slider, and each opening of the picker, is a gesture of its own. */
		this.gestures = 0
		this.wireCommands()
		this.wireChoices()
		this.wireFields()
		this.wireLine()
	}

	element( id ){
		return this.document.getElementById( id )
	}

	all( selector ){
		return [ ...this.document.querySelectorAll( selector ) ]
	}

	wireCommands(){
		for( const button of this.all( "[data-command]" ) ){
			button.addEventListener( "click", () => this.actions.command( button.dataset.command ) )
		}
	}

	/* A row of words, one of which is live: a style's choice, the layout, the theme. */
	wireChoices(){
		for( const row of this.all( ".group[data-style]" ) ){
			row.addEventListener( "click", event => {
				const button = event.target.closest( "[data-value]" )
				if( button ) this.actions.style( row.dataset.style, { [ row.dataset.property ]: button.dataset.value } )
			} )
		}
		for( const row of this.all( "[data-map]" ) ){
			row.addEventListener( "click", event => {
				const button = event.target.closest( "[data-value]" )
				if( button ) this.actions.map( row.dataset.map, button.dataset.value )
			} )
		}
	}

	/* Hex fields with their chips, and sliders with their readouts. */
	wireFields(){
		for( const field of this.all( "input.hex[data-style], input.hex[data-setting]" ) ){
			field.addEventListener( "change", () => this.takeHex( field, field.value ) )
		}
		for( const chip of this.all( ".chip[data-for]" ) ){
			const field = this.element( chip.dataset.for )
			const target = { id: field.id, get: () => field.value, set: hex => this.takeHex( field, hex, "picker " + field.id + " " + this.gestures ) }
			chip.addEventListener( "click", () => {
				this.gestures += 1
				this.picker.toggle( target, chip )
			} )
		}
		for( const slider of this.all( "input[type=range][data-style]" ) ){
			slider.addEventListener( "input", () => {
				this.shows( slider )
				this.actions.style( slider.dataset.style, { [ slider.dataset.property ]: Number( slider.value ) }, "slide " + slider.id + " " + this.gestures )
			} )
			slider.addEventListener( "change", () => { this.gestures += 1 } )
		}
	}

	/* A hex as typed or picked, as the field would keep it: refused if it is
		 not a colour — none only for a fill — said in a notice, and the field
		 put back. A setting's field left empty takes the setting away. */
	takeHex( field, typed, gesture = null ){
		const hexField = hexFieldFor( field )
		const value = hexField.accept( typed.trim() )
		if( value === undefined ){
			/* Let go of the field, or the panel leaves a field being typed in alone and cannot put it back. */
			field.blur()
			this.actions.refuseColour( typed )
			return
		}
		field.value = value ?? ""
		hexField.apply( this.actions, value, gesture )
	}

	wireLine(){
		const label = this.element( "line-label" )
		label.addEventListener( "change", () => this.actions.label( label.value ) )
		const arrows = this.document.querySelector( "[data-line-arrows]" )
		arrows.addEventListener( "click", event => {
			const button = event.target.closest( "[data-value]" )
			if( button ) this.actions.arrows( button.dataset.value )
		} )
	}

	// ── Showing what is selected ────────────────────────────────────

	/* Every control set to the look of what is selected — its look as drawn,
		 theme and all, so the panel says what the eye sees. */
	sync( { editor, look, zoom, highlight } ){
		const map = editor.map
		const topics = editor.selectedTopics
		const focus = topics[ 0 ]
		const line = editor.selectedLine
		this.choose( "[data-map=layout]", map.layout )
		this.choose( "[data-map=theme]", map.theme )
		this.showHex( "canvas-colour", look.background )
		this.showHex( "highlight-colour", highlight )
		this.element( "appearance-light" ).classList.toggle( "on", look.appearance === "light" )
		this.element( "appearance-dark" ).classList.toggle( "on", look.appearance === "dark" )
		this.element( "node-panel" ).classList.toggle( "hidden", !focus )
		this.element( "branch-panel" ).classList.toggle( "hidden", !topics.some( topic => !topic.isRoot ) )
		this.element( "line-rows" ).classList.toggle( "hidden", !line )
		if( focus ) this.showNode( focus, topics, look, map )
		const branched = topics.find( topic => !topic.isRoot )
		if( branched ) this.showStyle( "branch", look.branch( branched ) )
		if( line ) this.showLine( line, look )
		this.element( "zoom-value" ).textContent = Math.round( zoom * 100 ) + "%"
	}

	/* The level's fill shows what has been set for the focus's level, or nothing. */
	showNode( focus, topics, look, map ){
		this.element( "node-heading" ).textContent = this.language.say( "nodeHeading", { selected: topics.length } )
		this.showStyle( "node", look.node( focus ) )
		this.showHex( "level-fill", map.style.levels.fillAt( focus.depth ) ?? "" )
	}

	showLine( line, look ){
		this.showStyle( "line", look.line( line ) )
		this.fill( "line-label", line.label )
		this.choose( "[data-line-arrows]", line.arrows )
	}

	/* Every control of one kind of style, set from the style. */
	showStyle( kind, style ){
		for( const row of this.all( `.group[data-style=${ kind }]` ) ) this.choose( row, style.get( row.dataset.property ) )
		for( const field of this.all( `input[data-style=${ kind }]` ) ){
			const value = style.get( field.dataset.property )
			if( field.type === "range" ){
				field.value = String( value )
				this.shows( field )
			} else this.showHex( field.id, value )
		}
	}

	/* A hex field and its chip; a chip with no colour, or none, is empty. */
	showHex( id, value ){
		this.fill( id, value )
		const chip = this.document.querySelector( `.chip[data-for="${ id }"]` )
		if( chip ) chip.style.background = value && value !== "none" ? value : "transparent"
	}

	/* A field is left alone while it is being typed in. */
	fill( id, value ){
		const field = this.element( id )
		if( this.document.activeElement !== field ) field.value = value
	}

	choose( row, value ){
		const group = typeof row === "string" ? this.document.querySelector( row ) : row
		for( const button of group.querySelectorAll( "[data-value]" ) ) button.classList.toggle( "on", button.dataset.value === value )
	}

	shows( slider ){
		const readout = this.document.querySelector( `[data-shows="${ slider.id }"]` )
		if( readout ) readout.textContent = slider.value
	}
}
