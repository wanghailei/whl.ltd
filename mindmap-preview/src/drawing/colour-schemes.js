import { NODE, BRANCH, LINE } from "../model/style.js"
import { Theme } from "./themes.js"
import { colourStyleFor } from "./colour-styles.js"
import { contrast, inkOver, isLightColour, hexToLch, lchToHex, houseCell } from "./colour.js"

/* One factory is the only place that selects behaviour. Look asks a provider
	for styles and keeps precedence/contrast protection, not mode switches.
	Each provider owns its settings and its actual ground for this drawing. */
export function colourSchemeFor( settings, { canvas, appearance } ){
	if( settings.mode === "imported" ) return new Imported( settings, { canvas, appearance } )
	const background = canvas || ( appearance === "light" ? "#ffffff" : "#000000" )
	switch( settings.mode ){
		case "cascade": return new Cascade( settings, background )
		case "rainbow": return new Rainbow( settings, background )
		default: return new Uniform( settings, background )
	}
}

/* Providers return the same style kinds as the original theme provider.
	The branch's normal colour follows its node in Look; this is its fallback
	when that node has no visible fill. Lines use the canvas's readable ink. */
class Colours {
	constructor( background ){
		this.background = background
	}

	node( topic ){
		const fill = this.fill( topic )
		return NODE.style( { fill, border: fill } )
	}

	branch( topic ){
		return BRANCH.style( { colour: this.fill( topic ) } )
	}

	line(){
		return LINE.style( { colour: inkOver( this.background ) } )
	}
}

class Uniform extends Colours {
	constructor( { fill }, background ){
		super( background )
		this.colour = fill
	}

	fill(){
		return this.colour
	}
}

/* Compare quantised hexes, not ideal OKLCH values: a shade chosen at exactly
	3:1 can land below it when rounded to bytes. A small margin keeps generated
	fills themselves safe instead of hiding defects behind Look's fallback.
	Sampling a fixed hue at constant chroma (gamut-fit downwards only) also
	makes the deep limit finite and deterministic for any primary/Canvas pair. */
const SAFE_CONTRAST = 3.05

/* Behaviour (by eye): root, child and grandchild are distinguishable at a
	glance at normal size on white and black, with the chosen primary intact.
	Contrast interpolation squeezed blue's steps to nearly the same colour
	(#52). A tenth of perceptual lightness gives a visible step instead. */
const CASCADE_STEP = 0.10

class Cascade extends Colours {
	constructor( { primary }, background ){
		super( background )
		this.primary = primary
		const [ level, chroma, hue ] = hexToLch( primary ), ground = hexToLch( background )[ 0 ]
		const samples = Array.from( { length: 513 }, ( _, at ) => {
			const lightness = at / 512, colour = lchToHex( [ lightness, chroma, hue ] )
			return { lightness, colour, safe: contrast( colour, background ) >= SAFE_CONTRAST }
		} )
		const safe = samples.filter( shade => shade.safe )
		const nearest = safe.reduce( ( nearest, shade ) => Math.abs( shade.lightness - level ) < Math.abs( nearest.lightness - level ) ? shade : nearest )
		/* Stay in one continuous safe interval: a custom ground can separate
			two safe ranges with an invisible middle. Never jump across it. */
		let lower = samples.indexOf( nearest ), upper = lower
		while( lower > 0 && samples[ lower - 1 ].safe ) lower--
		while( upper < samples.length - 1 && samples[ upper + 1 ].safe ) upper++
		const primarySafe = contrast( primary, background ) >= SAFE_CONTRAST
		this.start = primarySafe ? level : nearest.lightness
		this.offset = primarySafe ? 0 : 1
		this.shades = samples.slice( lower, upper + 1 )
		if( primarySafe ) this.shades.push( { lightness: level, colour: primary } )
		const low = Math.min( this.start, samples[ lower ].lightness ), high = Math.max( this.start, samples[ upper ].lightness )
		const weaken = Math.sign( ground - this.start ) || 1
		const fadingRoom = weaken > 0 ? high - this.start : this.start - low
		const strengtheningRoom = weaken > 0 ? this.start - low : high - this.start
		/* Prefer fading only with room for two full steps; otherwise use the
			larger range. At either bound, settle rather than cycle or compress
			every preceding step. Unsafe primaries keep their exact root; their
			first descendant starts at the nearest safe shade. */
		this.direction = fadingRoom >= 2 * CASCADE_STEP || fadingRoom >= strengtheningRoom ? weaken : -weaken
		this.byDepth = new Map()
	}

