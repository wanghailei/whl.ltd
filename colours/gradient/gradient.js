/*
	WHL Colours Gradient — drawing core, v0.59.0

	A real source file, edited by hand like any other. It holds sections 1 to 5
	of the tool — colour maths, state, geometry, SVG, palette — plus the point
	sampling and the dice. The tool next door, whl_colours_gradient.html, loads
	this file and keeps only its interface: render, colour picker, helpers,
	wiring. There is one copy of the drawing code and this is it.

	Why the file exists: other WHL sites wanted a WHL gradient behind their
	pages, and the only way to get one was to load the whole tool — the full UI,
	fonts and picker included — into a hidden iframe and reach through it. This
	is the drawing layer alone, and it needs no iframe.

	It is a classic script, not a module: <script src="gradient.js"></script>
	and the API arrives on window.WHLGradient —

		WHLGradient.state                 the live mutable state object; write to
		                                  it directly, then draw
		WHLGradient.roll()                the tool's IS LIFE A RANDOM GRADIENT?
		                                  dice — colours, type, geometry, pattern,
		                                  grain, easing — state only, no redraw
		WHLGradient.buildSvg( mode, W, H, pxW, pxH, crop )
		                                  the SVG, as a string. mode is "screen"
		                                  (100% width and height, viewBox W×H),
		                                  "file" (W×H attributes) or "raster"
		                                  (pxW×pxH attributes)
		WHLGradient.colourAtPoint( x, y, W, H )
		                                  what the render actually shows at that
		                                  point, pattern included — for judging ink
		WHLGradient.hexToRgb, .rgbToOklab the pair that turns that hex into a
		                                  lightness you can threshold on

	The whole surface is listed at the foot of this file. Everything sits inside
	one closure and only WHLGradient reaches the page, because a bare top-level
	`const state` would break any host page that has a `state` of its own.

	Licence: © 2026 Wanted Hacker Limited. Personal and non-commercial use is
	free, without limitation. Commercial use of an image produced with this
	tool requires a one-time licence fee of US$1 per image, paid via
	paypal.me/wanghailei; once paid, that image may be used commercially
	without limit — any medium, any duration, no attribution required. Your
	PayPal receipt is your proof of licence. The source is visible but remains
	copyrighted: do not copy, modify, redistribute or rehost it without
	written permission. Contact: wanghailei@gmail.com
*/

;( function(){
"use strict"

/* ══════════════════════════════════════════════════════════
	 1. Colour maths — sRGB / OKLab / OKLCh
	 ══════════════════════════════════════════════════════════ */
const clamp01 = function( x ){ return Math.min( 1, Math.max( 0, x ) ) }

function hexToRgb( hex ){
	if( typeof hex !== "string" ) return null
	let h = hex.replace( "#","" ).trim()
	if( h.length === 3 ) h = h.split( "" ).map( function( c ){ return c + c } ).join( "" )
	if( !/^[0-9a-fA-F]{6}$/.test( h ) ) return null
	const n = parseInt( h,16 )
	return [ ( ( n >> 16 ) & 255 ) / 255, ( ( n >> 8 ) & 255 ) / 255, ( n & 255 ) / 255 ]
}
function rgbToHex( rgb ){
	const f = function( v ){ return Math.round( clamp01( v ) * 255 ).toString( 16 ).padStart( 2,"0" ) }
	return "#" + f( rgb[0] ) + f( rgb[1] ) + f( rgb[2] )
}
function srgbToLinear( c ){ return c <= 0.04045 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 ) }
function linearToSrgb( c ){ return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow( c,1 / 2.4 ) - 0.055 }

function rgbToOklab( rgb ){
	const lr = srgbToLinear( rgb[0] ), lg = srgbToLinear( rgb[1] ), lb = srgbToLinear( rgb[2] )
	const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
	const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
	const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
	const l_ = Math.cbrt( l ), m_ = Math.cbrt( m ), s_ = Math.cbrt( s )
	return [
		0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
		1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
		0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
	]
}
function oklabToRgb( lab ){
	const l_ = lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]
	const m_ = lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]
	const s_ = lab[0] - 0.0894841775 * lab[1] - 1.2914855480 * lab[2]
	const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_
	return [
		linearToSrgb( 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s ),
		linearToSrgb( -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s ),
		linearToSrgb( -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s )
	]
}
function oklabToOklch( lab ){
	return [ lab[0], Math.hypot( lab[1],lab[2] ), ( Math.atan2( lab[2],lab[1] ) * 180 / Math.PI + 360 ) % 360 ]
}
function oklchToOklab( lch ){
	const r = lch[2] * Math.PI / 180
	return [ lch[0], lch[1] * Math.cos( r ), lch[1] * Math.sin( r ) ]
}
function inGamut( rgb ){ return rgb.every( function( v ){ return v >= -0.0008 && v <= 1.0008 } ) }

/* Out of sRGB: hold lightness and hue, bisect chroma down until it fits */
function gamutFit( lch ){
	const L = clamp01( lch[0] )
	let rgb = oklabToRgb( oklchToOklab( [ L, lch[1], lch[2] ] ) )
	if( inGamut( rgb ) ) return rgb.map( clamp01 )
	let lo = 0, hi = lch[1]
	for( let i = 0;i < 22;i++ ){
		const mid = ( lo + hi ) / 2
		rgb = oklabToRgb( oklchToOklab( [ L, mid, lch[2] ] ) )
		if( inGamut( rgb ) ) lo = mid; else hi = mid
	}
	return oklabToRgb( oklchToOklab( [ L, lo, lch[2] ] ) ).map( clamp01 )
}
function lchToHex( lch ){ return rgbToHex( gamutFit( lch ) ) }
function hexToLch( hex ){ return oklabToOklch( rgbToOklab( hexToRgb( hex ) || [ 0,0,0 ] ) ) }

function mixHex( hexA, hexB, t, space ){
	const A = hexToRgb( hexA ) || [ 0,0,0 ]
	const B = hexToRgb( hexB ) || [ 0,0,0 ]
	if( space === "srgb" ) return rgbToHex( A.map( function( v,i ){ return v + ( B[i] - v ) * t } ) )
	const la = rgbToOklab( A ), lb = rgbToOklab( B )
	if( space === "oklab" ){
		const m = la.map( function( v,i ){ return v + ( lb[i] - v ) * t } )
		return lchToHex( oklabToOklch( m ) )
	}
	/* OKLCh: shortest hue path; an achromatic end inherits the other's hue,
		 so greys do not spin the wheel on their way across */
	const ca = oklabToOklch( la ), cb = oklabToOklch( lb )
	let H1 = ca[2], H2 = cb[2]
	if( ca[1] < 2e-3 ) H1 = H2
	if( cb[1] < 2e-3 ) H2 = H1
	const dh = ( ( H2 - H1 + 540 ) % 360 ) - 180
	return lchToHex( [ ca[0] + ( cb[0] - ca[0] ) * t, ca[1] + ( cb[1] - ca[1] ) * t, H1 + dh * t ] )
}
function applyEase( t, mode ){
	if( mode === "smooth" ) return t * t * ( 3 - 2 * t )
	if( mode === "start" )  return t * t
	if( mode === "end" )    return 1 - ( 1 - t ) * ( 1 - t )
	return t
}
function mulberry32( a ){
	return function(){
		a |= 0; a = ( a + 0x6D2B79F5 ) | 0
		let t = Math.imul( a ^ ( a >>> 15 ), 1 | a )
		t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296
	}
}

