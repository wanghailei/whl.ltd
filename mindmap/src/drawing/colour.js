/* Colour maths, the house's: hex both ways, the sRGB ↔ OKLab ↔ OKLCH
	conversions the picker runs on, and the cells of the house palette.

	Ported from WHL Generative Alluvial (alluvial.js), which took them from
	WHL Colours Gradient, so a colour picked or rolled here is the same hex as
	there. Nothing on the map is interpolated: the perceptual space is for
	choosing, never for drawing. */

export function hexToRgb( hex ){
	const clean = String( hex ).trim().replace( /^#/, "" )
	const full = clean.length === 3 ? clean[ 0 ] + clean[ 0 ] + clean[ 1 ] + clean[ 1 ] + clean[ 2 ] + clean[ 2 ] : clean
	if( !/^[0-9a-fA-F]{6}$/.test( full ) ) return null
	return [ parseInt( full.slice( 0, 2 ), 16 ), parseInt( full.slice( 2, 4 ), 16 ), parseInt( full.slice( 4, 6 ), 16 ) ]
}

export function rgbToHex( red, green, blue ){
	const byte = value => Math.max( 0, Math.min( 255, Math.round( value ) ) ).toString( 16 ).padStart( 2, "0" )
	return "#" + byte( red ) + byte( green ) + byte( blue )
}

/* The two inks words are written in when nothing has chosen their colour. */
const INKS = [ "#111111", "#ffffff" ]

/* The contrast of two colours as WCAG measures it, from 1 to 21: words need
	4.5 to read, a line 3 to be seen. */
export function contrast( first, second ){
	const [ high, low ] = [ luminance( first ), luminance( second ) ].sort( ( one, other ) => other - one )
	return ( high + 0.05 ) / ( low + 0.05 )
}

/* The ink that reads over a colour: whichever of near-black and white has
	the greater contrast with it. A threshold on plain lightness chose white
	over mid-greys that black reads far better on (found in use, 2026-11-12). */
export function inkOver( hex ){
	return contrast( INKS[ 0 ], hex ) >= contrast( INKS[ 1 ], hex ) ? INKS[ 0 ] : INKS[ 1 ]
}

/* Whether a colour is light: black reads better on it than white. */
export function isLightColour( hex ){
	return inkOver( hex ) === INKS[ 0 ]
}

/* Relative luminance, WCAG's: the channels made linear, then weighted. */
function luminance( hex ){
	const rgb = ( hexToRgb( hex ) || [ 0, 0, 0 ] ).map( channel => srgbToLinear( channel / 255 ) )
	return 0.2126 * rgb[ 0 ] + 0.7152 * rgb[ 1 ] + 0.0722 * rgb[ 2 ]
}

// ── OKLab and OKLCH, Björn Ottosson's matrices, on 0…1 channels ──────────

export function clamp01( value ){ return Math.max( 0, Math.min( 1, value ) ) }
function srgbToLinear( channel ){ return channel <= 0.04045 ? channel / 12.92 : Math.pow( ( channel + 0.055 ) / 1.055, 2.4 ) }
function linearToSrgb( channel ){ return channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow( channel, 1 / 2.4 ) - 0.055 }

function rgbToOklab( rgb ){
	const red = srgbToLinear( rgb[ 0 ] ), green = srgbToLinear( rgb[ 1 ] ), blue = srgbToLinear( rgb[ 2 ] )
	const long = Math.cbrt( 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue )
	const middle = Math.cbrt( 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue )
	const short = Math.cbrt( 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue )
	return [
		0.2104542553 * long + 0.7936177850 * middle - 0.0040720468 * short,
		1.9779984951 * long - 2.4285922050 * middle + 0.4505937099 * short,
		0.0259040371 * long + 0.7827717662 * middle - 0.8086757660 * short,
	]
}

export function oklabToRgb( lab ){
	const long = Math.pow( lab[ 0 ] + 0.3963377774 * lab[ 1 ] + 0.2158037573 * lab[ 2 ], 3 )
	const middle = Math.pow( lab[ 0 ] - 0.1055613458 * lab[ 1 ] - 0.0638541728 * lab[ 2 ], 3 )
	const short = Math.pow( lab[ 0 ] - 0.0894841775 * lab[ 1 ] - 1.2914855480 * lab[ 2 ], 3 )
	return [
		linearToSrgb( 4.0767416621 * long - 3.3077115913 * middle + 0.2309699292 * short ),
		linearToSrgb( -1.2684380046 * long + 2.6097574011 * middle - 0.3413193965 * short ),
		linearToSrgb( -0.0041960863 * long - 0.7034186147 * middle + 1.7076147010 * short ),
	]
}

export function oklchToOklab( lch ){
	const radians = lch[ 2 ] * Math.PI / 180
	return [ lch[ 0 ], lch[ 1 ] * Math.cos( radians ), lch[ 1 ] * Math.sin( radians ) ]
}

function inGamut( rgb ){ return rgb.every( value => value >= -0.0008 && value <= 1.0008 ) }

/* The highest chroma sRGB can hold at this lightness and hue: the right edge
	of the picker's field, so every point in it is a colour the map can carry. */
export function chromaEdge( lightnessValue, hue ){
	let low = 0, high = 0.44
	for( let step = 0; step < 18; step++ ){
		const middle = ( low + high ) / 2
		if( inGamut( oklabToRgb( oklchToOklab( [ lightnessValue, middle, hue ] ) ) ) ) low = middle
		else high = middle
	}
	return low
}

/* Out of sRGB: hold lightness and hue, bisect chroma down until it fits. */
export function lchToHex( lch ){
	const level = clamp01( lch[ 0 ] )
	let low = 0, high = lch[ 1 ]
	let rgb = oklabToRgb( oklchToOklab( [ level, high, lch[ 2 ] ] ) )
	if( !inGamut( rgb ) ){
		for( let step = 0; step < 22; step++ ){
			const middle = ( low + high ) / 2
			if( inGamut( oklabToRgb( oklchToOklab( [ level, middle, lch[ 2 ] ] ) ) ) ) low = middle
			else high = middle
		}
		rgb = oklabToRgb( oklchToOklab( [ level, low, lch[ 2 ] ] ) )
	}
	return rgbToHex( clamp01( rgb[ 0 ] ) * 255, clamp01( rgb[ 1 ] ) * 255, clamp01( rgb[ 2 ] ) * 255 )
}

export function hexToLch( hex ){
	const rgb = hexToRgb( hex ) || [ 0, 0, 0 ]
	const lab = rgbToOklab( [ rgb[ 0 ] / 255, rgb[ 1 ] / 255, rgb[ 2 ] / 255 ] )
	return [ lab[ 0 ], Math.hypot( lab[ 1 ], lab[ 2 ] ), ( Math.atan2( lab[ 2 ], lab[ 1 ] ) * 180 / Math.PI + 360 ) % 360 ]
}

// ── The house palette ───────────────────────────────────────────────

/* The default swatch of the WHL Colours Palette tool, built by that tool's own
	arithmetic so that a cell is the same hex in both: 28 hue families stepping
	round the wheel from 25°, 18 lightness rungs evenly between black and
	white, chroma 0.12 breathing with lightness (full at the mid-tones, a fifth
	at the ends) and, where the sRGB edge is nearer, bisected down to it. Kept
	apart from the picker's helpers above, as in Alluvial: those fit chroma by
	their own edge-finder and could land a digit off the swatch's hex. */
const HOUSE = { hueStart: 25, chroma: 0.12, hues: 28, rungs: 18 }

export function houseCell( column, rung ){
	const level = ( rung + 1 ) / ( HOUSE.rungs + 1 )
	const hue = ( HOUSE.hueStart + column * 360 / HOUSE.hues ) % 360
	const wanted = HOUSE.chroma * ( 0.2 + 0.8 * Math.sin( Math.PI * level ) )
	const linear = function( chroma ){
		const a = chroma * Math.cos( hue * Math.PI / 180 ), b = chroma * Math.sin( hue * Math.PI / 180 )
		const long = Math.pow( level + 0.3963377774 * a + 0.2158037573 * b, 3 )
		const middle = Math.pow( level - 0.1055613458 * a - 0.0638541728 * b, 3 )
		const short = Math.pow( level - 0.0894841775 * a - 1.291485548 * b, 3 )
		return [ 4.0767416621 * long - 3.3077115913 * middle + 0.2309699292 * short,
			-1.2684380046 * long + 2.6097574011 * middle - 0.3413193965 * short,
			-0.0041960863 * long - 0.7034186147 * middle + 1.707614701 * short ]
	}
	const inside = rgb => rgb.every( channel => channel >= -0.0001 && channel <= 1.0001 )
	let chroma = wanted
	if( !inside( linear( wanted ) ) ){
		let low = 0, high = wanted
		for( let step = 0; step < 22; step++ ){
			const middle = ( low + high ) / 2
			if( inside( linear( middle ) ) ) low = middle
			else high = middle
		}
		chroma = low
	}
	const rgb = linear( chroma ).map( channel => clamp01( linearToSrgb( clamp01( channel ) ) ) * 255 )
	return rgbToHex( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] )
}