	fill( topic ){
		if( topic.isRoot ) return this.primary
		if( !this.byDepth.has( topic.depth ) ){
			const wanted = this.start + this.direction * CASCADE_STEP * ( topic.depth - this.offset )
			const shade = this.shades.reduce( ( nearest, each ) => Math.abs( each.lightness - wanted ) < Math.abs( nearest.lightness - wanted ) ? each : nearest )
			this.byDepth.set( topic.depth, shade.colour )
		}
		return this.byDepth.get( topic.depth )
	}
}

/* Spectrum's fixed families and stride, using the house palette's original
	arithmetic. Only requested chroma varies; a gamut-clamped result is never
	stored in its place. There are two strengths, not another depth gradient. */
const COLUMNS = [ 0, 4, 8, 11, 14, 18, 21, 25 ]
const STRIDE = [ 0, 4, 2, 6, 1, 5, 3, 7 ]

class Rainbow extends Colours {
	constructor( { chroma }, background ){
		super( background )
		this.mains = COLUMNS.map( column => this.safeCell( column, isLightColour( background ) ? 6 : 12, chroma ) )
		this.deeper = COLUMNS.map( ( column, at ) => this.safeCell( column, 9, chroma, this.mains[ at ] ) )
	}

	fill( topic ){
		if( topic.isRoot ) return inkOver( this.background )
		const family = STRIDE[ topic.mainBranch.index % STRIDE.length ]
		return ( topic.depth === 1 ? this.mains : this.deeper )[ family ]
	}

	safeCell( column, rung, chroma, main = null ){
		/* Keep known house cells on white/black. Custom Canvas can put the
			nearest safe descendant rung on the opposite side and make it
			stronger (chroma 0 on #6e6e6e, found in audit). Bound it by the
			resolved main shade instead; retain that shade when no weaker house
			cell qualifies. Contrast with black orders actual WCAG luminance. */
		const rungs = Array.from( { length: 18 }, ( _, at ) => at ).sort( ( one, other ) => Math.abs( one - rung ) - Math.abs( other - rung ) || one - other )
		const ceiling = main ? contrast( main, this.background ) : Infinity, ground = contrast( this.background, "#000000" )
		for( const at of rungs ){
			const colour = houseCell( column, at, chroma ), strength = contrast( colour, this.background )
			const sameSide = !main || ( contrast( colour, "#000000" ) - ground ) * ( contrast( main, "#000000" ) - ground ) > 0
			if( strength >= SAFE_CONTRAST && strength <= ceiling && sameSide ) return colour
		}
		return main ?? inkOver( this.background )
	}
}

/* The unchanged pre-v3 generators are the independent compatibility path.
	A custom Canvas selected their light/dark appearance before v3 too. No
	generated fill is baked into node overrides during decoding or re-saving. */
class Imported {
	constructor( { theme, colourStyle }, { canvas, appearance } ){
		const legacy = Theme.for( theme )
		this.scheme = legacy.scheme( canvas ? ( isLightColour( canvas ) ? "light" : "dark" ) : appearance )
		this.colours = colourStyleFor( colourStyle || legacy.colourStyle )
		this.background = canvas || this.scheme.background
	}

	node( topic ){
		return this.scheme.node( topic, this.colours )
	}

	branch( topic ){
		return this.scheme.branch( topic, this.colours )
	}

	line(){
		return this.scheme.line()
	}
}