/* ══════════════════════════════════════════════════════════
	 2. State
	 ══════════════════════════════════════════════════════════ */
/* Proportions, not sizes. "Window" follows the browser, which is how the
	 tool is actually used; the rest are the shapes that keep coming up. */
const RATIOS = [
	{ label:"Window",  cn:"視窗", r:0 },
	{ label:"16 : 10", r:16 / 10 },
	{ label:"16 : 9",  r:16 / 9 },
	{ label:"2 : 1",   r:2 },
	{ label:"3 : 1",   r:3 },
	{ label:"4 : 1",   r:4 }
]
/* How colours travel between stops. This is interpolation maths, not a colour profile —
	 every option still writes sRGB into the file. */
const SPACES = [
	{ k:"oklch", label:"Vivid · OKLCh", cn:"鮮明 · OKLCh" },
	{ k:"oklab", label:"Even · OKLab", cn:"均勻 · OKLab" },
	{ k:"srgb",  label:"Legacy · sRGB", cn:"傳統 · sRGB" }
]
const EASES = [
	{ k:"smooth", label:"Smooth", cn:"平滑" },
	{ k:"linear", label:"Even", cn:"勻速" },
	{ k:"start",  label:"Weight start", cn:"重頭" },
	{ k:"end",    label:"Weight end", cn:"重尾" }
]
const SMOOTH = 24   /* baked stops per segment — fixed, not a user knob */

/* The picker's swatch library — sets of candidate colours: { name, colours,
	 rows }, where colours is the flat pool and rows carries hue-family
	 grouping when the source has it (one family per row, dark to light;
	 black and white close the shelf as their own row). Seeded with the
	 default set — a baked copy of swatch/default.json, read through
	 parseSwatch and kept identical by the regress check through that SAME
	 parser, because a file:// page cannot fetch a neighbouring file at run
	 time — a different wall from the one a CSS subresource walks through
	 (§4). Pasted and dropped sets
	 join for the session only — no browser storage, by constraint. The
	 same name replaces its set. The constant line is generated — do not
	 hand-edit; change swatch/default.json and re-bake. */
const DEFAULT_SWATCH = [["#030000","#0f0000","#220001","#360104","#49080a","#5c1314","#6f201f","#812d2b","#933c38","#a54b46","#b55c56","#c46d67","#d27f79","#df928c","#eba6a0","#f6bab4","#ffcfca","#ffe7e5"],["#030000","#0e0100","#1f0300","#310800","#460f00","#5b1700","#6e2309","#803016","#923f25","#a34e34","#b45f45","#c37057","#d1826a","#de957e","#eaa894","#f4bcab","#fed1c2","#ffe8e1"],["#030000","#0b0200","#1b0600","#2c0f00","#3e1800","#522200","#662d00","#7b3700","#8f4408","#a0531f","#b06333","#bf7447","#cd865c","#da9873","#e6ab8a","#f1bfa3","#fbd3bc","#ffe9dc"],["#030000","#090200","#180900","#271300","#391d00","#4b2800","#5d3400","#714000","#854c00","#9a5900","#aa6921","#b97a3a","#c78b51","#d49d69","#e1af82","#ecc29c","#f7d5b7","#ffe9d6"],["#020000","#080300","#150a00","#241500","#342000","#452c00","#563900","#684600","#7b5300","#8e6000","#a16f0f","#b07f2f","#be904a","#cca263","#d9b47d","#e6c698","#f2d8b4","#fdebd1"],["#020000","#060300","#120c00","#201700","#2f2300","#3f3000","#4f3d00","#604a00","#725800","#836700","#967505","#a5862c","#b39647","#c2a761","#d0b87c","#ddca97","#ebdbb3","#f8edd0"],["#010000","#050400","#100d00","#1d1900","#2a2500","#393300","#484000","#574e00","#675d00","#786c00","#887c0f","#978c30","#a69c4a","#b5ac64","#c5bd7e","#d4ce99","#e3deb5","#f2efd1"],["#010100","#040400","#0c0e00","#181b00","#242800","#313600","#3e4400","#4c5300","#5a6200","#697200","#788222","#88913a","#97a152","#a8b16a","#b8c183","#c9d19d","#dbe1b8","#ecf1d3"],["#000100","#020500","#081000","#111d00","#1b2b00","#253900","#304800","#3c5800","#486808","#577720","#668734","#769648","#87a65e","#99b574","#abc58b","#bed4a4","#d2e4bd","#e6f3d7"],["#000100","#000600","#011200","#021f00","#052e00","#093d00","#154d09","#225c17","#316c26","#407b36","#518b46","#629a58","#75aa6c","#89b980","#9ec896","#b3d7ac","#c9e6c4","#e0f5dc"],["#000100","#000601","#001205","#001f0c","#002e14","#003d1d","#004d26","#005d30","#026e3a","#207e49","#378e59","#4d9d69","#63ac7b","#79bc8e","#91caa2","#a9d9b6","#c1e8cc","#daf6e2"],["#000100","#000603","#00110a","#001f14","#002d1f","#003c2a","#004c36","#005c43","#006d4f","#007e5d","#0c8f6a","#349f7a","#50ae8b","#6bbd9d","#85ccaf","#a0dac1","#bbe9d4","#d6f7e8"],["#000101","#000504","#00110d","#001e19","#002c25","#003b32","#004b40","#005b4e","#006b5d","#007c6c","#008e7b","#139f8b","#3faf9b","#5fbeab","#7cccbc","#99dbcc","#b5e9dd","#d2f7ee"],["#000101","#000505","#001010","#001e1d","#002c2a","#003a39","#004a48","#005a58","#006a68","#007b78","#008c89","#009e9b","#33aeaa","#57bdb9","#77ccc8","#95dad7","#b3e9e6","#d0f7f4"],["#000101","#000506","#001012","#001d20","#002b2f","#00393f","#00494f","#005860","#006971","#007983","#008a96","#009ca9","#32acb8","#56bbc6","#76cad4","#94d9e1","#b2e8ee","#d0f6fa"],["#000101","#000508","#001015","#001c24","#002a34","#003845","#004756","#005769","#00677b","#00778f","#0088a3","#0a99b6","#3ca9c4","#5cb8d1","#7ac8de","#97d7ea","#b4e6f5","#d2f5ff"],["#000102","#000509","#000f18","#001c28","#00293a","#00374c","#00465f","#005573","#006587","#00759c","#0085b2","#2e95c1","#4ba5ce","#66b5db","#81c5e6","#9dd4f1","#b8e4fb","#daf2ff"],["#000003","#00040c","#000e1c","#001a2e","#002741","#003556","#00436b","#005281","#006197","#1771aa","#3080ba","#4690c8","#5da1d5","#74b1e1","#8cc1ec","#a5d1f6","#bee1ff","#dff0ff"],["#000006","#000311","#000c24","#001739","#002350","#043065","#0f3e79","#1c4c8c","#2a5c9e","#396bae","#497bbe","#5b8bcc","#6e9cd9","#83ace5","#98bdf0","#aecef9","#c7deff","#e3efff"],["#000006","#010217","#04082a","#0a133e","#131f52","#1d2b66","#28397a","#34478d","#41569f","#4f65b0","#5e75bf","#6e86ce","#7f96db","#92a7e6","#a5b9f1","#b9cafa","#cfdcff","#e7edff"],["#010006","#030116","#0a0529","#150f3c","#201b50","#2c2764","#383478","#45428a","#53519c","#6160ad","#7070bd","#7f80cb","#8f91d9","#a0a3e4","#b1b4ef","#c3c6f8","#d6d9ff","#eaecff"],["#010005","#060014","#100427","#1d0c39","#29174d","#372360","#452f73","#533d85","#624b97","#705ba8","#7f6bb8","#8f7bc6","#9e8cd3","#ae9ee0","#beb0eb","#cec3f5","#ded6fe","#eeeaff"],["#010004","#080012","#150223","#230935","#311347","#401f5a","#502b6c","#5f387e","#6e478f","#7e56a0","#8d66af","#9c76be","#ab88cb","#ba9ad8","#c9ade4","#d8c0ef","#e6d3f9","#f4e8ff"],["#020003","#0b000e","#19011e","#28062f","#381040","#481b51","#592763","#693474","#794284","#895195","#9961a4","#a872b3","#b784c1","#c596cf","#d3a9db","#e0bde7","#eed1f3","#fae5fe"],["#020002","#0c000a","#1c0019","#2d0428","#3e0d37","#4f1847","#602458","#723068","#823f78","#934e87","#a35e97","#b26fa6","#c181b5","#ce93c3","#dca7d1","#e8bbdf","#f4cfec","#ffe4f9"],["#020001","#0e0006","#1f0013","#310220","#420a2e","#54153c","#66214b","#782e5a","#8a3c69","#9b4b79","#ab5b88","#ba6c97","#c87fa7","#d691b6","#e2a5c5","#eeb9d4","#f9cee4","#ffe5f2"],["#030000","#0e0004","#20000c","#330117","#460723","#581330","#6b1f3e","#7d2c4c","#8f3a5a","#a04969","#b05a78","#c06b88","#ce7d98","#db91a8","#e7a4b9","#f2b9ca","#fccedb","#ffe6ed"],["#030000","#0f0002","#210006","#35000e","#480718","#5b1223","#6e1e2f","#802c3c","#923a49","#a44958","#b45a67","#c36b77","#d17e88","#de919a","#eaa5ac","#f5b9bf","#ffced2","#ffe7e9"],["#000000","#ffffff"]]
const swatches = [ { name:"default", colours:DEFAULT_SWATCH.flat(), rows:DEFAULT_SWATCH } ]

