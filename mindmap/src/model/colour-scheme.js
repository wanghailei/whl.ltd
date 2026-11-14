import { hexColour } from "./style.js"

export const COLOUR_SCHEMES = [ "uniform", "cascade", "rainbow" ]
/* Paired commands, not a dependency: later Canvas edits never replace the fill. */
export const UNIFORM_PRESETS = Object.freeze( [
	{ fill: "#000000", canvas: "#ffffff" },
	{ fill: "#ffffff", canvas: "#000000" },
	{ fill: "#616161", canvas: "#ffffff" },
	{ fill: "#0f62fe", canvas: "#ffffff" },
	{ fill: "#e8d8a0", canvas: "#000000" },
].map( Object.freeze ) )
export const LEGACY_THEMES = [ "mono", "spectrum", "ocean", "earth", "dusk" ]
export const LEGACY_COLOUR_STYLES = [ "level", "one", "rainbow" ]

/* A scheme owns only its active settings. Canvas and manual styles belong to
	MapStyle, not to a preset. This immutable value crosses file/default/history
	boundaries with the same validation. Imported is permanent file compatibility,
	not a fourth product choice; only the decoder creates it from old records. */
export class ColourScheme {
	constructor( values ){
		Object.assign( this, values )
		Object.freeze( this )
	}

	static from( values ){
		switch( values?.mode ){
			case "cascade": return new ColourScheme( { mode: "cascade", primary: hexColour( values.primary ) ?? "#0f62fe" } )
			case "rainbow": return new ColourScheme( { mode: "rainbow", chroma: validChroma( values.chroma ) ? values.chroma : 0.12 } )
			case "imported": return ColourScheme.legacy( values )
			default: return new ColourScheme( { mode: "uniform", fill: hexColour( values?.fill ) ?? "#000000" } )
		}
	}

	/* Old defaults held no theme, so they were always Mono, independently of
		the map open when Set as default was pressed. Empty style meant the
		theme's own colour style, not the default of the new scheme picker. */
	static legacy( { theme, colourStyle } = {} ){
		return new ColourScheme( {
			mode: "imported",
			theme: LEGACY_THEMES.includes( theme ) ? theme : "mono",
			colourStyle: LEGACY_COLOUR_STYLES.includes( colourStyle ) ? colourStyle : "",
		} )
	}

	get isDefaultUniform(){
		return this.mode === "uniform" && [ "#000000", "#ffffff" ].includes( this.fill )
	}

	toJSON(){
		return { ...this }
	}
}

export function validChroma( value ){
	return typeof value === "number" && Number.isFinite( value ) && value >= 0 && value <= 0.24
}
