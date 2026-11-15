import { hexColour } from "./style.js"
import { Theme } from "../drawing/themes.js"
import { hexToLch, isLightColour } from "../drawing/colour.js"

export const COLOUR_SCHEMES = [ "uniform", "cascade", "rainbow" ]
/* Node colours only. Null is black/white ink for the current appearance. */
export const UNIFORM_PRESETS = Object.freeze( [
	{ fill: null },
	{ fill: "#616161" },
	{ fill: "#0f62fe" },
	{ fill: "#e8d8a0" },
].map( Object.freeze ) )
export const LEGACY_THEMES = [ "mono", "spectrum", "ocean", "earth", "dusk" ]
export const LEGACY_COLOUR_STYLES = [ "level", "one", "rainbow" ]

/* A scheme owns only its active settings. Canvas and manual styles belong to
	MapStyle, not to a preset. This immutable value crosses file/default/history
	boundaries with the same validation. Older generated colours are reduced
	to the nearest Uniform preset at decoding, with no extra state. */
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

	/* Use the old scheme's central colour, not a manual node override.
		OKLab distance chooses the visually nearest preset; the old theme
		and colour style never survive in the decoded value. */
	static legacy( { theme, appearance = "dark", canvas } = {} ){
		const scheme = Theme.for( theme ).scheme( canvas ? ( isLightColour( canvas ) ? "light" : "dark" ) : appearance )
		const source = lab( scheme.root )
		const distance = fill => lab( fill ).reduce( ( sum, value, at ) => sum + ( value - source[ at ] ) ** 2, 0 )
		const fills = [ "#000000", "#ffffff", ...UNIFORM_PRESETS.map( preset => preset.fill ).filter( Boolean ) ]
		const fill = fills.reduce( ( best, colour ) => distance( colour ) < distance( best ) ? colour : best )
		return new ColourScheme( { mode: "uniform", fill } )
	}

	get isDefaultUniform(){
		return this.mode === "uniform" && [ "#000000", "#ffffff" ].includes( this.fill )
	}

	toJSON(){
		return { ...this }
	}
}

function lab( hex ){
	const [ lightness, chroma, hue ] = hexToLch( hex ), radians = hue * Math.PI / 180
	return [ lightness, chroma * Math.cos( radians ), chroma * Math.sin( radians ) ]
}

export function validChroma( value ){
	return typeof value === "number" && Number.isFinite( value ) && value >= 0 && value <= 0.24
}