const state = {
	colours:[ "#e8e1d4" ],
	positions:[ 0.5 ],
	slots:7,
	type:"linear", angle:160, cx:50, cy:35, radius:78, seamless:false,
	blobSize:0.55, seed:11, blobSoft:0.30,
	/* counts are per height-span; the old across-width defaults 24/900 at a
		 ~1.7 ratio correspond to about these */
	grid:false, gridN:14, gridPattern:"plaid",
	space:"oklch", ease:"smooth", grain:0, grainN:540, grainBite:45,
	/* The artwork has no physical size. It is a proportion and a pixel width;
		 what it becomes on paper is decided downstream, in the layout tool. Every
		 texture is therefore counted across the width, which is the one quantity
		 the screen and the exported file agree on. */
	aspect:16 / 10, outH:2400, followWindow:true
}
/* One place holds the version; the readout and the title both draw from it
	 (init writes the title — it cannot live here, the regress harness pulls
	 this section into Node where there is no document). major.minor.patch —
	 major bumps on Hailei's instruction; minor and patch on judgement. */
const VERSION = "0.59.0"

/* The output is a pixel width and a proportion; the height follows. Nothing
	 here is physical — what the file becomes on paper is decided downstream. */
/* The height is what the artwork is pinned to, exactly as in the preview:
	 widen the proportion and it grows sideways, it does not get shorter. */
function outSize(){
	const h = Math.max( 1, Math.round( state.outH ) )
	return [ Math.max( 1, Math.round( h * Math.max( 1, state.aspect ) ) ), h ]
}

/* One colour in → derive tint / base / shade */
function derive( hex ){
	const lch = hexToLch( hex )
	const L = lch[0], C = lch[1], h = lch[2]
	return [
		lchToHex( [ Math.min( 0.97, L + 0.18 ), C * 0.55, ( h - 8 + 360 ) % 360 ] ),
		hex,
		lchToHex( [ Math.max( 0.10, L - 0.20 ), C * 1.10, ( h + 10 ) % 360 ] )
	]
}
/* The primary colour holds a flat plateau on the axis, so it occupies more of the sheet.
	 With no primary set, every colour is evenly spaced — identical to plain interpolation. */
/* Even spacing for n colours */
function evenPositions( n ){
	/* With one colour the single position means something else: it is where the
		 pure colour sits between the derived tint and shade, so it starts halfway
		 rather than pinned to the left. */
	if( n === 1 ) return [ 0.5 ]
	const out = []
	for( let i = 0;i < n;i++ ) out.push( i / ( n - 1 ) )
	return out
}
/* Stop positions are set per colour, not derived from the count.
	 This is what the Nuevo Tokyo work depends on: a colour may hold a wide
	 calm stretch or flash past in a narrow band, and even spacing can never
	 produce that rhythm. Two handles carrying the same colour give a plateau. */
function stops(){
	const c = state.colours
	let out = []
	if( c.length === 1 ){
		/* one colour becomes tint, base and shade — and that derived ramp can be
			 closed into a loop just like a hand-built one */
		/* Tint and shade are derived and sit at the ends; only the pure colour has
			 a place worth moving, and moving it is what tips the whole sheet light
			 or dark. */
		const mid = Math.min( 0.94, Math.max( 0.06, state.positions[0] === undefined ? 0.5 : state.positions[0] ) )
		const d3 = derive( c[0] )
		out = [ { hex:d3[0], pos:0 }, { hex:d3[1], pos:mid }, { hex:d3[2], pos:1 } ]
	} else {
		for( let i = 0;i < c.length;i++ )
			out.push( { hex:c[i], pos:clamp01( state.positions[i] === undefined ? i / ( c.length - 1 ) : state.positions[i] ) } )
		out.sort( function( a,b ){ return a.pos - b.pos } )
	}

	/* Seamless closes the ramp into a loop rather than folding it back.
		 Mirroring also makes the two ends meet, but it walks the whole palette
		 twice across one sheet — the composition is squashed to half and a hard
		 axis of symmetry appears down the middle. Here the palette is squeezed
		 into the first part of the sheet and the remainder carries it back to
		 the opening colour, so the ramp is travelled once and the join is still
		 continuous. With only two colours the two are the same thing: there is
		 no other way home. */
	if( state.seamless && state.type === "linear" && out.length > 1 ){
		const span = out[out.length - 1].pos - out[0].pos
		const ret = 1 / out.length                       /* length of the return leg */
		const keep = 1 - ret
		const base = out[0].pos
		out = out.map( function( q ){
			return { hex:q.hex, pos: span > 1e-6 ? ( q.pos - base ) / span * keep : 0 }
		} )
		out.push( { hex:out[0].hex, pos:1 } )
	}
	return out
}
/* Multi-point: the first colour is the ground the others sit on */
function meshColours(){
	const c = state.colours
	if( c.length === 1 ) return { base:derive( c[0] )[1], blobs:[ derive( c[0] )[0], derive( c[0] )[2] ] }
	return { base:c[0], blobs:c.slice( 1 ) }
}
function colourAt(){
	const s = stops(), space = state.space, ease = state.ease
	return function( t ){
		const x = clamp01( t )
		if( x <= s[0].pos ) return s[0].hex
		if( x >= s[s.length - 1].pos ) return s[s.length - 1].hex
		for( let i = 0;i < s.length - 1;i++ ){
			const a = s[i], b = s[i + 1]
			if( x >= a.pos && x <= b.pos ){
				const span = ( b.pos - a.pos ) || 1e-6
				return mixHex( a.hex, b.hex, applyEase( ( x - a.pos ) / span, ease ), space )
			}
		}
		return s[s.length - 1].hex
	}
}

/* ══════════════════════════════════════════════════════════
	 3. Geometry — SVG construction and point sampling both read
	 from here, so screen, file and readout can never drift apart
	 ══════════════════════════════════════════════════════════ */

/* Position along the gradient axis, 0 at one corner-most edge, 1 at the other */
function axisT( x, y, W, H ){
	const a = state.angle * Math.PI / 180, dx = Math.sin( a ), dy = -Math.cos( a )
	const half = ( Math.abs( dx ) * W + Math.abs( dy ) * H ) / 2
	const x1 = W / 2 - dx * half, y1 = H / 2 - dy * half
	const vx = 2 * dx * half, vy = 2 * dy * half
	return ( ( x - x1 ) * vx + ( y - y1 ) * vy ) / ( vx * vx + vy * vy || 1 )
}
/* Solid discs, heavily blurred — not radial falloffs.
	 A radial gradient fades from its centre and never has a flat middle; a
	 blurred solid disc keeps an even core and only softens at the shoulder.
	 That difference is the whole character of the reference work. Centres may
	 sit outside the sheet so discs crop at the edge instead of always
	 floating clear of it. */
/* Discs must overlap without ever sitting inside one another.
	 A shape nested in another reads as a bullseye; shapes that clip each other
	 read as colour bleeding into colour, which is the thing being aimed at.
	 Two circles are nested when the distance between centres is less than the
	 difference of their radii, and separate when it exceeds the sum — so every
	 placement is drawn from the band strictly between those two. */
function composeBlobs( n, W, H ){
	const random = mulberry32( state.seed )
	const span = H   /* blob size pegs to the height, like every texture */
	const base = ( 0.26 + state.blobSize * 0.52 ) * span
	const out = []
	for( let i = 0; i < n; i++ ){
		const r = base * ( 0.60 + random() * 0.85 )
		if( !out.length ){
			out.push( { x:( 0.22 + random() * 0.56 ) * W, y:( 0.22 + random() * 0.56 ) * H, r:r } )
			continue
		}
		/* Anchoring to one disc only guarantees the pair; the placement has to be
			 checked against every disc already down, or the third one quietly ends
			 up swallowed by the first. Try a few positions and take the first that
			 clips something and is buried in nothing. */
		let best = null
		for( let t = 0; t < 24; t++ ){
			const a = out[Math.floor( random() * out.length )]
			const lo = Math.abs( a.r - r ) + Math.min( a.r, r ) * 0.30
			let hi = ( a.r + r ) * 0.86
			if( hi <= lo ) hi = lo * 1.15
			const dist = lo + random() * ( hi - lo )
			const th = random() * Math.PI * 2
			const c = {
				x: Math.max( -0.2 * W, Math.min( 1.2 * W, a.x + Math.cos( th ) * dist ) ),
				y: Math.max( -0.2 * H, Math.min( 1.2 * H, a.y + Math.sin( th ) * dist ) ),
				r: r
			}
			let nested = false, touches = false
			for( let k = 0; k < out.length; k++ ){
				const o = out[k], dd = Math.hypot( c.x - o.x, c.y - o.y )
				if( dd < Math.abs( o.r - c.r ) ) { nested = true; break }
				if( dd < o.r + c.r ) touches = true
			}
			if( !best ) best = c
			if( !nested && touches ){ best = c; break }
		}
		out.push( best )
	}
	return out.map( function( o ){
		return { x:o.x, y:o.y, w:o.r * 2, soft:state.blobSoft }
	} )
}
/* One place decides how much blur a softness means, so the drawn disc and the
	 sampled disc cannot drift apart. */
const blobBlurFactor = 0.50   /* blur sigma per unit of softness — measured, not guessed */
function blobBlur( b ){
	const r = b.w * 0.5
	/* Only a floor now. The old 0.98 ceiling stopped soft one notch short of the
		 point where the flat core vanishes — sensible while that core was the whole
		 definition of the mode, but Hailei looked at 150 and wanted the dissolved
		 end of the scale (2026-07-30), so the ceiling is the slider's business. */
	return Math.max( 0.5, r * Math.max( 0.02, b.soft ) * blobBlurFactor )
}
/* The blur must have room to spread or it is silently cut off at the filter's
	 edge — the tail simply disappears and every softness above the box's capacity
	 renders identically. A three-box Gaussian reaches about 2.8σ, and σ is
	 r·soft·0.50, so the margin needed on each side is 1.4·soft·r — as a
	 percentage of the 2r bounding box, exactly 70 × soft. The old fixed 70% was
	 therefore sized for soft = 1.00 and no further. Ten points of headroom cover
	 the box-blur approximation's own slop. */
function blobFilterMargin( b ){
	return Math.max( 70, Math.ceil( 70 * Math.max( 0.02, b.soft ) ) + 10 )
}
function shapeSvg( b, hex ){
	return '<circle cx="0" cy="0" r="' + ( b.w * 0.5 ).toFixed( 1 ) + '" fill="' + hex + '"/>'
}
/* Rough coverage of a disc at a point, used only to pick black or white ink.
	 A Gaussian blur of a hard edge is an error function; smoothstep is close
	 enough for a decision that only has two outcomes. */
function shapeAlpha( b, x, y ){
	const r = b.w * 0.5
	const d = Math.hypot( ( x - b.x ) / r, ( y - b.y ) / r )
	/* soft is the fraction of the radius the falloff occupies, so the flat core
		 measures r·(1−soft): it shrinks in a straight line and is gone at soft 1.
		 Past that there is no plateau, only a dome — the mass reads as a breath of
		 colour rather than a body of it. The formula stays monotonic and needs no
		 ceiling; the slider decides how far the scale runs. */
	const soft = Math.max( 0.02, b.soft )
	const t = ( d - ( 1 - soft ) ) / ( 2 * soft )
	if( t <= 0 ) return 1
	if( t >= 1 ) return 0
	return 1 - t * t * ( 3 - 2 * t )
}
/* The cell is sized against the height — the pinned dimension — so a wider
	 ratio extends the weave with more columns instead of inflating each cell.
	 (Hailei, 2026-07-28; replaces the width-anchored counting.) */
function gridCells( W, H ){
	const cell = H / Math.max( 1, Math.round( state.gridN ) )
	const cols = Math.max( 1, Math.round( W / cell ) )
	const rows = Math.max( 1, Math.round( H / cell ) )
	/* Cells butt directly. The tiny overlap stops the renderer's own
		 antialiasing from drawing a pale hairline along every shared edge —
		 that hairline is exactly the drawn border we do not want. */
	return { cols:cols, rows:rows, ov:Math.max( W / cols, H / rows ) * 0.012 }
}
/* Colour of one cell. Grid is a filter, not a gradient of its own — it reads
	 whatever the gradient underneath produces and flattens it cell by cell.
		 cells — the colour at the cell's own centre
		 plaid — the column crossed with the row, each read from the base. That
						 crossing is what gives the woven look and the square bright core.
		 columns — full-height vertical stripes, read across the width
		 rows    — full-width horizontal stripes, read down the height */
function gridColour( cx, cy, W, H ){
	if( state.gridPattern === "columns" ) return baseColourAt( cx, H / 2, W, H )
	if( state.gridPattern === "rows" )    return baseColourAt( W / 2, cy, W, H )
	if( state.gridPattern === "rings" || state.gridPattern === "hex" || state.gridPattern === "tri" )
		return baseColourAt( cx, cy, W, H )
	if( state.gridPattern === "plaid" )
		return mixHex( baseColourAt( cx, H / 2, W, H ), baseColourAt( W / 2, cy, W, H ), 0.5, state.space )
	return baseColourAt( cx, cy, W, H )
}
/* How many divisions each way. Count always means the number of divisions in
	 the direction the pattern runs, so the slider does the same thing whichever
	 is chosen: fewer means wider. */
/* A pattern is no longer a grid of rectangles. It is a list of shapes, each
	 carrying the point whose colour it should take, plus a way to ask which
	 shape a given point falls in. Everything stays flat fill, so everything
	 stays vector. */
function gridShape( geometry ){
	if( state.gridPattern === "columns" ) return { cols:geometry.cols, rows:1 }
	if( state.gridPattern === "rows" )    return { cols:1, rows:Math.max( 1, Math.round( state.gridN ) ) }
	return { cols:geometry.cols, rows:geometry.rows }
}
function ringGeom( W, H ){
	const cx = W * state.cx / 100, cy = H * state.cy / 100
	const far = Math.max( Math.hypot( cx, cy ), Math.hypot( W - cx, cy ),
										 Math.hypot( cx, H - cy ), Math.hypot( W - cx, H - cy ) )
	const a = state.angle * Math.PI / 180
	/* ring thickness pegs to the height; the count follows the reach */
	const rings = Math.max( 1, Math.round( far / ( H / Math.max( 1, Math.round( state.gridN ) ) ) ) )
	return { cx:cx, cy:cy, R:far, n:rings,
					dx:Math.sin( a ), dy:-Math.cos( a ) }
}
function hexGeom( W, H ){
	const n = Math.max( 2, Math.round( state.gridN ) )
	const side = H / ( n * Math.sqrt( 3 ) )          /* n hexes per height-span; tiling covers the width */
	return { s:side, n:n, W:W, H:H }
}
function triGeom( W, H ){
	const n = Math.max( 2, Math.round( state.gridN ) )
	const b = H / n                            /* base = height / count; columns follow the width */
	return { b:b, h:b * Math.sqrt( 3 ) / 2, n:n, W:W, H:H }
}
/* Push the vertices out from the centre a hair so neighbours overlap. Two
	 shapes that merely touch each get antialiased against the background and
	 the blend leaves a pale seam — the drawn border we do not want. */
function grow( v, c, k ){
	return v.map( function( pt ){
		return ( c[0] + ( pt[0] - c[0] ) * k ).toFixed( 2 ) + "," + ( c[1] + ( pt[1] - c[1] ) * k ).toFixed( 2 )
	} ).join( " " )
}
function cubeRound( x, y, z ){
	let rx = Math.round( x ), ry = Math.round( y ), rz = Math.round( z )
	const dx = Math.abs( rx - x ), dy = Math.abs( ry - y ), dz = Math.abs( rz - z )
	if( dx > dy && dx > dz ) rx = -ry - rz; else if( dy > dz ) ry = -rx - rz; else rz = -rx - ry
	return [ rx, ry, rz ]
}
function hexCentre( geometry, q, r ){
	return [ geometry.s * Math.sqrt( 3 ) * ( q + r / 2 ), geometry.s * 1.5 * r ]
}
function hexAt( geometry, x, y ){
	const q = ( Math.sqrt( 3 ) / 3 * x - y / 3 ) / geometry.s, r = ( 2 / 3 * y ) / geometry.s
	const c = cubeRound( q, -q - r, r )
	return hexCentre( geometry, c[0], c[2] )
}
/* Alternate rows shift by half a base. Without that the diagonals reverse at
	 every row boundary and meet in a V; with it they run straight across the
	 whole plane, which is what an equilateral tiling looks like. */
function triRowOffset( geometry, row ){ return ( row % 2 ) ? geometry.b / 2 : 0 }
/* Which triangle holds this point: test the ones that can, rather than deriving
	 an index — the lookup runs a handful of times, and being certain is worth
	 more than being clever. */
function triAt( geometry, x, y ){
	const row = Math.floor( y / geometry.h ), yy = y - row * geometry.h
	const off = triRowOffset( geometry, row )
	const m = Math.floor( ( x - off ) / ( geometry.b / 2 ) )
	for( let k = m - 1; k <= m + 1; k++ ){
		const x0 = off + k * geometry.b / 2
		const up = ( k % 2 !== 0 )
		let ax, bx, cx2, ay, by, cy2
		if( up ){ ax = x0; ay = geometry.h; bx = x0 + geometry.b; by = geometry.h; cx2 = x0 + geometry.b / 2; cy2 = 0 }
		else  { ax = x0; ay = 0;   bx = x0 + geometry.b; by = 0;   cx2 = x0 + geometry.b / 2; cy2 = geometry.h }
		const det = ( by - cy2 ) * ( ax - cx2 ) + ( cx2 - bx ) * ( ay - cy2 )
		if( Math.abs( det ) < 1e-9 ) continue
		const l1 = ( ( by - cy2 ) * ( ( x - x0 ) - ( cx2 - x0 ) ) + ( cx2 - bx ) * ( yy - cy2 ) ) / det
		const l2 = ( ( cy2 - ay ) * ( ( x - x0 ) - ( cx2 - x0 ) ) + ( ax - cx2 ) * ( yy - cy2 ) ) / det
		if( l1 >= -0.001 && l2 >= -0.001 && l1 + l2 <= 1.001 )
			return [ ( ax + bx + cx2 ) / 3, row * geometry.h + ( ay + by + cy2 ) / 3 ]
	}
	return [ off + m * geometry.b / 2 + geometry.b / 2, row * geometry.h + geometry.h / 2 ]
}
/* Every shape the pattern draws, with the point each takes its colour from */
function patternShapes( W, H ){
	const out = []
	let i, j
	if( state.gridPattern === "rings" ){
		const ringGeometry = ringGeom( W, H )
		for( i = ringGeometry.n; i >= 1; i-- ){                    /* largest first, painted over */
			const rOut = ringGeometry.R * i / ringGeometry.n, rMid = ringGeometry.R * ( i - 0.5 ) / ringGeometry.n
			out.push( { svg:'<circle cx="' + ringGeometry.cx.toFixed( 2 ) + '" cy="' + ringGeometry.cy.toFixed( 2 )
									 + '" r="' + rOut.toFixed( 2 ) + '"',
								cx:ringGeometry.cx + ringGeometry.dx * rMid, cy:ringGeometry.cy + ringGeometry.dy * rMid } )
		}
		return out
	}
	if( state.gridPattern === "hex" ){
		const hexGeometry = hexGeom( W, H )
		const rows = Math.ceil( H / ( hexGeometry.s * 1.5 ) ) + 2, cols = Math.ceil( W / ( hexGeometry.s * Math.sqrt( 3 ) ) ) + 2
		for( let r = -1; r <= rows; r++ ){
			for( let q = -Math.ceil( r / 2 ) - 1; q <= cols; q++ ){
				const c = hexCentre( hexGeometry, q, r )
				if( c[0] < -hexGeometry.s * 2 || c[0] > W + hexGeometry.s * 2 || c[1] < -hexGeometry.s * 2 || c[1] > H + hexGeometry.s * 2 ) continue
				const vs = []
				for( let k = 0; k < 6; k++ ){
					const ang = Math.PI / 180 * ( 60 * k - 30 )
					vs.push( [ c[0] + hexGeometry.s * Math.cos( ang ), c[1] + hexGeometry.s * Math.sin( ang ) ] )
				}
				out.push( { svg:'<polygon points="' + grow( vs, c, 1.02 ) + '"', cx:c[0], cy:c[1] } )
			}
		}
		return out
	}
	if( state.gridPattern === "tri" ){
		const triangleGeometry = triGeom( W, H )
		const nRows = Math.ceil( H / triangleGeometry.h ) + 1
		const nCols = Math.ceil( W / triangleGeometry.b )   /* coverage, not the count — the count sizes the base */
		for( let rr = 0; rr < nRows; rr++ ){
			const off = triRowOffset( triangleGeometry, rr )
			for( let kk = -2; kk <= nCols * 2 + 2; kk++ ){
				const x0 = off + kk * triangleGeometry.b / 2, yTop = rr * triangleGeometry.h
				const upT = ( kk % 2 !== 0 )
				const v = upT
					? [ [ x0, yTop + triangleGeometry.h ], [ x0 + triangleGeometry.b, yTop + triangleGeometry.h ], [ x0 + triangleGeometry.b / 2, yTop ] ]
					: [ [ x0, yTop ], [ x0 + triangleGeometry.b, yTop ], [ x0 + triangleGeometry.b / 2, yTop + triangleGeometry.h ] ]
				const tc = [ ( v[0][0] + v[1][0] + v[2][0] ) / 3, ( v[0][1] + v[1][1] + v[2][1] ) / 3 ]
				out.push( { svg:'<polygon points="' + grow( v, tc, 1.02 ) + '"', cx:tc[0], cy:tc[1] } )
			}
		}
		return out
	}
	/* the rectangular family */
	const geometry = gridCells( W, H ), shape = gridShape( geometry )
	const columnWidth = W / shape.cols, rowHeight = H / shape.rows
	for( j = 0; j < shape.rows; j++ ){
		for( i = 0; i < shape.cols; i++ ){
			out.push( { svg:'<rect x="' + ( i * columnWidth ).toFixed( 3 ) + '" y="' + ( j * rowHeight ).toFixed( 3 )
									 + '" width="' + ( columnWidth + geometry.ov ).toFixed( 3 ) + '" height="' + ( rowHeight + geometry.ov ).toFixed( 3 ) + '"',
								cx:i * columnWidth + columnWidth / 2, cy:j * rowHeight + rowHeight / 2 } )
		}
	}
	return out
}
/* The representative point for whatever shape holds (x,y) */
function patternSample( x, y, W, H ){
	if( state.gridPattern === "rings" ){
		const ringGeometry = ringGeom( W, H )
		const dist = Math.hypot( x - ringGeometry.cx, y - ringGeometry.cy )
		const i = Math.min( ringGeometry.n - 1, Math.max( 0, Math.floor( dist / ringGeometry.R * ringGeometry.n ) ) )
		const rMid = ringGeometry.R * ( i + 0.5 ) / ringGeometry.n
		return [ ringGeometry.cx + ringGeometry.dx * rMid, ringGeometry.cy + ringGeometry.dy * rMid ]
	}
	if( state.gridPattern === "hex" ) return hexAt( hexGeom( W, H ), x, y )
	if( state.gridPattern === "tri" ) return triAt( triGeom( W, H ), x, y )
	const geometry = gridCells( W, H ), shape = gridShape( geometry )
	const columnWidth = W / shape.cols, rowHeight = H / shape.rows
	const gx = Math.min( shape.cols - 1, Math.max( 0, Math.floor( x / columnWidth ) ) )
	const gy = Math.min( shape.rows - 1, Math.max( 0, Math.floor( y / rowHeight ) ) )
	return [ gx * columnWidth + columnWidth / 2, gy * rowHeight + rowHeight / 2 ]
}
/* ══════════════════════════════════════════════════════════
	 4. SVG — screen and file both come from here
	 ══════════════════════════════════════════════════════════ */
/* crop is an optional {x,y,w,h} in millimetres. With it the viewBox is that
	 window rather than the whole sheet, which is how the 100% view shows the
	 file at its own pixel scale without rasterising all of it. */
function buildSvg( mode, W, H, pxW, pxH, crop ){
	const at = colourAt()
	const list = stops()
	const count = Math.max( 3, Math.min( 260, ( list.length - 1 ) * SMOOTH + 1 ) )

	let sizeAttr
	if( mode === "screen" ) sizeAttr = 'width="100%" height="100%"'
	else if( mode === "raster" ) sizeAttr = 'width="' + pxW + '" height="' + pxH + '"'
	/* unitless: the file is a proportion and a pixel count, nothing physical */
	else sizeAttr = 'width="' + W + '" height="' + H + '"'

	let stopTags = ""
	for( let i = 0;i < count;i++ ){
		const t = i / ( count - 1 )
		stopTags += '    <stop offset="' + ( t * 100 ).toFixed( 3 ) + '%" stop-color="' + at( t ) + '"/>\n'
	}

	let defs = "", body = ""

	if( state.grid ){
		/* the filter: read the gradient underneath and flatten it shape by shape */
		patternShapes( W, H ).forEach( function( shapeSpec ){
			body += "  " + shapeSpec.svg + ' fill="' + gridColour( shapeSpec.cx, shapeSpec.cy, W, H ) + '"/>\n'
		} )
	} else if( state.type === "linear" ){
		const a = state.angle * Math.PI / 180
		const dx = Math.sin( a ), dy = -Math.cos( a )
		const half = ( Math.abs( dx ) * W + Math.abs( dy ) * H ) / 2
		defs += '  <linearGradient id="wgG" gradientUnits="userSpaceOnUse"'
				 + ' x1="' + ( W / 2 - dx * half ).toFixed( 3 ) + '" y1="' + ( H / 2 - dy * half ).toFixed( 3 ) + '"'
				 + ' x2="' + ( W / 2 + dx * half ).toFixed( 3 ) + '" y2="' + ( H / 2 + dy * half ).toFixed( 3 ) + '">\n'
				 + stopTags + "  </linearGradient>\n"
		body += '  <rect width="' + W + '" height="' + H + '" fill="url(#wgG)"/>\n'
	} else if( state.type === "radial" ){
		defs += '  <radialGradient id="wgG" cx="' + ( state.cx / 100 ).toFixed( 4 ) + '" cy="' + ( state.cy / 100 ).toFixed( 4 )
				 + '" r="' + ( state.radius / 100 ).toFixed( 4 ) + '">\n' + stopTags + "  </radialGradient>\n"
		body += '  <rect width="' + W + '" height="' + H + '" fill="url(#wgG)"/>\n'
	} else if( state.type === "mesh" ){
		const mesh = meshColours()
		const blobs = composeBlobs( mesh.blobs.length, W, H )
		body += '  <rect width="' + W + '" height="' + H + '" fill="' + mesh.base + '"/>\n'
		for( let k = 0;k < blobs.length;k++ ){
			const b = blobs[k]
			const margin = blobFilterMargin( b )
			defs += '  <filter id="wgB' + k + '" x="-' + margin + '%" y="-' + margin + '%"'
					 + ' width="' + ( 2 * margin + 100 ) + '%" height="' + ( 2 * margin + 100 ) + '%"'
					 + ' color-interpolation-filters="sRGB">\n'
					 + '    <feGaussianBlur stdDeviation="' + blobBlur( b ).toFixed( 2 ) + '"/>\n  </filter>\n'
			body += '  <g filter="url(#wgB' + k + ')" transform="translate(' + b.x.toFixed( 1 ) + " " + b.y.toFixed( 1 )
					 + ')">' + shapeSvg( b, mesh.blobs[k] ) + "</g>\n"
		}

	}

	if( state.grain > 0 ){
		/* Grain size is stated in millimetres of paper, so it means the same thing
			 on screen as on the sheet. Four octaves give film-like clumping rather
			 than flat television static; the transfer curve pulls the noise away
			 from mid-grey so it bites without milking the whole image. Bite is the
			 slope of that curve: 0 leaves the raw turbulence, higher values widen
			 the spread and give the sandy, printed-paper feel of the references. */
		/* cycles per viewBox unit — the count pegs to the height, the pinned
			 dimension, so grain size survives a ratio change (2026-07-28) */
		const freq = Math.max( 1, state.grainN ) / H
		/* widen the noise about mid-grey so it bites instead of hazing over */
		const bite = ( 1 + state.grainBite / 50 ).toFixed( 3 )
		defs += '  <filter id="wgGrain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">\n'
				 + '    <feTurbulence type="fractalNoise" baseFrequency="' + freq.toFixed( 4 )
				 + '" numOctaves="4" seed="' + state.seed + '" stitchTiles="stitch"/>\n'
				 + '    <feColorMatrix type="saturate" values="0"/>\n'
				 + "    <feComponentTransfer>\n"
				 + '      <feFuncR type="linear" slope="' + bite + '" intercept="' + ( 0.5 - bite * 0.5 ).toFixed( 3 ) + '"/>\n'
				 + '      <feFuncG type="linear" slope="' + bite + '" intercept="' + ( 0.5 - bite * 0.5 ).toFixed( 3 ) + '"/>\n'
				 + '      <feFuncB type="linear" slope="' + bite + '" intercept="' + ( 0.5 - bite * 0.5 ).toFixed( 3 ) + '"/>\n'
				 + "    </feComponentTransfer>\n  </filter>\n"
		/* One full-canvas filter rect dies silently in WebKit above its filter
			 rasterisation cap (~4096×4096 device px) — on a 6K display the grain
			 simply vanished while Chrome kept rendering it. Tiles stay under the
			 cap, and because turbulence is anchored in user space every tile
			 samples the same continuous noise field — no seams. 1024 units keeps
			 a tile safe even at ~3 device px per unit. */
		const tile = 1024
		const alpha = ( state.grain / 100 ).toFixed( 3 )
		for( let ty = 0;ty < Math.ceil( H / tile );ty++ ){
			for( let tx = 0;tx < Math.ceil( W / tile );tx++ ){
				body += '  <rect x="' + tx * tile + '" y="' + ty * tile
						 + '" width="' + Math.min( tile, W - tx * tile ) + '" height="' + Math.min( tile, H - ty * tile )
						 + '" filter="url(#wgGrain)" opacity="' + alpha + '" style="mix-blend-mode:overlay"/>\n'
			}
		}
	}

	const viewBox = crop ? ( crop.x + " " + crop.y + " " + crop.w + " " + crop.h ) : ( "0 0 " + W + " " + H )
	return '<svg xmlns="http://www.w3.org/2000/svg" ' + sizeAttr + ' viewBox="' + viewBox + '">\n'
			 + "<defs>\n" + defs + '</defs>\n<g style="isolation:isolate">\n' + body + "</g>\n</svg>"
}

/* ══════════════════════════════════════════════════════════
	 5. Palette generation
	 ══════════════════════════════════════════════════════════ */
/* Random colours come from the default palette now, not from thin air:
	 one to three ADJACENT hue families, n picks spread dark to light across
	 a window that skips the crushed ends of the ramp. Black and white stay
	 out of the pool. (Hailei, 2026-07-28.) */
function randomColours( n ){
	const pool = DEFAULT_SWATCH
		.map( function( row ){ return row.filter( function( h ){ return h !== "#000000" && h !== "#ffffff" } ) } )
		.filter( function( row ){ return row.length > 0 } )
	const random = mulberry32( Math.floor( Math.random() * 1e9 ) )
	const span = 1 + Math.floor( random() * 3 )
	const start = Math.floor( random() * pool.length )
	const rows = []
	for( let i = 0;i < span;i++ ) rows.push( pool[( start + i ) % pool.length] )
	const steps = rows[0].length
	const out = []
	for( let i = 0;i < n;i++ ){
		const f = n === 1 ? 0.4 + random() * 0.3 : i / ( n - 1 )
		let idx = Math.round( ( 0.12 + 0.76 * f ) * ( steps - 1 ) + ( random() - 0.5 ) * 2 )
		idx = Math.max( 0, Math.min( steps - 1, idx ) )
		const row = rows[Math.floor( random() * rows.length )]
		out.push( row[Math.min( idx, row.length - 1 )] )
	}
	return out
}
function extendColours( n ){
	const c = state.colours.slice()
	while( c.length > n ) c.pop()
	while( c.length < n ){
		if( c.length === 0 ){ c.push( "#e8e1d4" ); continue }
		const last = hexToLch( c[c.length - 1] )
		const first = hexToLch( c[0] )
		let step = ( ( last[2] - first[2] + 540 ) % 360 ) - 180
		if( Math.abs( step ) < 4 ) step = 22
		const L = clamp01( last[0] + ( last[0] > 0.55 ? -0.16 : 0.16 ) )
		const C = last[1] * 0.95 + 0.01
		c.push( lchToHex( [ L, C, ( last[2] + step + 360 ) % 360 ] ) )
	}
	return c
}
/* One library entry per name: importing under an existing name replaces
	 that set, a new name joins the shelf. Returns the set's index so the
	 caller can put it on display. */
function addSwatchSet( name, colours, rows ){
	for( let i = 0;i < swatches.length;i++ ){
		if( swatches[i].name === name ){ swatches[i].colours = colours; swatches[i].rows = rows || null; return i }
	}
	swatches.push( { name:name, colours:colours, rows:rows || null } )
	return swatches.length - 1
}
/* Read any swatch text. The Palette export object (families → one row per
	 hue, steps keyed by lightness so a sort gives dark to light; black and
	 white close the shelf as their own row) yields grouped rows; a bare hex
	 array or loose text falls back to plain extraction, no grouping. */
function parseSwatch( text ){
	try{
		const data = JSON.parse( text )
		if( data && data.families && data.families.length ){
			const rows = data.families.map( function( f ){
				return Object.keys( f.steps ).map( Number ).sort( function( a, b ){ return a - b } )
					.map( function( k ){ return String( f.steps[k] ).toLowerCase() } )
			} )
			if( data.black && data.white ) rows.push( [ String( data.black ).toLowerCase(), String( data.white ).toLowerCase() ] )
			return { colours: rows.flat(), rows: rows }
		}
	}catch( e ){}
	return { colours: hexesFrom( text ), rows: null }
}

/* ══════════════════════════════════════════════════════════
	 6. Sampling and dice — the analytic half of the tool's
	    section 6, plus the throw behind its one big button
	 ══════════════════════════════════════════════════════════ */
/* ── What colour is the render at this point? Used to decide black or white text. ── */
function baseColourAt( x, y, W, H ){
	const at = colourAt()
	if( state.type === "linear" ) return at( axisT( x, y, W, H ) )
	if( state.type === "radial" )
		return at( Math.hypot( x / W - state.cx / 100, y / H - state.cy / 100 ) / ( state.radius / 100 || 1e-6 ) )
	const mesh = meshColours()
	const blobs = composeBlobs( mesh.blobs.length, W, H )
	const acc = hexToRgb( mesh.base ) || [ 0,0,0 ]
	for( let k = 0;k < blobs.length;k++ ){
		const al = shapeAlpha( blobs[k], x, y )
		if( al <= 0 ) continue
		const c = hexToRgb( mesh.blobs[k] ) || [ 0,0,0 ]
		for( let q = 0;q < 3;q++ ) acc[q] = acc[q] * ( 1 - al ) + c[q] * al
	}
	return rgbToHex( acc )
}
/* What the sheet actually shows here, filter included */
function colourAtPoint( x, y, W, H ){
	if( !state.grid ) return baseColourAt( x, y, W, H )
	const pt = patternSample( x, y, W, H )
	return gridColour( pt[0], pt[1], W, H )
}

/* One press rolls the whole composition — colours from the default palette,
	 a type and its geometry, maybe a pattern, maybe grain — with the dramatic
	 knobs held to civil ranges: grain never past 28%, soft never soupy.
	 Size, ratio, blend space and seamless are production choices and stay put. */
function roll(){
	const r = Math.random
	state.colours = randomColours( [ 2, 2, 3, 3, 3, 4, 4, 5, 6, 7 ][Math.floor( r() * 10 )] )
	state.positions = evenPositions( state.colours.length )
	const kind = r()
	state.type = kind < 0.5 ? "linear" : kind < 0.75 ? "radial" : "mesh"
	state.angle = Math.round( r() * 360 )
	state.seamless = false
	state.cx = Math.round( 15 + r() * 70 ); state.cy = Math.round( 15 + r() * 70 )
	state.radius = Math.round( 40 + r() * 80 )
	state.blobSize = 0.35 + r() * 0.40
	/* The dice stay inside the slider's own range — a roll the hand cannot
		 reproduce is a roll that cannot be tuned afterwards. They also stay off
		 the dissolved top end: 135 is there for when it is reached for, not to be
		 landed on by accident. */
	state.blobSoft = 0.25 + r() * 0.35
	state.seed = Math.floor( r() * 9999 )
	state.grid = r() < 0.5
	if( state.grid ){
		const kinds = [ "plaid", "cells", "columns", "rows", "rings", "hex", "tri" ]
		state.gridPattern = kinds[Math.floor( r() * kinds.length )]
		state.gridN = Math.round( 5 + r() * 31 )
	}
	state.ease = r() < 0.7 ? "smooth" : [ "linear", "start", "end" ][Math.floor( r() * 3 )]
	state.grain = r() < 0.4 ? Math.round( 8 + r() * 20 ) : 0
	state.grainN = Math.round( 300 + r() * 600 )
	state.grainBite = Math.round( 30 + r() * 30 )
}

/* The only name this file puts on the page. globalThis covers a headless
	 engine with no window — the regression harness runs the served file that
	 way to prove it still draws. */
const host = typeof window !== "undefined" ? window : globalThis
host.WHLGradient = {
	VERSION: VERSION,
	state: state,
	swatches: swatches,
	roll: roll,
	buildSvg: buildSvg,
	colourAt: colourAt,
	colourAtPoint: colourAtPoint,
	stops: stops,
	meshColours: meshColours,
	outSize: outSize,
	hexToRgb: hexToRgb,
	rgbToOklab: rgbToOklab,
	oklabToRgb: oklabToRgb,
	oklchToOklab: oklchToOklab,
	hexToLch: hexToLch,
	lchToHex: lchToHex,
	inGamut: inGamut,
	clamp01: clamp01,
	randomColours: randomColours,
	extendColours: extendColours,
	evenPositions: evenPositions,
	addSwatchSet: addSwatchSet,
	parseSwatch: parseSwatch,
	RATIOS: RATIOS,
	SPACES: SPACES,
	EASES: EASES,
	SMOOTH: SMOOTH,
	derive: derive,
	mixHex: mixHex,
	DEFAULT_SWATCH: DEFAULT_SWATCH
}
} )()
