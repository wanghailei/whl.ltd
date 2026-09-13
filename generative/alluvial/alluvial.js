/* WHL Generative Alluvial — the engine and the wiring. Loaded by
   the page beside it, after help.js. See README.md. */
"use strict"

/* Bumped on every delivery — one minor per delivery, patch for a fix
	 alone, major on Hailei's word. It sat at 0.1.0 through the twenty
	 deliveries from 2026-09-11 to 2026-09-13 (Hailei: "bump version
	 properly"), so it starts here at what they add up to. */
const VERSION = "0.24.0"
/* Where the tool lives once published. A saved link points here whatever
	 the page was opened from — a file on disk, a local server — since only
	 the settings after the ? matter to it (Hailei, 2026-09-13). */
const HOME = "https://whl.ltd/generative/alluvial/index.html"

/* ══════════════════════════════════════════════════════════
	 1. State
	 ══════════════════════════════════════════════════════════ */
/* Everything the picture is. Nothing else decides what gets drawn, so a sheet
	 is fully described by this object plus the seed — which is what lets ROLL
	 AGAIN and a typed seed agree. */
const state = {
	/* Which of the two ways of driving the sheet is in hand: control (by
		 hand) or data (by records). Only the shown controls change with it;
		 the sheet is what every setting says it is, whichever way it was
		 reached. RANDOM is not a mode but a button on the same line (Hailei,
		 2026-09-12): one press rolls the composition. Control to open, since
		 the opening sheet is a composed one and the dice is a press away. */
	mode: "control",
	seed: 4271,
	lines: 240,
	/* How many columns the sheet has, left to right, each a section of flow
		 with a bar on either side — so a sheet of three columns has four bars,
		 the middle two shared. One column is the plainest alluvial there is;
		 the references on the wall run to four. Named the way Hailei names
		 them (2026-09-12): the column is the module, the bars are its edges. */
	columns: 3,
	/* The columns' widths, as shares of the room between the margins, one per
		 column and summing to a hundred; empty is an even split. "28 32 32 8"
		 is the NASA sheet, its last column a fifth of the first. Shares, not
		 weights: a weight rescaled every other column when one moved, and on a
		 right-hand column the shift landed mostly on its left bar (Hailei,
		 2026-09-12). A share moves one bar — the column's right bar, the last
		 column taking up the difference; the last column's own slider moves
		 its left bar — and everything to the left stays where it was. */
	/* The values the tool opens on are Hailei's own sheet, saved as the
		 defaults at his word (2026-09-12: "save my current config as the
		 default values") — three columns 30 39 30 wide, a short fat red second
		 bar, bands at 70, weight 2.8, the deal skewed 30 and split 4, nodes
		 stacked small up. Every dial marked "Hailei's sheet" below is one of
		 them. */
	width: "30 39 30",         /* Hailei's sheet */
	/* How many nodes each column holds, exactly: one number for every column
		 or one per column, the last repeating — "15 9 6 24 40" is how the NASA
		 sheet's shape (two countries, forty universities) is asked for. Kept
		 as text, since the slider writes one thumb per column into it. */
	nodes: "9 10 9 9",         /* Hailei's sheet */
	/* Records, one per line, fields separated by tabs (or by commas when the
		 text has no tab), one field per column. With data the flow IS the data:
		 LINES, SECTIONS, NODES, SKEW and TANGLE step aside, every column holds
		 one node per distinct value, and every thread runs through the values
		 its record names. Empty, the sheet is rolled as before. A rolled flow
		 can only ever approximate a real diagram; this is how the NASA
		 astronaut sheet is drawn exactly (Hailei, 2026-09-11). */
	data: "",
	/* How unequal the first column's nodes are. 25 is the natural roll — a
		 random composition, every shape as likely as every other. Towards 100
		 the column goes to a few big nodes and a fringe of single-thread ones,
		 which is a census: the NASA sheet's United States beside twelve
		 countries of one astronaut each. Towards 0 the nodes even out. */
	skew: 30,                  /* Hailei's sheet */
	/* How tangled the flow is between one column and the next, 0 to 100. At 0
		 every node's runs go to its favourite nodes and the section reads tidy;
		 at 100 any target at all, and the section tangles. The middle is where
		 a sheet looks like a census: most of a node goes one way, the rest
		 leak. One number for every span, or one per span — "20 55 80 85" is
		 the astronaut sheet, sharp at the country and loose by the university.
		 Was MIX, which said nothing (Hailei, 2026-09-12). */
	tangle: "30",
	/* How many ways a node's bundle is cut at the next column. Every node's
		 threads are dealt into this many runs of rolled size, each run going
		 whole to its own node of the next column — so from left to right the
		 bands halve, quarter, and thin, the way a census does: one country,
		 a dozen ranks, fifty majors, a hundred schools (Hailei, 2026-09-12).
		 1 sends every node whole; TANGLE decides how the runs choose their nodes. */
	split: 4,                  /* Hailei's sheet */
	/* What a flow is drawn as. A thread is one hair per record — the sibling
		 tool's texture. A band is one shape per flow, as wide as the records it
		 carries: a flow of one record is a hairline and a flow of seventy a broad
		 band, which is where the width of an alluvial's lines comes from (Hailei,
		 2026-09-11 — "bands are needed too"). BOTH lays the threads over their
		 bands, as the NASA and Bonanno sheets do. */
	body: "both",              /* threads | bands | both */
	bandWidth: 70,             /* how much of its slot a band fills, %; Hailei's sheet */
	bandAlpha: 50,             /* per-band opacity, %; Hailei's sheet */
	bandVary: 30,
	/* Bar width and the air between bars, in thousandths of the sheet height —
		 the same unit WEIGHT uses, for the same reason: a sheet exported at four
		 times the height keeps its proportions. Both are series like SPREAD:
		 one for every column, two for first and last, or one per column. The
		 NASA sheet's columns are mostly air, and not the same air — measured,
		 its first column stands 19 thousandths apart and its age column 8 —
		 and a designer wants one column's bar heavier than another's. The
		 brief (Hailei, 2026-09-12): a column's height, width and place are
		 the designer's; the segments a column is cut into are rolled. */
	bar: "4 70 4 4",           /* Hailei's sheet: a fat second bar */
	gap: "10",
	/* Each bar's colour: a series of hexes, one per bar with the last
		 repeating (Hailei, 2026-09-12). On the dark ground a black bar is a cut:
		 the reorder under it simply is not drawn. Hailei's sheet opens with its
		 fat second bar in red. */
	barColour: "#000000 #d10200 #000000",
	/* How tall each bar stands, as a share of the sheet height, every bar
		 centred on the sheet's middle whatever its height (Hailei,
		 2026-09-12). Two numbers are the first and last bars with the rest
		 stepping between them, which is how a diagram tapers; one per bar sets
		 each exactly, which is how it gets a waist. At a hundred every thread
		 is whole inside the frame; Hailei's sheet opens with its second bar
		 at fifteen. */
	spread: "100 15 100 100",
	/* Where a bar shorter than the sheet stands, as a share of the room it
		 leaves: 0 at the top, 50 centred, 100 at the bottom (Hailei, 2026-09-12:
		 "the bars' vertical positions can also be moved if the height is not
		 100%"). A series like SPREAD. At full height there is no room and the
		 dial is held. */
	place: "50",
	/* The order of nodes down each column: rolled is whatever the deal gave
		 (with data, the order the values first appear), big stacks the largest
		 at the top, small at the bottom, az and za sort data by name from the
		 top or from the bottom. One word for every column or one per column,
		 the last repeating. The NASA sheet is "big small rolled" when rolled
		 and "za" when drawn from its data: the United States heads its column,
		 "didn't serve" closes the next, and the bands between them sweep the
		 whole height — one order for every column would run the big flows
		 straight across. */
	order: "small",            /* Hailei's sheet */
	/* How far the last column's nodes are pulled back across the last span,
		 each to its own rolled place. The Bonanno sheet's provinces sit
		 scattered over the right two thirds of the page, every one at its own
		 x, and the threads end where their node is. 0 is an aligned column. */
	scatter: 0,
	/* The slack in every span: 0 is straight, 100 fully slack. A span is one
		 S-curve — level at both bars, one turn between — and CURVE is the only
		 thing that shapes it. The sibling tool's rolled waypoints were offered
		 here too and withdrawn: a real alluvial's flows make one turn each, and
		 a second is a different kind of drawing (Hailei, 2026-09-12). */
	tension: 51,               /* Hailei's sheet */
	/* One weight for every thread, counted in thousandths of the sheet height
		 rather than in pixels: the sheet is exported at whatever height the job
		 needs, and a weight fixed in pixels would thicken or vanish with it. */
	weight: 2.8,               /* Hailei's sheet */
	weightVary: 50,
	alphaVary: 60,
	ground: "#0b0b0b",
	/* Eight slots always held, COLOURS deciding how many are in play. Kept whole
		 rather than truncated so that turning the count down and back up returns
		 the colours the designer chose, instead of a fresh derivation. */
	palette: [ "#e8e2d0", "#c8a24a", "#7fa8b8", "#c8102e", "#8a8f6b", "#d97a3c", "#5f6b8a", "#b9c4a0" ],
	colours: 3,
	/* origin: a thread keeps its first node's colour to the end, and the first
		 column's nodes are painted in unbroken runs. section: every span takes
		 its column's colour, the way the astronaut sheet changes hue per stage.
		 node: every span takes the colour of the node it leaves, the shelf
		 cycling down the column. tail: section colours until the last span,
		 which takes the colour of the node it leaves, the shelf carrying on
		 from where the sections stopped — the astronaut sheet, one hue per
		 stage and then a fan of many. */
	colourBy: "origin",
	accent: "#c8102e",
	alpha: 22,                 /* per-thread opacity, % */
	/* No blend mode: the sheet composites normally and nothing else was
		 wanted (Hailei, 2026-09-12). */
	/* No sparks. The sibling lights its crossings; an alluvial's crossings are
		 bands crossing bands, an even lattice, and lit it was a grid of white
		 stitched over the drawing. The feature was carried for a while, then
		 taken out altogether (Hailei, 2026-09-12: not needed). */
	ratio: 21 / 9,             /* Hailei, 2026-09-12 */
	outH: 1080,
	/* How large the sheet is shown, and nothing else. It never reaches buildSvg,
		 so SVG and PNG leave at their full size whatever the screen is doing. */
	zoom: 100
}
/* The sheet the tool opens with, kept so that the address can carry only
	 what differs from it. */
const DEFAULTS = JSON.parse( JSON.stringify( state ) )

/* Seeded noise. mulberry32: eight lines, a full period long enough for any
	 sheet, and identical in every engine — which is the whole point, because a
	 seed that draws a different picture on another machine is not a seed. */
function mulberry( a ){
	return function(){
		a = ( a + 0x6D2B79F5 ) | 0
		let t = Math.imul( a ^ ( a >>> 15 ), 1 | a )
		t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296
	}
}

/* ══════════════════════════════════════════════════════════
	 2. Colour
	 ══════════════════════════════════════════════════════════ */
/* Enough colour maths to read a typed hex back, to judge whether the
	 interface should write in black or white over the ground, and to run the
	 picker: OKLCH both ways and the sRGB gamut edge, the house's colour space
	 as in the Gradient tool (Hailei, 2026-09-12). Nothing on the sheet is
	 interpolated or derived — every colour is chosen by hand and used as
	 given; the perceptual space is for choosing, not for drawing. */
function hexToRgb( hex ){
	const clean = String( hex ).trim().replace( /^#/, "" )
	const full = clean.length === 3
		? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
		: clean
	if( !/^[0-9a-fA-F]{6}$/.test( full ) ) return null
	return [ parseInt( full.slice( 0, 2 ), 16 ),
		parseInt( full.slice( 2, 4 ), 16 ),
		parseInt( full.slice( 4, 6 ), 16 ) ]
}
function rgbToHex( r, g, b ){
	const byte = function( v ){
		return Math.max( 0, Math.min( 255, Math.round( v ) ) ).toString( 16 ).padStart( 2, "0" )
	}
	return "#" + byte( r ) + byte( g ) + byte( b )
}
/* sRGB ↔ OKLab ↔ OKLCH on 0…1 channels, Björn Ottosson's matrices. */
function clamp01( v ){ return Math.max( 0, Math.min( 1, v ) ) }
function srgbToLinear( c ){ return c <= 0.04045 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 ) }
function linearToSrgb( c ){ return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow( c, 1 / 2.4 ) - 0.055 }
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
	return [ lab[0], Math.hypot( lab[1], lab[2] ), ( Math.atan2( lab[2], lab[1] ) * 180 / Math.PI + 360 ) % 360 ]
}
function oklchToOklab( lch ){
	const r = lch[2] * Math.PI / 180
	return [ lch[0], lch[1] * Math.cos( r ), lch[1] * Math.sin( r ) ]
}
function inGamut( rgb ){ return rgb.every( function( v ){ return v >= -0.0008 && v <= 1.0008 } ) }
/* Out of sRGB: hold lightness and hue, bisect chroma down until it fits. */
function gamutFit( lch ){
	const L = clamp01( lch[0] )
	let rgb = oklabToRgb( oklchToOklab( [ L, lch[1], lch[2] ] ) )
	if( inGamut( rgb ) ) return rgb.map( clamp01 )
	let lo = 0, hi = lch[1]
	for( let i = 0; i < 22; i++ ){
		const mid = ( lo + hi ) / 2
		rgb = oklabToRgb( oklchToOklab( [ L, mid, lch[2] ] ) )
		if( inGamut( rgb ) ) lo = mid; else hi = mid
	}
	return oklabToRgb( oklchToOklab( [ L, lo, lch[2] ] ) ).map( clamp01 )
}
/* The highest chroma sRGB can hold at this lightness and hue — the right
	 edge of the picker's field, so every point in it is a colour the sheet can
	 carry. */
function chromaEdge( L, h ){
	let lo = 0, hi = 0.44
	for( let i = 0; i < 18; i++ ){
		const mid = ( lo + hi ) / 2
		if( inGamut( oklabToRgb( oklchToOklab( [ L, mid, h ] ) ) ) ) lo = mid; else hi = mid
	}
	return lo
}
function lchToHex( lch ){
	const rgb = gamutFit( lch )
	return rgbToHex( rgb[0] * 255, rgb[1] * 255, rgb[2] * 255 )
}
function hexToLch( hex ){
	const rgb = hexToRgb( hex ) || [ 0, 0, 0 ]
	return oklabToOklch( rgbToOklab( [ rgb[0] / 255, rgb[1] / 255, rgb[2] / 255 ] ) )
}
/* A rolled shelf: eight colours off one base hue (Hailei, 2026-09-12: "a
	 randomise button for colours"). The hues step round the wheel by the golden
	 angle from the base, each jittered a little, so the eight are spread and
	 never alike; chroma stays muted, the way the house shelf is, with one slot
	 in three allowed a little more voice but none past 0.13 — a first roll at
	 0.18 came up neon cyan; lightness sits between 0.55 and 0.88, where a
	 line reads on a dark ground and still on a pale one. Chroma past the
	 gamut edge is fitted, not clipped. */
function rollPalette( rand ){
	const base = rand() * 360
	const out = []
	for( let i = 0; i < 8; i++ ){
		const hue = ( base + i * 137.508 + ( rand() - 0.5 ) * 24 + 360 ) % 360
		const chroma = i % 3 === 0 ? 0.08 + rand() * 0.05 : 0.03 + rand() * 0.06
		const light = 0.55 + rand() * 0.33
		out.push( lchToHex( [ light, chroma, hue ] ) )
	}
	return out
}
/* Relative luminance, the plain sRGB-weighted kind. Used for one decision only:
	 whether the toolbar writes in black or in white over the ground. */
function lightness( hex ){
	const rgb = hexToRgb( hex ) || [ 0, 0, 0 ]
	return ( 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] ) / 255
}

/* ══════════════════════════════════════════════════════════
	 3. Flow
	 ══════════════════════════════════════════════════════════ */
/* Who sits where. This section decides, for every thread, which node it
	 occupies in every column and where inside that node it sits — and nothing
	 about pixels. Geometry in section 4 only turns seats into heights. Keeping
	 the two apart is what makes the seating provable: the self-test asserts
	 facts about seats, and the drawing cannot break them. */

/* n things cut into `parts` runs of rolled size. The cuts are taken at random
	 from the n-1 places between them, which is the honest way to draw a random
	 composition of n into P parts: every shape of run is as likely as every
	 other, so the result looks found rather than ruled. Dealing evenly, or by
	 proportion, always leaves a visible regularity. */
function randomPartition( count, parts, rand ){
	const P = Math.max( 1, Math.min( parts, count ) )
	if( P === 1 ) return [ count ]
	const places = []
	for( let i = 1; i < count; i++ ) places.push( i )
	for( let i = places.length - 1; i > 0; i-- ){
		const j = Math.floor( rand() * ( i + 1 ) )
		const t = places[i]; places[i] = places[j]; places[j] = t
	}
	const cuts = places.slice( 0, P - 1 ).sort( function( a, b ){ return a - b } )
	const sizes = []
	let last = 0
	cuts.forEach( function( c ){ sizes.push( c - last ); last = c } )
	sizes.push( count - last )
	return sizes
}
/* One draw from a weighted shelf. */
function pick( weights, r ){
	let total = 0
	for( let b = 0; b < weights.length; b++ ) total += weights[b]
	if( total <= 0 ) return 0
	let acc = 0
	for( let b = 0; b < weights.length; b++ ){
		acc += weights[b]
		if( r * total < acc ) return b
	}
	return weights.length - 1
}
/* The NODES field read: one exact count per column, the last entry repeating
	 when the list is shorter than the sections, and no column holding more
	 nodes than there are threads. Exact, because the count is a slider thumb
	 now and a thumb that meant "somewhere under this" would lie. */
function nodeRooms( text, S, n ){
	const list = String( text ).trim().split( /[\s,]+/ ).map( Number )
		.filter( function( v ){ return v >= 1 } ).map( Math.floor )
	if( !list.length ) list.push( 1 )
	const rooms = []
	for( let k = 0; k < S; k++ ) rooms.push( Math.min( n, entryAt( list, k ) ) )
	return rooms
}
/* The DATA field read: one record per line, fields split on tabs, or on
	 commas when the text has no tab. Blank lines are skipped. Null when there
	 is nothing, when a line has a different number of fields from the first,
	 or when there is only one column — a diagram needs two. */
function records( text ){
	const lines = String( text ).split( /\r?\n/ ).map( function( l ){ return l.trim() } ).filter( Boolean )
	if( !lines.length ) return null
	const sep = String( text ).indexOf( "\t" ) >= 0 ? "\t" : ","
	const rows = lines.map( function( l ){ return l.split( sep ).map( function( f ){ return f.trim() } ) } )
	const width = rows[0].length
	if( width < 2 || rows.some( function( r ){ return r.length !== width } ) ) return null
	return rows
}
/* The flow the records describe. Each column's nodes are its distinct values
	 in order of first appearance; each thread's node in a column is the value
	 its record names there. Nothing is rolled: the count of a flow between two
	 values is exactly the records that carry both. */
function flowsFromRows( rows ){
	const S = rows[0].length
	const assign = [], counts = [], names = []
	for( let k = 0; k < S; k++ ){
		const index = new Map(), list = []
		assign.push( rows.map( function( r ){
			if( !index.has( r[k] ) ){ index.set( r[k], list.length ); list.push( r[k] ) }
			return index.get( r[k] )
		} ) )
		counts.push( list.length ); names.push( list )
	}
	return { assign:assign, counts:counts, names:names }
}
/* ORDER. Nodes are renumbered down a column by size, largest first or
	 smallest first, or by name from the top or the bottom; a tie keeps the
	 order they came in. Done before the seats are ranked, so that the seating
	 and the colours see the final numbering and nothing downstream has to
	 know. A rolled sheet has no names, so az and za leave it as dealt. */
function reorder( flow, orders ){
	for( let k = 0; k < flow.assign.length; k++ ){
		const mode = entryAt( orders, k )
		if( mode === "rolled" ) continue
		const names = flow.names ? flow.names[k] : null
		if( ( mode === "az" || mode === "za" ) && !names ) continue
		const size = new Array( flow.counts[k] ).fill( 0 )
		flow.assign[k].forEach( function( a ){ size[a]++ } )
		const ids = size.map( function( s, a ){ return a } )
		ids.sort( function( a, b ){
			if( mode === "big" ) return ( size[b] - size[a] ) || a - b
			if( mode === "small" ) return ( size[a] - size[b] ) || a - b
			const byName = names[a].localeCompare( names[b], undefined, { sensitivity:"base" } )
			return ( mode === "az" ? byName : -byName ) || a - b
		} )
		const remap = []
		ids.forEach( function( a, j ){ remap[a] = j } )
		flow.assign[k] = flow.assign[k].map( function( a ){ return remap[a] } )
		if( names ) flow.names[k] = ids.map( function( a ){ return names[a] } )
	}
	return flow
}
/* A typed series: numbers separated by spaces or commas. The fields that
	 hold one are validated as they are typed, so state never carries a bad one. */
function series( text ){
	return String( text ).trim().split( /[\s,]+/ ).map( Number ).filter( function( v ){ return v === v } )
}
/* One entry per span, the last repeating. */
function entryAt( list, k ){ return list[ Math.min( k, list.length - 1 ) ] }
/* A typed series of hexes, read the same way: each token brought to #rrggbb
	 and a token that is no hex dropped, so a bad address paints nothing odd. */
function hexes( text ){
	return String( text ).trim().split( /[\s,]+/ ).map( function( token ){
		const rgb = hexToRgb( token )
		return rgb ? rgbToHex( rgb[0], rgb[1], rgb[2] ) : null
	} ).filter( Boolean )
}
/* The WIDTH field read for C columns: C shares summing to a hundred. A list
	 of any other length, or an empty one, is an even split — so a change of
	 COLUMNS starts the widths afresh rather than carrying a list that no
	 longer fits. */
function widthsOf( text, C ){
	const list = series( text ).filter( function( v ){ return v > 0 } )
	if( list.length !== C ){
		const even = []
		for( let k = 0; k < C; k++ ) even.push( 100 / C )
		return even
	}
	let total = 0
	list.forEach( function( v ){ total += v } )
	return list.map( function( v ){ return v * 100 / total } )
}
/* The series stretched over `count` columns: one entry stands everywhere,
	 two run first to last, and any other number places its own columns with
	 the rest stepping between them. */
function stretched( list, k, count ){
	if( list.length === 1 || count === 1 ) return list[0]
	const pos = k / ( count - 1 ) * ( list.length - 1 )
	const a = Math.floor( pos ), b = Math.min( list.length - 1, a + 1 )
	return list[a] + ( list[b] - list[a] ) * ( pos - a )
}
/* n threads cut into `parts` nodes whose sizes follow a power of the natural
	 roll. The spacings between uniform cuts are exponential variates, so a
	 random composition is sizes drawn in proportion to exponentials; raising
	 them to a power p keeps that family and turns one dial. p = 1 is
	 randomPartition's honest roll, p → 0 evens the sizes out, and p = 8 hands
	 the column to one node with a fringe of singletons. SKEW maps 0…100 onto
	 that curve with 25 at the natural roll. Every node keeps at least one
	 thread, taken from the largest. */
function skewedPartition( count, parts, skew, rand ){
	const P = Math.max( 1, Math.min( parts, count ) )
	if( P === 1 ) return [ count ]
	const p = Math.pow( skew / 25, 1.5 )
	const weights = []
	let total = 0
	for( let a = 0; a < P; a++ ){
		const w = Math.pow( -Math.log( 1 - rand() ), p )
		weights.push( w ); total += w
	}
	const raw = weights.map( function( w ){ return total > 0 ? count * w / total : count / P } )
	const sizes = raw.map( Math.floor )
	let left = count
	sizes.forEach( function( s ){ left -= s } )
	const order = raw.map( function( v, a ){ return a } )
	order.sort( function( a, b ){ return ( raw[b] - sizes[b] ) - ( raw[a] - sizes[a] ) } )
	for( let j = 0; j < left; j++ ) sizes[ order[j] ]++
	for( let a = 0; a < P; a++ ){
		while( sizes[a] < 1 ){
			let largest = 0
			for( let c = 1; c < P; c++ ) if( sizes[c] > sizes[ largest ] ) largest = c
			sizes[ largest ]--; sizes[a]++
		}
	}
	return sizes
}
/* n threads dealt through S columns. The first column is a rolled partition;
	 every later column is reached by the flow. Each node's bundle is cut into
	 SPLIT runs of rolled size, and each run goes whole to its own node of the
	 next column, chosen by the node's rolled preference — TANGLE sets how
	 sharp that preference is: at 0 the runs take the node's favourite targets
	 and the section reads tidy, at 100 any target at all and it tangles. So a
	 band never frays into single threads unless the runs are that small; from
	 left to right the bands halve and thin.

	 A room nobody reaches is handed one thread from whichever node holds the
	 most, so a column holds exactly the nodes NODES says (`exact`); without
	 that, unreached rooms are dropped and the rest renumbered. `tangles` is
	 the TANGLE series, one entry per span with the last repeating. */
function flows( n, S, rooms, exact, tangles, skew, split, rand ){
	const assign = [], counts = []
	const first = skewedPartition( n, rooms[0], skew, rand )
	const seats = []
	first.forEach( function( size, a ){ for( let k = 0; k < size; k++ ) seats.push( a ) } )
	assign.push( seats ); counts.push( first.length )
	for( let k = 1; k < S; k++ ){
		const room = rooms[k]
		const m = entryAt( tangles, k - 1 ) / 100
		/* The exponent that sharpens a flat roll into a preference. At m=1 it
			 is 0 and every weight is 1; at m=0.5 the weights are the roll itself;
			 below that they steepen fast. Exactly 0 takes the favourites outright,
			 because no finite power turns two rolls of 0.998 and 0.999 into one
			 and nothing. */
		const sharp = ( 1 - m ) / Math.max( m, 0.01 )
		const members = []
		for( let a = 0; a < counts[ k - 1 ]; a++ ) members.push( [] )
		for( let i = 0; i < n; i++ ) members[ assign[ k - 1 ][i] ].push( i )
		const raw = new Array( n )
		/* Every run dealt, by target, so that an empty room can be filled with
			 a whole run rather than a stray thread. */
		const runs = []
		members.forEach( function( list ){
			const P = Math.max( 1, Math.min( split, room, list.length ) )
			const sizes = randomPartition( list.length, P, rand )
			const w = []
			for( let b = 0; b < room; b++ ) w.push( m === 0 ? rand() : Math.pow( rand(), sharp ) )
			/* P distinct targets, the favourite first and each drawn without
				 replacement, so a node's runs never land on one node twice. */
			const targets = []
			for( let j = 0; j < P; j++ ){
				let b = -1
				if( m === 0 ){
					for( let c = 0; c < room; c++ ) if( w[c] > 0 && ( b < 0 || w[c] > w[b] ) ) b = c
				} else {
					let total = 0
					for( let c = 0; c < room; c++ ) total += w[c]
					if( total > 0 ) b = pick( w, rand() )
				}
				if( b < 0 || w[b] === 0 ){ b = 0; while( targets.indexOf( b ) >= 0 ) b++ }
				targets.push( b ); w[b] = 0
			}
			let at = 0
			sizes.forEach( function( size, j ){
				const run = { target: targets[j], members: list.slice( at, at + size ) }
				run.members.forEach( function( i ){ raw[i] = run.target } )
				runs.push( run )
				at += size
			} )
		} )
		const tally = new Array( room ).fill( 0 )
		raw.forEach( function( b ){ tally[b]++ } )
		if( exact ){
			/* An empty room takes the smallest run from the fullest node that
				 has more than one run, so that a band moves whole and no node is
				 left empty in its turn; only when every node holds a single run
				 does a stray thread move instead. */
			for( let b = 0; b < room; b++ ){
				if( tally[b] ) continue
				const byTarget = []
				runs.forEach( function( run ){ ( byTarget[ run.target ] = byTarget[ run.target ] || [] ).push( run ) } )
				let fullest = -1
				for( let c = 0; c < room; c++ ){
					if( byTarget[c] && byTarget[c].length > 1 && ( fullest < 0 || tally[c] > tally[ fullest ] ) ) fullest = c
				}
				if( fullest >= 0 ){
					const run = byTarget[ fullest ].reduce( function( s, r ){ return r.members.length < s.members.length ? r : s } )
					run.target = b
					run.members.forEach( function( i ){ raw[i] = b } )
					tally[ fullest ] -= run.members.length; tally[b] += run.members.length
					continue
				}
				fullest = 0
				for( let c = 1; c < room; c++ ) if( tally[c] > tally[ fullest ] ) fullest = c
				const held = []
				raw.forEach( function( c, i ){ if( c === fullest ) held.push( i ) } )
				const moved = held[ Math.floor( rand() * held.length ) ]
				raw[ moved ] = b
				tally[ fullest ]--; tally[b]++
			}
		}
		const renumber = []
		let used = 0
		tally.forEach( function( c ){ renumber.push( c ? used++ : -1 ) } )
		assign.push( raw.map( function( b ){ return renumber[b] } ) )
		counts.push( used )
	}
	return { assign:assign, counts:counts, names:null }
}
/* Where inside its node each thread sits, on the way in and on the way out.
	 Arriving threads are stacked by the node they came from, then by their
	 seat there; departing threads by the node they are going to, then by their
	 arriving seat. Every flow between two nodes is then one parallel band on
	 both sides, and the only place a thread changes height without a curve is
	 under the bar. This is the RawGraphs ordering, done per thread. */
function ranks( assign, counts, n, through ){
	const S = assign.length
	const seat = function( k, keyOf ){
		const lists = []
		for( let a = 0; a < counts[k]; a++ ) lists.push( [] )
		for( let i = 0; i < n; i++ ) lists[ assign[k][i] ].push( i )
		const out = new Array( n )
		lists.forEach( function( list ){
			list.sort( function( p, q ){ return keyOf( p ) - keyOf( q ) || p - q } )
			list.forEach( function( i, r ){ out[i] = r } )
		} )
		return out
	}
	const arrival = [], departure = []
	for( let k = 0; k < S; k++ ){
		/* A bar the threads pass straight through seats them once: the first
			 bar in the order they leave, the last in the order they arrive, and
			 a bar of no width in the order they arrive — so no line jogs where
			 there is no bar to hide the jog (Hailei, 2026-09-12: the line ends
			 stood squeezed along a first bar of no width, and a vanished inner
			 bar given room to reorder in read as a fat one). Such a bar's flows
			 braid in the next column instead, cut into runs by the seat order. */
		const straight = k === 0 || k === S - 1 || !!( through && through[k] )
		arrival.push( k === 0
			? seat( 0, function( i ){ return assign[1] ? assign[1][i] * n + i : i } )
			: seat( k, function( i ){ return assign[ k - 1 ][i] * n + departure[ k - 1 ][i] } ) )
		departure.push( straight
			? arrival[k]
			: seat( k, function( i ){ return assign[ k + 1 ][i] * n + arrival[k][i] } ) )
	}
	return { arrival:arrival, departure:departure }
}

/* ══════════════════════════════════════════════════════════
	 4. Geometry
	 ══════════════════════════════════════════════════════════ */
/* A thread is a chain of cubics, every one with x strictly increasing — the
	 property section 5 leans on: without it there is no single y per column
	 and the sweep has nothing to sort. Between two columns the chain is one
	 cubic with level ends — an S with a single turn, the alluvial's line;
	 across a bar it is one short cubic that carries the thread from its
	 arriving seat to its departing one.

	 A band is the same curve drawn twice, once for each edge, and filled. A
	 thread's curve runs from its own seat to its own seat, and because every
	 curve in a span shares one easing, the threads of a flow bend together and
	 the band is exactly their envelope. */
function cubic( p0, c1, c2, p3, t ){
	const u = 1 - t
	return u * u * u * p0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * p3
}
/* The one cubic of a span: level at both ends, its handles kb of the way in
	 from each. Returned as a one-segment chain so the sampler and the path
	 writer see the same shape they see for a bridge. */
function chain( pts, kb ){
	const dx = pts[1][0] - pts[0][0]
	return [ [ pts[0][0], pts[0][1],
		pts[0][0] + dx * kb, pts[0][1],
		pts[1][0] - dx * kb, pts[1][1],
		pts[1][0], pts[1][1] ] ]
}
/* The short cubic across a bar, arriving seat to departing seat. Handles at
	 half the width whatever CURVE says: the bar is not a span, and slack that
	 varied per thread would make the weave under a switched-off bar uneven. */
function bridge( x0, y0, x1, y1 ){
	const dx = x1 - x0
	return [ x0, y0, x0 + dx * 0.5, y0, x1 - dx * 0.5, y1, x1, y1 ]
}
function layout( W, H ){
	const rand = mulberry( state.seed | 0 )
	/* With data, the records decide how many threads and columns there are
		 and where every thread goes; the rolled dials are not consulted. */
	const rows = state.data ? records( state.data ) : null
	const n = rows ? rows.length : state.lines
	/* S is the number of bars: one more than the columns. With data, one bar
		 per field. */
	const S = rows ? rows[0].length : Math.max( 1, Math.min( 7, state.columns ) ) + 1
	/* Half the fattest stroke a thread can be dealt. Every column is inset by
		 it, so a spread of 100% puts the outermost thread's EDGE on the sheet's
		 edge rather than its centre. */
	const weight = Math.max( 0.05, state.weight * H / 1000 )
	const pad = weight * ( 1 + state.weightVary / 100 ) / 2
	const gaps = series( state.gap )
	/* Where the bars stand, in pixels: the diagram fills the canvas edge to
		 edge (Hailei, 2026-09-12 — the canvas is the margin), the first bar's
		 outer edge on the left side and the last bar's on the right, and the
		 columns' shares fill the room between. Each bar is the seam between
		 two columns. A bar's thickness is read here before the loop below
		 reads it again, because the room depends on the two end bars. */
	const bars = series( state.bar )
	const thickAt = function( k ){ return Math.min( W / 2 - 0.01, Math.max( 0.5, stretched( bars, k, S ) * H / 1000 ) ) }
	const shares = widthsOf( state.width, S - 1 )
	const left = thickAt( 0 ) / 2, room = W - left - thickAt( S - 1 ) / 2
	const places = []
	let cum = 0
	for( let k = 0; k < S; k++ ){
		places.push( left + room * cum / 100 )
		if( k < S - 1 ) cum += shares[k]
	}
	const orders = String( state.order ).trim().toLowerCase().split( /[\s,]+/ )
	let flow
	if( rows ) flow = flowsFromRows( rows )
	else {
		flow = flows( n, S, nodeRooms( state.nodes, S, n ), true, series( state.tangle ), state.skew, state.split, rand )
	}
	reorder( flow, orders )
	/* A bar of no width is passed straight through: nothing is drawn and
		 nothing is reordered under it. */
	const through = []
	for( let k = 0; k < S; k++ ) through.push( stretched( bars, k, S ) <= 0 )
	const rank = ranks( flow.assign, flow.counts, n, through )
	/* The bars — held in `columns`, the engine's older word for a stack of
		 nodes; the interface's "column" is the section between two of them.
		 Each fills its own spread: gaps are taken out of the run and the rest
		 is dealt to the threads, so a bar's seat height is its own. d3-sankey
		 would use one scale for every bar and leave the emptier ones short;
		 here SPREAD is explicit and a bar that did not reach its share would be
		 a dial that lied. */
	const spreads = series( state.spread ), places_ = series( state.place )
	const columns = []
	for( let k = 0; k < S; k++ ){
		const spread = stretched( spreads, k, S )
		const run = Math.max( 0, H - 2 * pad ) * spread / 100
		/* A bar stands where PLACE puts it in the room its height leaves: 0 at
			 the top, 50 centred — the opening place — 100 at the bottom. */
		const top = pad + Math.max( 0, H - 2 * pad - run ) * stretched( places_, k, S ) / 100
		const count = flow.counts[k]
		const sizes = new Array( count ).fill( 0 )
		flow.assign[k].forEach( function( a ){ sizes[a]++ } )
		/* The air can never eat more than three quarters of the run: a column
			 of a hundred nodes at a wide GAP would otherwise squeeze its threads
			 to nothing. Three quarters, not half — the NASA sheet's first column
			 is 58% air, one bar and twelve gaps. */
		const gapPx = stretched( gaps, k, S ) * H / 1000
		const air = count > 1 ? Math.min( gapPx * ( count - 1 ), run * 0.75 ) : 0
		const unit = ( run - air ) / n
		const gap = count > 1 ? air / ( count - 1 ) : 0
		const nodes = []
		const x = places[k]
		let y = top
		/* This bar's thickness, in pixels, carried on every node. There is no
			 ceiling but the sheet: a bar may be anything under half its width
			 (Hailei, 2026-09-12), and the field refuses more — this cap only
			 catches a preset whose ratio changed after its widths were typed.
			 Nor is there a floor: at 0 no bar is drawn at all (Hailei,
			 2026-09-12), while the geometry keeps a half-pixel seam so that the
			 reorder under the bar still has an x to happen in and the scan still
			 has a column to hide it under. */
		const thick = stretched( bars, k, S ) * H / 1000
		const bw = thickAt( k )
		sizes.forEach( function( size ){
			nodes.push( { x:x, bw:bw, drawn: thick > 0, top:y, height:size * unit, count:size } )
			y += size * unit + gap
		} )
		columns.push( { x:x, unit:unit, nodes:nodes } )
	}
	/* SCATTER. Each node of the last column is pulled back across the last
		 span to its own rolled place, never closer than a fifth of the span to
		 the column before it. The roll is taken whatever SCATTER says and scaled
		 afterwards, so moving the slider slides the nodes rather than redealing
		 the sheet. */
	if( S > 1 ){
		const widest = Math.max.apply( null, columns[ S - 2 ].nodes.map( function( node ){ return node.bw } ) )
		columns[ S - 1 ].nodes.forEach( function( node ){
			const back = columns[ S - 1 ].x - columns[ S - 2 ].x - ( widest + node.bw ) / 2
			node.x -= rand() * back * 0.8 * state.scatter / 100
		} )
	}
	/* Colour. ORIGIN paints the first column's nodes in unbroken runs of rolled
		 length, which colour lands on which run rolled too — so the assignment
		 is random while every colour still reads as one bundle rather than
		 confetti. SECTION hands each span its column's colour in shelf order,
		 so the designer's shelf reads left to right across the sheet. */
	const shelf = state.palette.slice( 0, Math.max( 1, Math.min( state.colours, state.palette.length ) ) )
	let inks = null
	if( state.colourBy === "origin" ){
		const deck = shelf.slice( 0, Math.min( shelf.length, flow.counts[0] ) )
		for( let i = deck.length - 1; i > 0; i-- ){
			const j = Math.floor( rand() * ( i + 1 ) )
			const t = deck[i]; deck[i] = deck[j]; deck[j] = t
		}
		inks = []
		randomPartition( flow.counts[0], deck.length, rand ).forEach( function( size, ci ){
			for( let k = 0; k < size; k++ ) inks.push( deck[ci] )
		} )
	}
	/* The colour a thread carries through span k, before the accent has its
		 say. Bands are cut on this, so the accent hair rides inside the band its
		 flow would have had rather than wearing a red band of its own. */
	const inkOf = function( i, k ){
		if( state.colourBy === "node" ) return shelf[ flow.assign[k][i] % shelf.length ]
		if( state.colourBy === "tail" && k === S - 2 ) return shelf[ ( k + flow.assign[k][i] ) % shelf.length ]
		return inks ? inks[ flow.assign[0][i] ] : shelf[ k % shelf.length ]
	}
	/* One thread in the accent colour — the 2023 sheet has a single red hair
		 and the whole composition hangs off it. It differs in colour and in
		 nothing else: at full opacity against its neighbours' alpha, one hair
		 is enough. */
	const accentAt = Math.floor( rand() * n )
	const alpha = state.alpha / 100
	const bandAlpha = state.bandAlpha / 100
	/* Held inside 0.05…0.98 because that is exactly the range over which a
		 cubic whose handles sit at k and 1-k of its own span keeps dx/dt ≥ 0.
		 Past it the curve doubles back in x and the sampler loses its one y per
		 column. One easing for the whole sheet, so every band stays parallel to
		 its neighbours. */
	const kb = Math.max( 0.05, Math.min( 0.98, state.tension / 100 ) )
	const spin = function( amount ){ return 1 + ( rand() * 2 - 1 ) * amount / 100 }
	/* Seats: where every thread sits in every column, arriving and leaving. */
	const yIn = [], yOut = []
	for( let k = 0; k < S; k++ ){
		const col = columns[k]
		const a = new Float64Array( n ), d = new Float64Array( n )
		for( let i = 0; i < n; i++ ){
			const node = col.nodes[ flow.assign[k][i] ]
			a[i] = node.top + col.unit * ( rank.arrival[k][i] + 0.5 )
			d[i] = node.top + col.unit * ( rank.departure[k][i] + 0.5 )
		}
		yIn.push( a ); yOut.push( d )
	}
	/* Bands. In every span the threads are gathered by the two nodes they run
		 between, taken in seat order, and cut wherever the colour changes — so
		 in ORIGIN a flow that carries several origins becomes one band per run
		 of colour, the way a lodes chart draws it, and in SECTION or NODE a flow
		 is one band. A band's threads are contiguous at both ends and in the
		 same order at both, which section 3's ordering guarantees and the
		 self-test asserts; that is what lets the band be drawn from its two
		 outer seats alone. */
	const bands = [], place = []
	for( let k = 0; k < S - 1; k++ ){
		const uOut = columns[k].unit, uIn = columns[ k + 1 ].unit
		const groups = new Map()
		for( let i = 0; i < n; i++ ){
			const key = flow.assign[k][i] * flow.counts[ k + 1 ] + flow.assign[ k + 1 ][i]
			const g = groups.get( key )
			if( g ) g.push( i ); else groups.set( key, [ i ] )
		}
		const runs = [], seat = new Array( n )
		const make = function( members ){
			const len = members.length, first = members[0]
			/* A span runs from the departing bar's right edge to the arriving
				 bar's left edge — each bar's own edge, since bars have their own
				 widths. */
			const nodeOut = columns[k].nodes[ flow.assign[k][ first ] ]
			const nodeIn = columns[ k + 1 ].nodes[ flow.assign[ k + 1 ][ first ] ]
			const xa = nodeOut.x + nodeOut.bw / 2
			const xb = nodeIn.x - nodeIn.bw / 2
			const cOut = yOut[k][ first ] + uOut * ( len - 1 ) / 2
			const cIn = yIn[ k + 1 ][ first ] + uIn * ( len - 1 ) / 2
			/* One S from seat to seat. `delta` is kept in the signature for the
				 band's edges, which are the same curve from the outermost seats. */
			const copy = function( delta, y0, y1 ){
				return chain( [ [ xa, y0 ], [ xb, y1 ] ], kb )
			}
			const b = { members:members, len:len, colour: inkOf( first, k ),
				xa:xa, xb:xb, cOut:cOut, cIn:cIn, uOut:uOut, uIn:uIn, copy:copy,
				alpha: Math.max( 0.004, Math.min( 1, bandAlpha * spin( state.bandVary ) ) ) }
			members.forEach( function( i, j ){ seat[i] = { band:b, delta: j - ( len - 1 ) / 2 } } )
			return b
		}
		/* A flow is cut into runs where its colour changes, and where its seats
			 stop being consecutive — which only happens after a bar of no width,
			 whose threads leave in the order they arrived and so braid with
			 their neighbours' in this column. Every run is then a band drawn
			 honestly from its two outer seats. */
		groups.forEach( function( list ){
			list.sort( function( p, q ){ return rank.departure[k][p] - rank.departure[k][q] } )
			let start = 0
			for( let j = 1; j <= list.length; j++ ){
				if( j < list.length && inkOf( list[j], k ) === inkOf( list[ start ], k ) &&
					rank.departure[k][ list[j] ] === rank.departure[k][ list[ j - 1 ] ] + 1 ) continue
				runs.push( make( list.slice( start, j ) ) )
				start = j
			}
		} )
		bands.push( runs ); place.push( seat )
	}
	const ribbons = []
	for( let i = 0; i < n; i++ ){
		const isAccent = i === accentAt && state.accent
		const tIn = [], tOut = []
		for( let k = 0; k < S; k++ ){ tIn.push( yIn[k][i] ); tOut.push( yOut[k][i] ) }
		const segs = [], spans = []
		const node0 = columns[0].nodes[ flow.assign[0][i] ]
		segs.push( bridge( node0.x - node0.bw / 2, tIn[0], node0.x + node0.bw / 2, tOut[0] ) )
		for( let k = 0; k < S - 1; k++ ){
			const from = k === 0 ? 0 : segs.length
			const p = place[k][i]
			const nodeIn = columns[ k + 1 ].nodes[ flow.assign[ k + 1 ][i] ]
			const half = nodeIn.bw / 2
			p.band.copy( p.delta, tOut[k], tIn[ k + 1 ] ).forEach( function( s ){ segs.push( s ) } )
			segs.push( bridge( nodeIn.x - half, tIn[ k + 1 ], nodeIn.x + half, tOut[ k + 1 ] ) )
			spans.push( { from:from, to:segs.length - 1, colour: isAccent ? state.accent : p.band.colour } )
		}
		ribbons.push( {
			segs:segs, spans:spans, yIn:tIn, yOut:tOut,
			/* Weight and alpha are rolled per thread, each off its own base. The
				 accent keeps the base of both: it is one hair whose whole job is
				 to be followed across the sheet, and a faint one cannot be. */
			w: isAccent ? weight : Math.max( 0.04, weight * spin( state.weightVary ) ),
			alpha: isAccent ? 1 : Math.max( 0.004, Math.min( 1, alpha * spin( state.alphaVary ) ) ),
			accent: isAccent
		} )
	}
	/* The sheet's scanned extent: the leftmost bar edge to the rightmost. */
	const edges = function( col, sign ){
		return Math.max.apply( null, col.nodes.map( function( node ){ return sign * ( node.x + sign * node.bw / 2 ) } ) ) * sign
	}
	return { W:W, H:H, columns:columns, ribbons:ribbons, bands:bands,
		xL: edges( columns[0], -1 ), xR: edges( columns[ S - 1 ], 1 ),
		assign: flow.assign, counts: flow.counts, names: flow.names, inks:inks,
		arrival: rank.arrival, departure: rank.departure, records:n, bars:S }
}
/* A band's two edges at the WIDTH share asked for, as chains. */
function bandEdges( b, share ){
	const d = b.len / 2 * share
	return {
		top: b.copy( -d, b.cOut - d * b.uOut, b.cIn - d * b.uIn ),
		bottom: b.copy( d, b.cOut + d * b.uOut, b.cIn + d * b.uIn )
	}
}
/* The closed path of a band: the top edge forward, the bottom edge back. */
function bandPath( edges ){
	const f = function( v ){ return v.toFixed( 2 ) }
	const top = edges.top, bottom = edges.bottom
	let d = "M" + f( top[0][0] ) + " " + f( top[0][1] )
	for( let i = 0; i < top.length; i++ ){
		const s = top[i]
		d += "C" + f( s[2] ) + " " + f( s[3] ) + " " + f( s[4] ) + " " + f( s[5] ) +
			" " + f( s[6] ) + " " + f( s[7] )
	}
	const last = bottom[ bottom.length - 1 ]
	d += "L" + f( last[6] ) + " " + f( last[7] )
	for( let i = bottom.length - 1; i >= 0; i-- ){
		const s = bottom[i]
		d += "C" + f( s[4] ) + " " + f( s[5] ) + " " + f( s[2] ) + " " + f( s[3] ) +
			" " + f( s[0] ) + " " + f( s[1] )
	}
	return d + "Z"
}
function pathOf( segs, from, to ){
	const f = function( v ){ return v.toFixed( 2 ) }
	let d = "M" + f( segs[ from ][0] ) + " " + f( segs[ from ][1] )
	for( let i = from; i <= to; i++ ){
		const s = segs[i]
		d += "C" + f( s[2] ) + " " + f( s[3] ) + " " + f( s[4] ) + " " + f( s[5] ) +
			" " + f( s[6] ) + " " + f( s[7] )
	}
	return d
}
/* A thread's spans, neighbours of one colour joined into one path. In ORIGIN
	 mode that is the whole thread as one element; in SECTION mode one element
	 per span, meeting butt to butt at each bar's far edge. */
function paths( r ){
	const out = []
	let from = r.spans[0].from, to = r.spans[0].to, colour = r.spans[0].colour
	for( let s = 1; s < r.spans.length; s++ ){
		const span = r.spans[s]
		if( span.colour === colour ){ to = span.to; continue }
		out.push( { d: pathOf( r.segs, from, to ), colour:colour } )
		from = span.from; to = span.to; colour = span.colour
	}
	out.push( { d: pathOf( r.segs, from, to ), colour:colour } )
	return out
}

/* ══════════════════════════════════════════════════════════
	 5. Sampling
	 ══════════════════════════════════════════════════════════ */
/* The self-test reads every thread and band edge off at shared x columns, to
	 hold the frame contract and the band contract on the drawn curve rather
	 than on the seats. This was the crossing sweep's sampler; the sweep and
	 the sparks it lit went on 2026-09-12 (Hailei: not needed) and the sampler
	 stayed for the proof. */
const COLS = 420                    /* x columns every thread is sampled onto */
/* The polyline budget for one thread, shared out over however many cubics it
	 turned out to have. Fixed per thread rather than per segment: a per-segment
	 count would quietly multiply the cost by the number of columns, and the
	 resolution that matters is points-per-column, which this holds steady. */
const PATH_STEPS = 600
/* The columns: a uniform grid joined by both edges of every bar, so a bar's
	 edges are always sampled exactly. */
function sampleColumns( sheet ){
	const raw = []
	for( let k = 0; k < COLS; k++ ) raw.push( sheet.xL + ( sheet.xR - sheet.xL ) * k / ( COLS - 1 ) )
	sheet.columns.forEach( function( c ){ c.nodes.forEach( function( node ){ raw.push( node.x - node.bw / 2 ); raw.push( node.x + node.bw / 2 ) } ) } )
	raw.sort( function( a, b ){ return a - b } )
	const xs = []
	raw.forEach( function( x ){ if( !xs.length || x - xs[ xs.length - 1 ] > 1e-6 ) xs.push( x ) } )
	return { xs: Float64Array.from( xs ) }
}

/* One y per thread per column. The path is walked once as a polyline and then
	 read off at the shared column positions; because x only ever increases, that
	 walk is a single pointer and never searches. Past the end of the path the
	 answer is NaN, not the last y: a thread that ends at a scattered node is
	 not on the sheet beyond it, and a phantom continuation would cross things. */
function sampleRibbon( r, xs ){
	const segs = r.segs
	const steps = Math.max( 16, Math.ceil( PATH_STEPS / segs.length ) )
	const px = [], py = []
	for( let i = 0; i < segs.length; i++ ){
		const seg = segs[i]
		/* Every segment after the first starts where the last one ended, so its
			 t=0 point is already in the list. */
		for( let s = ( i === 0 ? 0 : 1 ); s <= steps; s++ ){
			const t = s / steps
			px.push( cubic( seg[0], seg[2], seg[4], seg[6], t ) )
			py.push( cubic( seg[1], seg[3], seg[5], seg[7], t ) )
		}
	}
	const ys = new Float64Array( xs.length )
	const end = px[ px.length - 1 ] + 1e-6
	let j = 0
	for( let k = 0; k < xs.length; k++ ){
		const x = xs[k]
		if( x > end ){ ys[k] = NaN; continue }
		while( j < px.length - 2 && px[ j + 1 ] < x ) j++
		const span = px[ j + 1 ] - px[j]
		const t = span > 1e-9 ? ( x - px[j] ) / span : 0
		ys[k] = py[j] + ( py[ j + 1 ] - py[j] ) * t
	}
	return ys
}

/* ══════════════════════════════════════════════════════════
	 6. SVG
	 ══════════════════════════════════════════════════════════ */
/* The one place a sheet becomes marks. Preview and both exports call it, so
	 what is on screen is what leaves the tool — there is no second drawing path
	 that could disagree with this one. Order of the layers: ground, bands,
	 threads, bars. No labels: the sheet is graphics, not a chart (Hailei,
	 2026-09-11). Bars go last so the reorder under them stays hidden. */
function buildSvg( W, H ){
	const sheet = layout( W, H )
	const parts = []
	parts.push( "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H +
		"' viewBox='0 0 " + W + " " + H + "'>" )
	parts.push( "<rect width='" + W + "' height='" + H + "' fill='" + state.ground + "'/>" )

	let banded = 0
	if( state.body !== "threads" ){
		parts.push( "<g>" )
		sheet.bands.forEach( function( runs ){
			runs.forEach( function( b ){
				parts.push( "<path d='" + bandPath( bandEdges( b, state.bandWidth / 100 ) ) +
					"' fill='" + b.colour + "' fill-opacity='" + b.alpha.toFixed( 3 ) + "'/>" )
				banded++
			} )
		} )
		parts.push( "</g>" )
	}
	/* The accent hair is drawn whatever the body: it is the one thread the
		 composition hangs off, and a sheet of bands still wants it. */
	parts.push( "<g fill='none' stroke-linecap='butt'>" )
	sheet.ribbons.forEach( function( r ){
		if( state.body === "bands" && !r.accent ) return
		paths( r ).forEach( function( p ){
			parts.push( "<path d='" + p.d + "' stroke='" + p.colour +
				"' stroke-width='" + r.w.toFixed( 2 ) +
				"' stroke-opacity='" + r.alpha.toFixed( 3 ) + "'/>" )
		} )
	} )
	parts.push( "</g>" )

	/* The bars, always: a bar the designer does not want is a bar of no width
		 (Hailei, 2026-09-12, the ON/OFF switch gone). One group per bar, each in
		 its own colour; a series with no hex in it falls back to black rather
		 than to no fill. */
	const inks = hexes( state.barColour )
	sheet.columns.forEach( function( c, k ){
		parts.push( "<g fill='" + ( inks.length ? entryAt( inks, k ) : "#000000" ) + "'>" )
		c.nodes.forEach( function( node ){
			if( !node.drawn ) return
			parts.push( "<rect x='" + ( node.x - node.bw / 2 ).toFixed( 2 ) + "' y='" + node.top.toFixed( 2 ) +
				"' width='" + node.bw.toFixed( 2 ) + "' height='" + node.height.toFixed( 2 ) + "'/>" )
		} )
		parts.push( "</g>" )
	} )
	parts.push( "</svg>" )
	return { svg: parts.join( "" ), counts: sheet.counts, banded:banded, records: sheet.records, bars: sheet.bars }
}

/* ══════════════════════════════════════════════════════════
	 7. Render
	 ══════════════════════════════════════════════════════════ */
function element( id ){ return document.getElementById( id ) }
function outSize(){
	const h = Math.round( state.outH )
	return [ Math.round( h * state.ratio ), h ]
}
let lastDraw = { counts:[], banded:0, records: state.lines, bars: state.columns + 1 }
/* Controls that read the drawn sheet — the column list needs the bar count
	 the flow actually delivered — register here and run after each draw. */
const afterDraw = []
function draw(){
	const size = outSize()
	const made = buildSvg( size[0], size[1] )
	lastDraw = made
	element( "canvas" ).innerHTML = made.svg
	follow()
	tuneHud()
	writeParams()
	afterDraw.forEach( function( f ){ f() } )
	note( "" )
}
/* The zoom that puts the whole sheet in the clear: the stage, and a little
	 air. The stage is the canvas column of the shell, so its width is the room
	 — the panels beside it are their own columns and never cover it (2026-09-13;
	 before the shell the bar lay over the window and had to be subtracted). */
function fitZoom(){
	const stage = element( "stage" )
	const tall = stage.clientHeight
	if( !tall ) return state.zoom
	const room = Math.max( 120, stage.clientWidth )
	return Math.max( 10, Math.round( 96 * Math.min( 1, room / ( tall * state.ratio ) ) ) )
}
/* The render at its own proportions, scaled by ZOOM. The script only says
	 what the zoom and the ratio are, as custom properties on the stage; the
	 stylesheet sizes the canvas from them and centres it with auto margins,
	 which fall to nought when the sheet is wider than the stage so its left
	 edge stays reachable by scrolling. Layout is CSS's, not JS's (Hailei,
	 2026-09-13). */
function syncSize(){
	const stage = element( "stage" )
	stage.style.setProperty( "--zoom", String( Math.round( state.zoom ) ) )
	stage.style.setProperty( "--ratio", String( state.ratio ) )
	element( "outWShown" ).textContent = String( outSize()[0] )
}
/* The zoom last worked out by FIT. While the designer's zoom still equals it,
	 the sheet keeps re-fitting as the window changes; the moment they move the
	 slider themselves the value stops matching and the tool leaves it alone. A
	 zoom that springs back after you set it is worse than no zoom. */
let lastFit = -1
let zoomSync = null
function follow(){
	if( state.zoom === lastFit ){
		state.zoom = fitZoom()
		lastFit = state.zoom
		if( zoomSync ) zoomSync()
	}
	syncSize()
}
/* The readout, and the one decision the ground makes for the interface: black
	 ink or white. The second line names the columns by their delivered node
	 counts — the rolled sheet's one fact worth reading off. */
function tuneHud(){
	const size = outSize()
	const stack = ( lastDraw.counts || [] ).join( " · " )
	element( "hud" ).textContent =
		lastDraw.records + " lines · " + ( lastDraw.bars - 1 ) + " columns · seed " + state.seed +
		( state.data ? " · data" : "" ) + "\n" +
		"nodes " + stack + ( state.body === "threads" ? "" : " · " + lastDraw.banded + " bands" ) + "\n" +
		size[0] + " x " + size[1]
	document.body.classList.toggle( "ink-dark", lightness( state.ground ) > 0.62 )
	element( "fg" ).classList.toggle( "ink-dark", lightness( state.ground ) > 0.62 )
	element( "fg" ).style.color = lightness( state.ground ) > 0.62 ? "#111" : "#fff"
}

/* ══════════════════════════════════════════════════════════
	 8. Helpers
	 ══════════════════════════════════════════════════════════ */
/* The link carries the sheet. After every draw, each setting that differs
	 from the tool's defaults is written into the page's query — the part
	 after the ? — so a link is a preset: keep it to keep a sheet, open it to
	 get the sheet back. The seed alone cannot do that — thirty dials decide a
	 sheet and the seed is one of them (found reproducing the NASA sheet,
	 2026-09-11). ZOOM stays out, being a view and not the sheet. Spaces ride
	 as '+' so a series reads. The query and not the fragment, because that is
	 what a link is to its keeper (Hailei, 2026-09-13: "what's meaningful is
	 only the params after ?"). */
function sheetParams(){
	const pairs = []
	Object.keys( DEFAULTS ).forEach( function( key ){
		if( key === "zoom" ) return
		if( JSON.stringify( state[key] ) === JSON.stringify( DEFAULTS[key] ) ) return
		const text = Array.isArray( state[key] ) ? state[key].join( "," ) : String( state[key] )
		pairs.push( key + "=" + encodeURIComponent( text ).replace( /%20/g, "+" ).replace( /%2C/g, "," ) )
	} )
	return pairs.join( "&" )
}
function writeParams(){
	if( !window.history || !history.replaceState ) return
	const p = sheetParams()
	history.replaceState( null, "", location.pathname + ( p ? "?" + p : "" ) )
}
/* Every wired control registers here how it accepts a typed value — the
	 cleaned value back, or null — and the query is read through the same
	 acceptance, so a link can never put into state what a field would have
	 refused. A key that is no setting — ?selftest — is passed over. */
const accept = {}
function readParams(){
	const raw = location.search.replace( /^\?/, "" )
	if( !raw ) return
	/* The ratio is read first: bar widths are judged against half the sheet,
		 and the sheet is the ratio. */
	const pairs = raw.split( "&" )
	pairs.sort( function( a, b ){ return ( b.indexOf( "ratio=" ) === 0 ) - ( a.indexOf( "ratio=" ) === 0 ) } )
	pairs.forEach( function( pair ){
		const at = pair.indexOf( "=" )
		if( at < 0 ) return
		const key = pair.slice( 0, at )
		if( !( key in DEFAULTS ) || key === "zoom" || !accept[key] ) return
		let text
		try{ text = decodeURIComponent( pair.slice( at + 1 ).replace( /\+/g, " " ) ) } catch( e ){ return }
		const ok = accept[key]( text )
		if( ok !== null && ok !== undefined ) state[key] = ok
	} )
}
/* A number held to a range, or null. */
function bounded( lo, hi ){
	return function( text ){
		const v = Number( text )
		return text.trim() === "" || v !== v ? null : Math.max( lo, Math.min( hi, v ) )
	}
}
function note( msg ){
	const n = element( "note" )
	if( !msg ){ n.classList.add( "hidden" ); n.textContent = ""; return }
	n.textContent = msg
	n.classList.remove( "hidden" )
}
function download( blob, name ){
	const url = URL.createObjectURL( blob )
	const a = document.createElement( "a" )
	a.href = url; a.download = name
	document.body.appendChild( a ); a.click(); a.remove()
	setTimeout( function(){ URL.revokeObjectURL( url ) }, 4000 )
}
function stamp(){ return new Date().toISOString().slice( 0, 16 ).replace( /[-:T]/g, "" ) }
/* data URL keeps the canvas untainted when the file is opened from file:// */
function rasterise( mime, quality ){
	return new Promise( function( resolve, reject ){
		const size = outSize()
		const pxW = size[0], pxH = size[1]
		/* Beyond ~140 megapixels the browser dies rather than reporting anything
			 useful, so refuse it with a readable reason. */
		if( pxW * pxH > 1.4e8 ){
			reject( new Error( "too big: " + pxW + " × " + pxH + " px" ) )
			return
		}
		const made = buildSvg( pxW, pxH )
		const img = new Image()
		img.onload = function(){
			const canvas = document.createElement( "canvas" )
			canvas.width = pxW; canvas.height = pxH
			canvas.getContext( "2d" ).drawImage( img, 0, 0, pxW, pxH )
			canvas.toBlob( function( b ){
				if( b ) resolve( { blob:b, pxW:pxW, pxH:pxH } )
				else reject( new Error( "canvas failed" ) )
			}, mime, quality )
		}
		img.onerror = function(){ reject( new Error( "svg failed" ) ) }
		img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent( made.svg )
	} )
}

/* ══════════════════════════════════════════════════════════
	 9. Self-test
	 ══════════════════════════════════════════════════════════ */
/* Open the file with ?selftest and the seating, the geometry and the crossing
	 finder are checked against what the arithmetic already knows, in the
	 browser where the code actually runs. No runner, no package, no second
	 language — the arithmetic that could be wrong is the arithmetic asserted. */
function selftest(){
	const results = []
	const check = function( name, got, want ){
		results.push( ( got === want ? "PASS  " : "FAIL  " ) + name + " — got " + got + ", want " + want )
	}
	const saved = JSON.stringify( state )
	const scan = function(){
		const size = outSize()
		const sheet = layout( size[0], size[1] )
		return { sheet:sheet, cols: sampleColumns( sheet ) }
	}

	/* The seating contract. Every thread has one seat in every column, and a
		 column's bars add up to the whole. */
	Object.assign( state, { lines:60, columns:3, nodes:"6", tangle:"50", skew:25, split:2, spread:"100 100",
		width:"", bar:"4", order:"rolled", accent:"", scatter:0, colourBy:"origin", colours:3 } )
	let sheet = layout( outSize()[0], outSize()[1] )
	let whole = true
	sheet.columns.forEach( function( c ){
		let sum = 0
		c.nodes.forEach( function( node ){ sum += node.count } )
		if( sum !== 60 ) whole = false
	} )
	check( "every column seats every thread", whole, true )

	/* The band contract. Two threads sharing a node in one column and a node in
		 the next leave the first in the same order they arrive at the second —
		 a band is parallel by construction, not by luck. */
	let bandBreaks = 0
	for( let k = 0; k < 3; k++ ){
		for( let i = 0; i < 60; i++ ){
			for( let j = i + 1; j < 60; j++ ){
				if( sheet.assign[k][i] !== sheet.assign[k][j] ) continue
				if( sheet.assign[ k + 1 ][i] !== sheet.assign[ k + 1 ][j] ) continue
				const a = sheet.ribbons[i], b = sheet.ribbons[j]
				if( Math.sign( a.yOut[k] - b.yOut[k] ) !== Math.sign( a.yIn[ k + 1 ] - b.yIn[ k + 1 ] ) ) bandBreaks++
			}
		}
	}
	check( "a flow between two nodes is one parallel band", bandBreaks, 0 )

	/* The band contract proper. Every band's threads sit in consecutive seats
		 at both ends, in the same order at both, and the bands of a span account
		 for every thread — which is what lets a band be drawn from its two outer
		 seats alone. */
	let ragged = 0, seated = 0
	sheet.bands.forEach( function( runs, k ){
		runs.forEach( function( b ){
			seated += b.len
			for( let j = 1; j < b.len; j++ ){
				if( sheet.departure[k][ b.members[j] ] !== sheet.departure[k][ b.members[ j - 1 ] ] + 1 ) ragged++
				if( sheet.arrival[ k + 1 ][ b.members[j] ] !== sheet.arrival[ k + 1 ][ b.members[ j - 1 ] ] + 1 ) ragged++
			}
		} )
	} )
	check( "every band's seats are consecutive at both ends, in one order", ragged, 0 )
	check( "and the bands of a span seat every thread", seated, 60 * 3 )

	/* A typed list is one exact room per column, filled to the letter even
		 when the flow is too sharp to reach every node on its own. */
	Object.assign( state, { lines:200, columns:4, nodes:"15 9 6 24 40", tangle:"10" } )
	check( "a nodes list rooms each column exactly, whatever the tangle",
		layout( outSize()[0], outSize()[1] ).counts.join( " " ), "15 9 6 24 40" )

	/* Scattered ends. Every last-column node keeps at least a fifth of the
		 span, and its threads end at its bar and nowhere else. */
	Object.assign( state, { lines:60, columns:2, nodes:"6", tangle:"50", scatter:100 } )
	const spread = scan()
	const lastCol = spread.sheet.columns[2], prevCol = spread.sheet.columns[1]
	let near = 0, astray = 0
	lastCol.nodes.forEach( function( node ){
		if( node.x - prevCol.x < ( lastCol.x - prevCol.x ) * 0.2 ) near++
	} )
	spread.sheet.ribbons.forEach( function( r, i ){
		const node = lastCol.nodes[ spread.sheet.assign[2][i] ]
		const end = r.segs[ r.segs.length - 1 ]
		if( Math.abs( end[6] - ( node.x + node.bw / 2 ) ) > 1e-6 ) astray++
	} )
	check( "scattered nodes keep a fifth of the span", near, 0 )
	check( "and every thread ends at its own node's bar", astray, 0 )

	/* A WIDTH list gives each column its own bar: the bars are drawn that
		 wide, and every thread's bridge across a bar is exactly that wide. */
	Object.assign( state, { lines:60, columns:2, nodes:"6", tangle:"50", scatter:0, bar:"2 30 8" } )
	const widths = scan()
	const drawn = widths.sheet.columns.map( function( c ){ return Math.round( c.nodes[0].bw / outSize()[1] * 1000 ) } )
	check( "a width list gives each column its own bar", drawn.join( " " ), "2 30 8" )
	const bridgesFit = function( sheet ){
		let off = 0
		sheet.ribbons.forEach( function( r, i ){
			const first = r.segs[0], last = r.segs[ r.segs.length - 1 ]
			const head = sheet.columns[0].nodes[ sheet.assign[0][i] ]
			const tail = sheet.columns[ sheet.columns.length - 1 ].nodes[ sheet.assign[ sheet.columns.length - 1 ][i] ]
			if( Math.abs( ( first[6] - first[0] ) - head.bw ) > 1e-6 ) off++
			if( Math.abs( ( last[6] - last[0] ) - tail.bw ) > 1e-6 ) off++
		} )
		return off
	}
	check( "and every bridge across a bar is that bar's width", bridgesFit( widths.sheet ), 0 )
	/* No ceiling but the sheet: a bar of a thousand thousandths is drawn at a
		 thousand, and only a bar past half the sheet's width is held there. */
	Object.assign( state, { nodes:"1", bar:"1000" } )
	const broad = layout( outSize()[0], outSize()[1] )
	check( "a bar may be as wide as the designer likes", Math.round( broad.columns[0].nodes[0].bw ), Math.round( 1000 * outSize()[1] / 1000 ) )
	Object.assign( state, { bar:"9000" } )
	check( "short of half the sheet", layout( outSize()[0], outSize()[1] ).columns[0].nodes[0].bw < outSize()[0] / 2, true )
	/* Or nothing at all: a bar of 0 draws no rect, while the threads still
		 march through where it stood. */
	Object.assign( state, { nodes:"6", bar:"0 8", tangle:"50" } )
	const bare = scan()
	const drawnRects = ( buildSvg( outSize()[0], outSize()[1] ).svg.match( /<rect /g ) || [] ).length
	check( "a bar of nothing draws no rect", drawnRects, 1 + bare.sheet.counts[1] + bare.sheet.counts[2] )
	let seamMarch = true
	bare.sheet.ribbons.forEach( function( r ){ for( let s = 0; s < r.segs.length; s++ ) if( r.segs[s][6] <= r.segs[s][0] ) seamMarch = false } )
	check( "and its threads still march", seamMarch, true )
	Object.assign( state, { bar:"4" } )

	/* TANGLE 0's promise: every node hands its whole bundle to one node. */
	const leaksIn = function( sheet, k ){
		const seen = []
		let leaks = 0
		for( let i = 0; i < sheet.assign[k].length; i++ ){
			const a = sheet.assign[k][i], b = sheet.assign[ k + 1 ][i]
			if( seen[a] === undefined ) seen[a] = b
			else if( seen[a] !== b ) leaks++
		}
		return leaks
	}
	Object.assign( state, { lines:100, columns:3, nodes:"8", tangle:"50", split:1, scatter:0 } )
	sheet = layout( outSize()[0], outSize()[1] )
	check( "split 1 sends every node whole", leaksIn( sheet, 0 ) + leaksIn( sheet, 1 ) + leaksIn( sheet, 2 ), 0 )

	/* SPLIT. Every node's bundle reaches at most SPLIT nodes of the next
		 column, and at 2 some node is cut in two — so a tangle list is read per
		 span without breaking a band into single threads. */
	const waysOut = function( sheet, k ){
		const seen = []
		let most = 0, cut = 0
		for( let i = 0; i < sheet.assign[k].length; i++ ){
			const a = sheet.assign[k][i], b = sheet.assign[ k + 1 ][i]
			seen[a] = seen[a] || []
			if( seen[a].indexOf( b ) < 0 ) seen[a].push( b )
		}
		seen.forEach( function( list ){ most = Math.max( most, list.length ); if( list.length > 1 ) cut++ } )
		return { most:most, cut:cut }
	}
	Object.assign( state, { lines:100, columns:2, nodes:"6", tangle:"0 100", split:2 } )
	sheet = layout( outSize()[0], outSize()[1] )
	check( "split 2 cuts a node in at most two", Math.max( waysOut( sheet, 0 ).most, waysOut( sheet, 1 ).most ) <= 2, true )
	check( "and cuts some node in two", waysOut( sheet, 0 ).cut + waysOut( sheet, 1 ).cut > 0, true )
	Object.assign( state, { split:5 } )
	sheet = layout( outSize()[0], outSize()[1] )
	check( "and split 5 in at most five", Math.max( waysOut( sheet, 0 ).most, waysOut( sheet, 1 ).most ) <= 5, true )


	/* SKEW. At 0 the first column's nodes are as even as integers allow; at
		 100 the same seed hands most of the column to one node and leaves a
		 fringe of single threads. */
	Object.assign( state, { lines:300, columns:1, nodes:"15 15", tangle:"50", skew:0 } )
	const even = layout( outSize()[0], outSize()[1] ).columns[0].nodes.map( function( n ){ return n.count } )
	check( "skew 0 evens the first column", Math.max.apply( null, even ) - Math.min.apply( null, even ) <= 1, true )
	Object.assign( state, { skew:100 } )
	const skewed = layout( outSize()[0], outSize()[1] ).columns[0].nodes.map( function( n ){ return n.count } )
	check( "and skew 100 hands most of it to one node",
		Math.max.apply( null, skewed ) > 150 && skewed.filter( function( c ){ return c === 1 } ).length >= 3, true )
	check( "while every node keeps a thread", Math.min.apply( null, skewed ) >= 1 && skewed.length, 15 )

	/* A SPREAD list places each column: with one node per column a column's
		 bar is exactly its run, so the heights must stand in the typed ratio. */
	Object.assign( state, { lines:60, columns:2, nodes:"1", spread:"40 100 60", skew:25 } )
	const placed = layout( outSize()[0], outSize()[1] ).columns.map( function( c ){ return c.nodes[0].height } )
	check( "a spread list places each column",
		Math.abs( placed[0] / placed[1] - 0.4 ) < 1e-9 && Math.abs( placed[2] / placed[1] - 0.6 ) < 1e-9, true )
	Object.assign( state, { spread:"40 100" } )
	const stepped = layout( outSize()[0], outSize()[1] ).columns.map( function( c ){ return c.nodes[0].height } )
	check( "and two entries step the columns between them",
		Math.abs( stepped[1] / stepped[2] - 0.7 ) < 1e-9, true )

	/* A GAP list airs each column its own way: at 0 a column's bars touch,
		 and a column given air has it. */
	Object.assign( state, { columns:1, nodes:"5 5", spread:"100", gap:"0 40", tangle:"100" } )
	const aired = layout( outSize()[0], outSize()[1] ).columns
	const touching = aired[0].nodes.every( function( node, j ){ return j === 0 || Math.abs( node.top - ( aired[0].nodes[ j - 1 ].top + aired[0].nodes[ j - 1 ].height ) ) < 1e-6 } )
	const spaced = aired[1].nodes.every( function( node, j ){ return j === 0 || node.top > aired[1].nodes[ j - 1 ].top + aired[1].nodes[ j - 1 ].height + 1 } )
	check( "a gap list airs each column its own way", touching && spaced, true )
	Object.assign( state, { gap:"10", nodes:"1" } )

	/* Every column is centred on the sheet, whatever its height. */
	Object.assign( state, { columns:2, spread:"40 100 15" } )
	const hung = layout( outSize()[0], outSize()[1] ).columns.map( function( c ){
		return Math.round( ( c.nodes[0].top + c.nodes[0].height / 2 ) / outSize()[1] * 100 )
	} )
	check( "every column is centred whatever its height", hung.join( " " ), "50 50 50" )

	/* The diagram fills the canvas: the first bar's outer edge is the left
		 side and the last bar's the right, and the columns' shares fill the
		 room between, the bars being the seams — shares 25 25 50 stand the
		 four bars at 0, 25, 50 and 100 percent of the width, allowing for the
		 end bars' own thickness. Empty, or a list of the wrong length, is an
		 even split. */
	Object.assign( state, { columns:3, width:"25 25 50", bar:"20" } )
	const edges = function(){
		const sheet = layout( outSize()[0], outSize()[1] )
		return { first: sheet.columns[0].x - sheet.columns[0].nodes[0].bw / 2,
			last: sheet.columns[ sheet.columns.length - 1 ].x + sheet.columns[ sheet.columns.length - 1 ].nodes[0].bw / 2,
			at: sheet.columns.map( function( c ){ return Math.round( c.x / outSize()[0] * 100 ) } ) }
	}
	const stood = edges()
	check( "the first bar's outer edge is the canvas's left side and the last bar's its right", Math.round( stood.first * 100 ) / 100 + " " + Math.round( stood.last * 100 ) / 100, "0 " + outSize()[0] )
	check( "and column widths are shares of the room between", stood.at.join( " " ), "0 25 50 100" )
	Object.assign( state, { width:"", bar:"4" } )
	check( "and an empty width splits the room evenly", edges().at.join( " " ), "0 33 67 100" )
	Object.assign( state, { width:"25 25 50", columns:4 } )
	check( "and a list that no longer fits the columns starts even again", edges().at.join( " " ), "0 25 50 75 100" )
	Object.assign( state, { columns:3 } )

	/* ORDER. Big first leaves every column non-increasing down the sheet,
		 small first non-decreasing, and neither loses a thread. */
	Object.assign( state, { lines:200, columns:3, nodes:"9", tangle:"60", order:"big" } )
	const bigFirst = layout( outSize()[0], outSize()[1] )
	let unsorted = 0, kept = 0
	bigFirst.columns.forEach( function( c ){
		c.nodes.forEach( function( node, j ){ kept += node.count; if( j && node.count > c.nodes[ j - 1 ].count ) unsorted++ } )
	} )
	check( "big first stacks every column largest to smallest", unsorted, 0 )
	check( "and keeps every thread", kept, 800 )
	Object.assign( state, { order:"small" } )
	let unsortedUp = 0
	layout( outSize()[0], outSize()[1] ).columns.forEach( function( c ){
		c.nodes.forEach( function( node, j ){ if( j && node.count < c.nodes[ j - 1 ].count ) unsortedUp++ } )
	} )
	check( "small first stacks the other way", unsortedUp, 0 )
	/* One word per column: the first column big first, the second small
		 first, the rest as the last word says. */
	Object.assign( state, { order:"big small" } )
	const mixedOrder = layout( outSize()[0], outSize()[1] ).columns
	let firstDown = 0, restUp = 0
	mixedOrder[0].nodes.forEach( function( node, j ){ if( j && node.count > mixedOrder[0].nodes[ j - 1 ].count ) firstDown++ } )
	for( let k = 1; k < mixedOrder.length; k++ ){
		mixedOrder[k].nodes.forEach( function( node, j ){ if( j && node.count < mixedOrder[k].nodes[ j - 1 ].count ) restUp++ } )
	}
	check( "and a list orders each column its own way", firstDown + restUp, 0 )
	Object.assign( state, { order:"rolled" } )

	/* DATA. Records are the flow: every column holds one node per distinct
		 value, and a flow between two values carries exactly the records that
		 name both. az and za stack the names; a rolled sheet has none, so they
		 leave it as dealt. */
	Object.assign( state, { data: "a\tx\ta\ty\nb\ty\ta\ty\nb\ty\tb\tz\nc\ty\ta\ty", order:"rolled", accent:"" } )
	const typed = layout( outSize()[0], outSize()[1] )
	check( "data seats one node per distinct value", typed.counts.join( " " ), "3 2 2 2" )
	check( "and every record is a thread, every field a bar", typed.records + " " + typed.bars, "4 4" )
	let both = 0
	for( let i = 0; i < 4; i++ ) if( typed.assign[1][i] === 1 && typed.assign[2][i] === 0 ) both++
	check( "and a flow carries exactly the records that name both ends", both, 2 )
	Object.assign( state, { order:"za" } )
	check( "za stacks names from the bottom", layout( outSize()[0], outSize()[1] ).names[0].join( "" ), "cba" )
	Object.assign( state, { order:"az big" } )
	const named = layout( outSize()[0], outSize()[1] )
	check( "and a list mixes name order with size order", named.names[0].join( "" ) + " " + named.names[1].join( "" ), "abc yx" )
	Object.assign( state, { data:"", order:"rolled" } )
	check( "without data, az leaves a rolled sheet as dealt",
		layout( outSize()[0], outSize()[1] ).counts.join( " " ), ( function(){ state.order = "az"; const c = layout( outSize()[0], outSize()[1] ).counts.join( " " ); state.order = "rolled"; return c } )() )

	/* The property the sampler rests on: x rises along every thread, and the
		 chain never breaks. Checked at the slackest curve and the most columns
		 the tool allows. */
	Object.assign( state, { lines:200, columns:7, nodes:"12", tangle:"100", tension:100, spread:"100 100" } )
	sheet = layout( outSize()[0], outSize()[1] )
	let marching = true
	sheet.ribbons.forEach( function( r ){
		for( let s = 0; s < r.segs.length; s++ ){
			if( r.segs[s][6] <= r.segs[s][0] ) marching = false
			if( s > 0 && r.segs[s][0] !== r.segs[ s - 1 ][6] ) marching = false
		}
	} )
	check( "every segment runs left to right and joins the last", marching, true )

	/* One turn per span. A span is a single cubic, level at both ends, so
		 every thread has exactly one segment between bars — a bridge, a span,
		 a bridge, and so on — and its slope changes sign at most once inside
		 any span. */
	let extra = 0, wobbles = 0
	sheet.ribbons.forEach( function( r ){
		if( r.segs.length !== 2 * 8 - 1 ) extra++
		for( let s = 1; s < r.segs.length; s += 2 ){
			const seg = r.segs[s]
			let last = 0, turns = 0
			for( let t = 1; t <= 40; t++ ){
				const dy = cubic( seg[1], seg[3], seg[5], seg[7], t / 40 ) - cubic( seg[1], seg[3], seg[5], seg[7], ( t - 1 ) / 40 )
				const sign = dy > 1e-9 ? 1 : dy < -1e-9 ? -1 : 0
				if( sign && last && sign !== last ) turns++
				if( sign ) last = sign
			}
			if( turns > 0 ) wobbles++
		}
	} )
	check( "a span is one segment, so a thread has one turn per span", extra, 0 )
	check( "and never changes direction inside a span", wobbles, 0 )

	/* The colour contract. Scattered colour would still look busy and deliberate
		 on screen, so the eye is no judge of this one — it has to be counted. */
	Object.assign( state, { lines:120, columns:2, nodes:"12", tangle:"50", colours:5, colourBy:"origin" } )
	sheet = layout( outSize()[0], outSize()[1] )
	const runs = []
	sheet.inks.forEach( function( c, i ){ if( i === 0 || c !== sheet.inks[ i - 1 ] ) runs.push( c ) } )
	check( "origin lays each colour down as one unbroken run of nodes", runs.length, 5 )
	check( "and never reuses a colour", new Set( runs ).size, 5 )
	/* In ORIGIN a band is one colour by construction; a flow of two origins
		 must have been cut in two. Counted, because a band painted in the wrong
		 colour would still look deliberate. */
	let mixed = 0
	sheet.bands.forEach( function( runs ){ runs.forEach( function( b ){
		b.members.forEach( function( i ){ if( sheet.inks[ sheet.assign[0][i] ] !== b.colour ) mixed++ } )
	} ) } )
	check( "and a band never carries two origins", mixed, 0 )
	Object.assign( state, { columns:3, colours:3, colourBy:"section" } )
	sheet = layout( outSize()[0], outSize()[1] )
	const spans = sheet.ribbons[0].spans.map( function( s ){ return s.colour } ).join( " " )
	check( "section paints each span in shelf order",
		spans, state.palette.slice( 0, 3 ).join( " " ) )
	Object.assign( state, { colourBy:"node" } )
	sheet = layout( outSize()[0], outSize()[1] )
	let offNode = 0
	sheet.ribbons.forEach( function( r, i ){ r.spans.forEach( function( s, k ){
		if( s.colour !== state.palette[ sheet.assign[k][i] % 3 ] ) offNode++
	} ) } )
	check( "node paints each span by the node it leaves", offNode, 0 )
	Object.assign( state, { colourBy:"tail" } )
	sheet = layout( outSize()[0], outSize()[1] )
	let offTail = 0
	sheet.ribbons.forEach( function( r, i ){ r.spans.forEach( function( s, k ){
		const want = k < 2 ? state.palette[k] : state.palette[ ( k + sheet.assign[k][i] ) % 3 ]
		if( s.colour !== want ) offTail++
	} ) } )
	check( "tail paints sections, then the last span by node", offTail, 0 )

	/* The frame contract, checked on the drawn curve rather than on the seats —
		 those are two different claims, and only the second is what a reader
		 sees. Run at the settings most likely to throw a thread out, and on the
		 bands' edges as well as the threads. */
	Object.assign( state, { lines:80, columns:4, nodes:"8", tangle:"100",
		tension:100, spread:"100 60 100", colourBy:"origin", bandWidth:100 } )
	const framed = scan()
	const tall = outSize()[1]
	let high = Infinity, low = -Infinity
	framed.sheet.ribbons.forEach( function( r ){
		const edge = r.w / 2
		const ys = sampleRibbon( r, framed.cols.xs )
		for( let k = 0; k < ys.length; k++ ){
			if( ys[k] !== ys[k] ) continue
			high = Math.min( high, ys[k] - edge )
			low = Math.max( low, ys[k] + edge )
		}
	} )
	check( "no thread crosses the top edge at full spread", high >= -0.5, true )
	check( "nor the bottom", low <= tall + 0.5, true )
	let bandHigh = Infinity, bandLow = -Infinity, outside = 0
	framed.sheet.bands.forEach( function( runs, k ){
		runs.forEach( function( b ){
			const edges = bandEdges( b, 1 )
			const top = sampleRibbon( { segs: edges.top }, framed.cols.xs )
			const bottom = sampleRibbon( { segs: edges.bottom }, framed.cols.xs )
			for( let c = 0; c < top.length; c++ ){
				if( top[c] !== top[c] || framed.cols.xs[c] < b.xa ) continue
				bandHigh = Math.min( bandHigh, top[c] )
				bandLow = Math.max( bandLow, bottom[c] )
			}
			/* Every thread of the band rides inside its two edges. The edges and
				 the threads are separate cubics with one easing, so they agree to
				 the pixel; half a pixel is the allowance for the sampler. */
			b.members.forEach( function( i ){
				const r = framed.sheet.ribbons[i]
				const ys = sampleRibbon( { segs: r.segs.slice( r.spans[k].from, r.spans[k].to ) }, framed.cols.xs )
				for( let c = 0; c < ys.length; c++ ){
					if( ys[c] !== ys[c] || framed.cols.xs[c] < b.xa || framed.cols.xs[c] > b.xb ) continue
					if( ys[c] < top[c] - 0.5 || ys[c] > bottom[c] + 0.5 ) outside++
				}
			} )
		} )
	} )
	check( "no band edge leaves the frame either", bandHigh >= -0.5 && bandLow <= tall + 0.5, true )
	check( "and every thread rides inside its band", outside, 0 )

	Object.assign( state, JSON.parse( saved ) )
	const failed = results.filter( function( r ){ return r.indexOf( "FAIL" ) === 0 } ).length
	const report = "WHL Generative Alluvial " + VERSION + " self-test\n\n" + results.join( "\n" ) +
		"\n\n" + ( failed ? failed + " FAILED" : "ALL PASSED" )
	console.log( report )
	/* Painted on the sheet, not only logged. A result that only exists in the
		 console cannot be read by a snapshotter, a phone, or anyone who did not
		 think to open the inspector — and a check nobody reads is not a check. */
	const pre = document.createElement( "pre" )
	pre.setAttribute( "style", "position:fixed; inset:0; z-index:99; margin:0; padding:4ch;" +
		"background:#0B0B0B; color:" + ( failed ? "#ff5f56" : "#fff" ) + ";" +
		"font:inherit; white-space:pre; overflow:auto" )
	pre.textContent = report
	document.body.appendChild( pre )
	return { ok: failed === 0, report: report }
}

/* ══════════════════════════════════════════════════════════
	 10. Wiring
	 ══════════════════════════════════════════════════════════ */
const rangeSync = []
/* Every wired control registers its state→display closure here, so anything
	 that rewrites state wholesale (ROLL AGAIN) can replay the lot without a
	 second copy of any formatting rule. */
/* A slider carries whole numbers only, so a value the designer reads in
	 fractions rides it multiplied: scale 10 lets WEIGHT step in tenths. The
	 state always holds the true value; only the slider sees the multiple. */
function wireRange( id, key, opts ){
	opts = opts || {}
	const scale = opts.scale || 1
	const input = element( id ), out = element( id + "Val" )
	const show = opts.fmt || function( v ){ return v + ( opts.unit || "" ) }
	const sync = function(){
		input.value = String( Math.round( state[key] * scale ) )
		if( out ) out.textContent = show( state[key] )
	}
	sync()
	rangeSync.push( sync )
	accept[key] = bounded( Number( input.min ) / scale, Number( input.max ) / scale )
	input.addEventListener( "input", function(){
		state[key] = Number( input.value ) / scale
		if( out ) out.textContent = show( state[key] )
		if( opts.after ) opts.after()
		draw()
	} )
}
/* A slider and a number field on one value. LINES is both swept by feel and
	 typed exactly, and a designer should not have to choose which the tool
	 supports. */
function wirePair( rangeId, numberId, key, opts ){
	opts = opts || {}
	const slider = element( rangeId ), field = element( numberId )
	const sync = function(){
		slider.value = String( Math.round( state[key] ) )
		field.value = String( Math.round( state[key] ) )
	}
	sync()
	rangeSync.push( sync )
	accept[key] = function( text ){
		const v = bounded( Number( field.min ), Number( field.max ) )( text )
		return v === null ? null : Math.round( v )
	}
	const take = function( v ){
		const min = Number( field.min ), max = Number( field.max )
		state[key] = Math.max( min, Math.min( max, Math.round( Number( v ) || min ) ) )
		sync()
		if( opts.after ) opts.after()
		draw()
	}
	slider.addEventListener( "input", function(){ take( slider.value ) } )
	field.addEventListener( "change", function(){ take( field.value ) } )
}
/* The colour picker, the house's: a hue strip over a chroma × lightness
	 field, as in the Gradient tool (Hailei, 2026-09-12: "colour needs a colour
	 picker like the Gradient applet"). It edits one target at a time, and a
	 target is only a pair of `get` and `set`: the chip beside a hex field
	 opens it on that field, every pick written into the field and committed
	 as a typed change would be, so the field's own validation, redraw and
	 address-writing run unchanged; the shelf opens it on a palette slot,
	 written straight. The picker knows nothing of what either feeds. Across
	 the field is chroma, up it is lightness; the right edge is the gamut edge
	 for that lightness, so every point is a colour the sheet can carry.
	 Returns `open`, for the shelf to call with its own target. */
function wirePicker(){
	const picker = { open:false, target:null, L:0.8, cr:0.5, h:80 }
	const box = element( "picker" ), phex = element( "phex" )
	const fieldPaint = function(){
		const canvas = element( "field" ), ctx = canvas.getContext( "2d" )
		if( !ctx ) return                       /* no 2D canvas here: the wiring still works, unpainted */
		const w = canvas.width, h = canvas.height, img = ctx.createImageData( w, h ), data = img.data
		for( let y = 0; y < h; y++ ){
			const L = 1 - ( y + 0.5 ) / h, edge = chromaEdge( L, picker.h )      /* one bisection per row */
			for( let x = 0; x < w; x++ ){
				const rgb = oklabToRgb( oklchToOklab( [ L, ( x + 0.5 ) / w * edge, picker.h ] ) ), o = ( y * w + x ) * 4
				data[o] = Math.round( clamp01( rgb[0] ) * 255 )
				data[o + 1] = Math.round( clamp01( rgb[1] ) * 255 )
				data[o + 2] = Math.round( clamp01( rgb[2] ) * 255 )
				data[o + 3] = 255
			}
		}
		ctx.putImageData( img, 0, 0 )
	}
	const huePaint = function(){
		const canvas = element( "hue" ), ctx = canvas.getContext( "2d" )
		if( !ctx ) return
		const w = canvas.width, h = canvas.height, img = ctx.createImageData( w, h ), data = img.data
		for( let x = 0; x < w; x++ ){
			const hue = ( x + 0.5 ) / w * 360
			const rgb = oklabToRgb( oklchToOklab( [ 0.68, chromaEdge( 0.68, hue ) * 0.95, hue ] ) )
			for( let y = 0; y < h; y++ ){
				const o = ( y * w + x ) * 4
				data[o] = Math.round( clamp01( rgb[0] ) * 255 )
				data[o + 1] = Math.round( clamp01( rgb[1] ) * 255 )
				data[o + 2] = Math.round( clamp01( rgb[2] ) * 255 )
				data[o + 3] = 255
			}
		}
		ctx.putImageData( img, 0, 0 )
	}
	const marks = function(){
		element( "dot" ).style.left = ( picker.cr * element( "fieldWrap" ).clientWidth ) + "px"
		element( "dot" ).style.top = ( ( 1 - picker.L ) * element( "fieldWrap" ).clientHeight ) + "px"
		element( "hueDot" ).style.left = ( picker.h / 360 * element( "hueWrap" ).clientWidth ) + "px"
	}
	const hexNow = function(){ return lchToHex( [ picker.L, picker.cr * chromaEdge( picker.L, picker.h ), picker.h ] ) }
	const settle = function( hex ){
		const lch = hexToLch( hex )
		picker.L = clamp01( lch[0] ); picker.h = lch[2]
		picker.cr = Math.min( 1, lch[1] / Math.max( 1e-4, chromaEdge( picker.L, picker.h ) ) )
	}
	const commit = function( hex ){ picker.target.set( hex ) }
	/* A drag commits once a frame, not once a move: every commit redraws the
		 whole sheet. */
	let pending = false
	const commitSoon = function(){
		if( pending ) return
		pending = true
		const frame = window.requestAnimationFrame || function( f ){ return setTimeout( f, 16 ) }
		frame( function(){ pending = false; if( picker.open ){ const hex = hexNow(); phex.value = hex; commit( hex ) } } )
	}
	const open = function( target, anchor ){
		picker.open = true; picker.target = target
		settle( hexToRgb( target.get() ) ? target.get() : DEFAULTS.accent )      /* an emptied accent opens on the house red */
		box.classList.remove( "hidden" )
		/* Beside the toolbar when there is room to its left, else under the
			 chip, held inside the window either way. */
		const rail = element( "toolbar" ).getBoundingClientRect(), size = box.getBoundingClientRect(), at = anchor.getBoundingClientRect()
		const roomLeft = rail.left - size.width - 10
		if( roomLeft >= 10 ){
			box.style.left = roomLeft + "px"
			box.style.top = Math.max( 10, Math.min( at.top, window.innerHeight - size.height - 10 ) ) + "px"
		} else {
			box.style.left = Math.max( 10, Math.min( at.left, window.innerWidth - size.width - 10 ) ) + "px"
			box.style.top = Math.max( 10, Math.min( at.bottom + 8, window.innerHeight - size.height - 10 ) ) + "px"
		}
		huePaint(); fieldPaint()
		phex.value = target.get()
		marks()
	}
	const close = function(){
		picker.open = false; picker.target = null
		box.classList.add( "hidden" )
	}
	/* A chip's target is the field beside it: committing is typing, the field
		 takes the hex and fires its own change. The same chip again closes. */
	Array.prototype.forEach.call( document.querySelectorAll( "button.chip" ), function( chip ){
		const field = element( chip.id.replace( /Chip$/, "" ) )
		const target = {
			id: field.id,
			get: function(){ return field.value },
			set: function( hex ){ field.value = hex; field.dispatchEvent( new Event( "change", { bubbles:true } ) ) }
		}
		chip.addEventListener( "click", function(){
			if( picker.open && picker.target.id === target.id ) close(); else open( target, chip )
		} )
	} )
	let drag = null
	const readField = function( e ){
		const r = element( "field" ).getBoundingClientRect()
		picker.cr = clamp01( ( e.clientX - r.left ) / r.width )
		picker.L = clamp01( 1 - ( e.clientY - r.top ) / r.height )
		marks(); commitSoon()
	}
	const readHue = function( e ){
		const r = element( "hue" ).getBoundingClientRect()
		picker.h = Math.min( 359.99, Math.max( 0, ( e.clientX - r.left ) / r.width * 360 ) )
		fieldPaint(); marks(); commitSoon()
	}
	element( "field" ).addEventListener( "pointerdown", function( e ){
		drag = readField; element( "field" ).setPointerCapture( e.pointerId ); readField( e ); e.preventDefault()
	} )
	element( "hue" ).addEventListener( "pointerdown", function( e ){
		drag = readHue; element( "hue" ).setPointerCapture( e.pointerId ); readHue( e ); e.preventDefault()
	} )
	window.addEventListener( "pointermove", function( e ){ if( drag ) drag( e ) } )
	window.addEventListener( "pointerup", function(){ drag = null } )
	/* A hex typed in the picker moves the marks and is committed as it is
		 typed; the picker's own field is left as typed so the caret stays put. */
	phex.addEventListener( "input", function(){
		let v = phex.value.trim()
		if( v && v.charAt( 0 ) !== "#" ) v = "#" + v
		const rgb = hexToRgb( v )
		if( !rgb ) return
		const hex = rgbToHex( rgb[0], rgb[1], rgb[2] )
		settle( hex ); fieldPaint(); marks()
		commit( hex )
	} )
	element( "pClose" ).addEventListener( "click", close )
	/* Anything pressed outside dismisses it — tested by containment in the
		 capture phase, which reaches document before the target; a chip or a
		 swatch is left to its own click, which decides open or close. */
	document.addEventListener( "pointerdown", function( e ){
		if( !picker.open ) return
		const t = e.target
		if( box.contains( t ) || ( t.closest && ( t.closest( ".chip" ) || t.closest( ".swatch" ) ) ) ) return
		close()
	}, true )
	window.addEventListener( "blur", function(){ if( picker.open ) close() } )
	window.addEventListener( "keydown", function( e ){ if( e.key === "Escape" && picker.open ) close() } )
	return open
}
/* A hex field and the chip that reads it. `empty` lets the field be cleared to
	 mean "none" — the accent is the one colour a designer may want to be rid
	 of, and a field that snaps back to red when emptied is a field that cannot
	 be emptied. */
function wireHex( id, key, empty ){
	const field = element( id ), chip = element( id + "Chip" )
	const sync = function(){
		field.value = state[key]
		if( chip ) chip.style.background = state[key] || "transparent"
	}
	sync()
	rangeSync.push( sync )
	accept[key] = function( text ){
		if( empty && text.trim() === "" ) return ""
		const rgb = hexToRgb( text )
		return rgb ? rgbToHex( rgb[0], rgb[1], rgb[2] ) : null
	}
	field.addEventListener( "change", function(){
		if( empty && field.value.trim() === "" ){
			note( "" ); state[key] = ""; sync(); draw(); return
		}
		const rgb = hexToRgb( field.value )
		if( !rgb ){ note( "Not a hex colour: " + field.value ); sync(); return }
		note( "" )
		state[key] = rgbToHex( rgb[0], rgb[1], rgb[2] )
		sync(); draw()
	} )
}
/* A typed series of words from a fixed set, one for all or one per column;
	 anything outside the set is refused and said, and the field snaps back. */
function wireWords( id, key, allowed, hint ){
	const field = element( id )
	const sync = function(){ field.value = state[key] }
	sync()
	rangeSync.push( sync )
	accept[key] = function( text ){
		const clean = text.trim().toLowerCase().replace( /[\s,]+/g, " " )
		const list = clean === "" ? [] : clean.split( " " )
		if( !list.length || list.some( function( w ){ return allowed.indexOf( w ) < 0 } ) ) return null
		return list.join( " " )
	}
	field.addEventListener( "change", function(){
		const ok = accept[key]( field.value )
		if( ok === null ){ note( hint ); sync(); return }
		note( "" )
		state[key] = ok
		sync(); draw()
	} )
}
/* How a per-column series is accepted from the address, when no field holds
	 it: every number in lo…hi, a `rising` series climbing by at least one
	 from entry to entry. `hi` may be a function, for a ceiling that depends on
	 the sheet. */
function acceptSeries( key, lo, hi, rising ){
	accept[key] = function( text ){
		const top = typeof hi === "function" ? hi() : hi
		const clean = String( text ).trim().replace( /[\s,]+/g, " " )
		const list = clean === "" ? [] : clean.split( " " ).map( Number )
		let bad = !list.length || list.some( function( v ){ return !( v >= lo && v <= top ) } )
		if( rising ) for( let i = 1; i < list.length; i++ ) if( list[i] < list[ i - 1 ] + 1 ) bad = true
		return bad ? null : list.join( " " )
	}
}
/* A numbered list and the dials beneath it, wired twice: once for the
	 columns and once for the bars. A column is a section of flow and a bar is
	 what stands between two, so there is one bar more than there are columns
	 and every inner bar is shared — which is why the bars are their own list
	 rather than a left or right side of a column (Hailei, 2026-09-12; the
	 side toggle was two ways of reaching the same bar). `count` says how many
	 items there are; the list has one number per item; pick one, and every
	 dial reads and writes that item's entry in its series. A short series is
	 expanded to one entry per item the way the sheet reads it, so a sheet
	 whose heights were "100 100" becomes "100 40 100 100" the moment one bar
	 is set. */
function wireList( tabsId, count, dials, colour ){
	const tabs = element( tabsId )
	let picked = 0
	const readList = function( d ){
		const n = count()
		if( d.share ) return widthsOf( state[ d.key ], n ).map( Math.round )
		const list = series( state[ d.key ] ), out = []
		for( let k = 0; k < n; k++ ) out.push( Math.round( d.repeat ? entryAt( list, k ) : stretched( list, k, n ) ) )
		return out
	}
	/* A share moves one bar. Column k's slider gives or takes from the last
		 column, so only k's right bar moves; the last column's slider gives or
		 takes from the column before it, so only its left bar moves. Every
		 column keeps at least one percent, which is what caps the slider. */
	const shareOf = function( list, k, v ){
		const other = k < list.length - 1 ? list.length - 1 : k - 1
		const room = list[k] + list[ other ] - 1
		v = Math.max( 1, Math.min( room, v ) )
		list[ other ] = list[k] + list[ other ] - v
		list[k] = v
		return v
	}
	const show = function( d, v ){ element( d.id + "Val" ).textContent = d.fmt ? d.fmt( v ) : v + ( d.unit || "" ) }
	/* COLOUR is a dial too, a hex field rather than a slider, and only the
		 bars have one: it reads and writes the picked item's entry, the series
		 expanded to one hex per item the way the sheet reads it, then folded
		 back at the tail where entries repeat — so black everywhere stays the
		 one word it opened as, and the address stays short (Hailei,
		 2026-09-12: each bar its own colour). */
	const inkField = colour ? element( colour.id ) : null, inkChip = colour ? element( colour.id + "Chip" ) : null
	const inks = function(){
		const list = hexes( state[ colour.key ] ), out = []
		for( let k = 0; k < count(); k++ ) out.push( list.length ? entryAt( list, k ) : "#000000" )
		return out
	}
	const inkSync = function(){
		if( !colour ) return
		const hex = inks()[ picked ]
		inkField.value = hex
		inkChip.style.background = hex
	}
	if( colour ){
		accept[ colour.key ] = function( text ){
			const tokens = String( text ).trim().split( /[\s,]+/ ).filter( Boolean ), list = hexes( text )
			return tokens.length && list.length === tokens.length ? list.join( " " ) : null
		}
		inkField.addEventListener( "change", function(){
			const rgb = hexToRgb( inkField.value )
			if( !rgb ){ note( "Not a hex colour: " + inkField.value ); inkSync(); return }
			note( "" )
			const list = inks()
			list[ picked ] = rgbToHex( rgb[0], rgb[1], rgb[2] )
			while( list.length > 1 && list[ list.length - 1 ] === list[ list.length - 2 ] ) list.pop()
			state[ colour.key ] = list.join( " " )
			inkSync(); draw()
		} )
	}
	const sync = function(){
		const n = count()
		if( picked >= n ) picked = n - 1
		inkSync()
		while( tabs.children.length > n ) tabs.removeChild( tabs.lastChild )
		while( tabs.children.length < n ){
			const b = document.createElement( "button" )
			b.type = "button"
			b.className = "btn"
			b.textContent = String( tabs.children.length + 1 )
			tabs.appendChild( b )
		}
		Array.prototype.forEach.call( tabs.children, function( b, k ){ b.classList.toggle( "on", k === picked ) } )
		dials.forEach( function( d ){
			const input = element( d.id )
			/* One column fills the room alone: its width is not a choice; and a
				 dial may say when the picked item leaves it nothing to do. */
			input.disabled = !!( d.rolled && dataHeld ) || !!( d.share && n < 2 ) || !!( d.heldWhen && d.heldWhen( picked ) )
			const v = readList( d )[ picked ]
			input.value = String( v )
			show( d, v )
		} )
	}
	sync()
	afterDraw.push( sync )
	rangeSync.push( sync )
	tabs.addEventListener( "click", function( e ){
		const b = e.target.closest( ".btn" )
		if( !b ) return
		picked = Array.prototype.indexOf.call( tabs.children, b )
		sync()
	} )
	dials.forEach( function( d ){
		const input = element( d.id )
		input.addEventListener( "input", function(){
			const list = readList( d )
			let v = Number( input.value )
			if( d.share ){
				if( list.length < 2 ) return
				v = shareOf( list, picked, v )
				input.value = String( v )
			} else list[ picked ] = v
			state[ d.key ] = list.join( " " )
			show( d, v )
			draw()
		} )
	} )
}
/* The columns: how wide each is, and how tangled the flow inside it. */
function wireColumns(){
	wireList( "colTabs", function(){ return lastDraw.bars - 1 }, [
		{ id:"colWidth", key:"width", unit:"%", share:true },
		{ id:"colTangle", key:"tangle", unit:"%", repeat:true, rolled:true }
	] )
}
/* The bars: how tall, how thick, their air, their nodes, their colour. */
function wireBars( asMille ){
	wireList( "barTabs", function(){ return lastDraw.bars }, [
		{ id:"barSpread", key:"spread", unit:"%" },
		/* PLACE has nothing to do for a bar at full height, and says so. */
		{ id:"barPlace", key:"place", unit:"%", heldWhen: function( k ){ return stretched( series( state.spread ), k, lastDraw.bars ) >= 100 } },
		{ id:"barThick", key:"bar", fmt:asMille },
		{ id:"barGap", key:"gap", fmt:asMille },
		{ id:"barNodes", key:"nodes", repeat:true, rolled:true }
	], { id:"barColour", key:"barColour" } )
}
/* Set while records are in DATA: the dials the records take over are held. */
let dataHeld = false
/* A row of words where exactly one is live. */
function wireGroup( rowId, attr, key ){
	const row = element( rowId )
	const sync = function(){
		Array.prototype.forEach.call( row.querySelectorAll( ".btn" ), function( b ){
			b.classList.toggle( "on", b.getAttribute( attr ) === state[key] )
		} )
	}
	sync()
	rangeSync.push( sync )
	accept[key] = function( text ){
		const b = row.querySelector( ".btn[" + attr + "='" + text.trim().toLowerCase() + "']" )
		return b && !b.disabled ? text.trim().toLowerCase() : null
	}
	row.addEventListener( "click", function( e ){
		const b = e.target.closest( ".btn" )
		/* A button on the row without the word is not one of the choices — the
			 RANDOM button shares the mode row and is left to its own listener. */
		if( !b || !b.hasAttribute( attr ) ) return
		state[key] = b.getAttribute( attr )
		sync(); draw()
	} )
}
const RATIOS = [
	[ "21 : 9", 21 / 9 ], [ "20 : 9", 20 / 9 ], [ "16 : 9", 16 / 9 ], [ "3 : 1", 3 ], [ "2 : 1", 2 ],
	[ "3 : 2", 1.5 ], [ "4 : 3", 4 / 3 ], [ "1 : 1", 1 ], [ "3 : 4", 0.75 ], [ "9 : 16", 9 / 16 ]
]

/* ROLL AGAIN. Only the seed and the handful of figures that decide a
	 composition move — ground, ink, bars and size are the designer's settings
	 and survive every roll. A dice that resets the sheet size is not a dice,
	 it is a reset button wearing a costume. */
function randomAll(){
	const rand = mulberry( ( Math.random() * 1e6 ) | 0 )
	state.seed = Math.floor( rand() * 1e6 )
	state.lines = Math.round( 80 + rand() * 360 )
	state.columns = 2 + Math.floor( rand() * 4 )
	state.nodes = String( 3 + Math.floor( rand() * 12 ) )
	state.skew = Math.round( 10 + rand() * 60 )
	state.tangle = String( Math.round( 10 + rand() * 60 ) )
	state.scatter = rand() < 0.3 ? Math.round( 40 + rand() * 60 ) : 0
	/* Rolls stay inside the frame. Bleeding past 100 is a deliberate act, not
		 something the dice should do to a composition behind the designer's back. */
	state.spread = Math.round( 62 + rand() * 38 ) + " " + Math.round( 62 + rand() * 38 )
	state.tension = Math.round( 35 + rand() * 55 )
	/* The columns' shares are rolled too, uneven but none under a tenth: every
		 column is given its tenth first and the rest of the hundred is dealt by
		 rolled weight, so the floor survives the normalising (a floor applied
		 before normalising did not — a share came out at 6). */
	const weights = []
	for( let k = 0; k < state.columns; k++ ) weights.push( rand() )
	let total = 0
	weights.forEach( function( w ){ total += w } )
	const rest = 100 - 10 * state.columns
	state.width = weights.map( function( w ){ return Math.round( 10 + rest * w / total ) } ).join( " " )
	rangeSync.forEach( function( s ){ s() } )
	draw()
}

function init(){
	element( "title" ).innerHTML = "WHL GENERATIVE ALLUVIAL <span id='version'>" + VERSION + "</span>"

	/* Thousandths of the output height, said as such. Not pixels: those change
		 with the output height and are not what the dial is (Hailei,
		 2026-09-12). */
	const asMille = function( v ){ return v + "‰" }

	wirePair( "linesR", "lines", "lines" )
	/* A change of COLUMNS starts the widths even again: a list of shares
		 made for four columns is no plan for five. */
	wireRange( "columns", "columns", { after:function(){ state.width = "" } } )
	wireRange( "skew", "skew" )
	wireRange( "split", "split" )
	/* ORDER is three words on screen. The address may still carry the full
		 grammar — az and za for records, one word per bar — since the NASA
		 preset is drawn za, and none of the three lights up then. */
	wireGroup( "orderRow", "data-order", "order" )
	accept.order = function( text ){
		const clean = text.trim().toLowerCase().replace( /[\s,]+/g, " " )
		const list = clean === "" ? [] : clean.split( " " )
		if( !list.length || list.some( function( w ){ return [ "rolled", "big", "small", "az", "za" ].indexOf( w ) < 0 } ) ) return null
		return list.join( " " )
	}

	/* DATA is disabled for now (Hailei, 2026-09-12: the button stands for
		 the feature, the records field is gone). Records still arrive by the
		 address — one record per line, fields by tab, which is how the NASA
		 sheet is drawn — and then the dials the records take over are held. */
	accept.data = function( text ){
		if( text.trim() === "" ) return ""
		const rows = records( text )
		return rows ? rows.map( function( r ){ return r.join( "\t" ) } ).join( "\n" ) : null
	}
	const syncData = function(){
		const rows = state.data ? records( state.data ) : null
		dataHeld = !!rows
		;[ "lines", "linesR", "columns", "skew", "split" ].forEach( function( id ){ element( id ).disabled = !!rows } )
	}
	syncData()
	rangeSync.push( syncData )
	/* MODE: CONTROL shows the column and bar panels; DATA is disabled until
		 the feature comes, and a disabled word is refused from the address too.
		 RANDOM on the same line is a button, not a mode. */
	wireGroup( "modeRow", "data-mode", "mode" )
	const syncMode = function(){
		element( "columnPanel" ).classList.toggle( "hidden", state.mode !== "control" )
		element( "barPanel" ).classList.toggle( "hidden", state.mode !== "control" )
	}
	syncMode()
	rangeSync.push( syncMode )
	afterDraw.push( syncMode )
	wireGroup( "bodyRow", "data-body", "body" )
	wireRange( "bandWidth", "bandWidth", { unit:"%" } )
	wireRange( "bandAlpha", "bandAlpha", { unit:"%" } )
	wireRange( "bandVary", "bandVary", { unit:"%" } )
	/* The per-bar series are read from the address through the same bounds
		 the sliders keep, and a bar's width may be anything short of half the
		 sheet: in thousandths of the height that is 500 times the ratio. */
	acceptSeries( "nodes", 1, 600 )
	acceptSeries( "tangle", 0, 100 )
	acceptSeries( "width", 1, 100 )
	acceptSeries( "spread", 0, 100 )              /* a bar stands at most the canvas's full height (Hailei, 2026-09-12) */
	acceptSeries( "place", 0, 100 )
	acceptSeries( "bar", 0, function(){ return 500 * state.ratio - 0.01 } )
	acceptSeries( "gap", 0, 80 )
	wireColumns()
	wireBars( asMille )
	wireRange( "scatter", "scatter", { unit:"%" } )
	wireRange( "tension", "tension" )
	wireRange( "weight", "weight", { scale:10, fmt:asMille } )
	wireRange( "weightVary", "weightVary", { unit:"%" } )
	wireRange( "alpha", "alpha", { unit:"%" } )
	wireRange( "alphaVary", "alphaVary", { unit:"%" } )
	wireHex( "ground", "ground" )
	wireHex( "accent", "accent", true )

	/* The colour shelf. One selected slot at a time: a swatch picks its slot
		 and opens the picker on it, which writes straight into the palette —
		 the hex field the shelf once had went when the picker came (Hailei,
		 2026-09-12). The eight slots always exist; COLOURS only says how many
		 are in play, so turning it down and back up gives back the colours that
		 were chosen rather than a fresh derivation. */
	const openPicker = wirePicker()
	let picked = 0
	const shelf = element( "swatches" )
	const drawShelf = function(){
		if( picked >= state.colours ) picked = state.colours - 1
		shelf.innerHTML = ""
		for( let i = 0; i < state.colours; i++ ){
			const b = document.createElement( "button" )
			b.type = "button"
			b.className = "swatch" + ( i === picked ? " sel" : "" )
			b.style.background = state.palette[i]
			b.setAttribute( "data-slot", String( i ) )
			b.setAttribute( "aria-label", "Colour " + ( i + 1 ) )
			shelf.appendChild( b )
		}
	}
	drawShelf()
	rangeSync.push( drawShelf )
	accept.palette = function( text ){
		const list = text.split( "," ).map( hexToRgb )
		if( list.length !== DEFAULTS.palette.length || list.some( function( c ){ return !c } ) ) return null
		return list.map( function( c ){ return rgbToHex( c[0], c[1], c[2] ) } )
	}
	shelf.addEventListener( "click", function( e ){
		const b = e.target.closest( ".swatch" )
		if( !b ) return
		picked = Number( b.getAttribute( "data-slot" ) )
		drawShelf()
		/* The shelf is redrawn on every pick, so the anchor is looked up afresh. */
		openPicker( {
			id: "swatch",
			get: function(){ return state.palette[ picked ] },
			set: function( hex ){ state.palette[ picked ] = hex; drawShelf(); draw() }
		}, shelf.children[ picked ] )
	} )
	/* RANDOM under the shelf rolls all eight slots and nothing else — not the
		 seed, not the accent, not the count in play (Hailei, 2026-09-12). Off
		 its own dice, so the sheet's seed still draws the same sheet. */
	element( "randomColours" ).addEventListener( "click", function(){
		state.palette = rollPalette( mulberry( ( Math.random() * 1e6 ) | 0 ) )
		drawShelf(); draw()
	} )
	wireRange( "colours", "colours", { after:drawShelf } )
	wireGroup( "byRow", "data-by", "colourBy" )

	/* The seed has no field: the readout on the left shows it and the address
		 carries it (Hailei, 2026-09-12). It is still read from the address. */
	accept.seed = function( text ){ const v = bounded( 0, 999999 )( text ); return v === null ? null : Math.round( v ) }

	const ratioSel = element( "ratioSel" ), ratioNum = element( "ratioNum" )
	RATIOS.forEach( function( r ){
		const o = document.createElement( "option" )
		o.value = String( r[1] ); o.textContent = r[0]
		ratioSel.appendChild( o )
	} )
	const syncRatio = function(){
		ratioNum.value = state.ratio.toFixed( 2 )
		const match = RATIOS.filter( function( r ){ return Math.abs( r[1] - state.ratio ) < 0.005 } )[0]
		ratioSel.value = match ? String( match[1] ) : ""
	}
	syncRatio()
	rangeSync.push( syncRatio )
	accept.ratio = bounded( 0.2, 20 )
	ratioSel.addEventListener( "change", function(){
		state.ratio = Number( ratioSel.value )
		syncRatio(); draw()
	} )
	ratioNum.addEventListener( "change", function(){
		state.ratio = Math.max( 0.2, Math.min( 20, Number( ratioNum.value ) || 1 ) )
		syncRatio(); draw()
	} )
	const outH = element( "outH" )
	outH.value = String( state.outH )
	rangeSync.push( function(){ outH.value = String( state.outH ) } )
	accept.outH = function( text ){ const v = bounded( 200, 8000 )( text ); return v === null ? null : Math.round( v ) }
	outH.addEventListener( "change", function(){
		state.outH = Math.max( 200, Math.min( 8000, Number( outH.value ) || 1080 ) )
		rangeSync.forEach( function( s ){ s() } )       /* the px readouts follow the height */
		draw()
	} )

	element( "randomAll" ).addEventListener( "click", randomAll )
	element( "dlSvg" ).addEventListener( "click", function(){
		const size = outSize()
		download( new Blob( [ buildSvg( size[0], size[1] ).svg ], { type:"image/svg+xml" } ),
			"WHL-generative-alluvial-" + state.seed + "-" + stamp() + ".svg" )
	} )
	element( "dlPng" ).addEventListener( "click", function(){
		const b = element( "dlPng" )
		b.disabled = true; b.textContent = "..."
		rasterise( "image/png" )
			.then( function( r ){ download( r.blob, "WHL-generative-alluvial-" + state.seed + "-" + stamp() + ".png" ) } )
			.catch( function( fault ){ note( "PNG failed — " + fault.message ) } )
			.then( function(){ b.disabled = false; b.textContent = "PNG" } )
	} )
	/* LINK saves a text file holding the page's URL, settings and all — every
		 setting that differs from the defaults is after the # — so a sheet is
		 kept beside its exports and opened again exactly (Hailei, 2026-09-12:
		 "export the link params, so next time I can recover an image
		 immediately"; then "the LINK shall be a .txt file"). Same name as the
		 SVG and PNG it belongs with. */
	element( "dlLink" ).addEventListener( "click", function(){
		const p = sheetParams()
		download( new Blob( [ HOME + ( p ? "?" + p : "" ) + "\n" ], { type:"text/plain" } ),
			"WHL-generative-alluvial-" + state.seed + "-" + stamp() + ".txt" )
	} )

	/* The licence sheet folds like the Gradient tool's: the line toggles it
		 open, the door closes it. */
	const fold = function( doorId, sheetId ){
		element( doorId ).addEventListener( "click", function(){
			element( sheetId ).classList.toggle( "hidden" )
		} )
		element( sheetId ).querySelector( ".sheetClose" ).addEventListener( "click", function(){
			element( sheetId ).classList.add( "hidden" )
		} )
	}
	fold( "terms", "licence" )

	/* The shell's three columns — canvas, help, controls — are one grid whose
		 column template is a class on the shell, the nexus pattern: a hidden
		 column is 0px wide and the change slides. HELP toggles the help column;
		 FULLSCREEN / PANEL on the title line toggles the control column, and
		 FULLSCREEN folds the help away too, a full screen being the canvas
		 alone (Hailei, 2026-09-13). The stage's own resize observer re-fits
		 the sheet as its column grows or shrinks. Neither is a setting of the
		 sheet, so neither rides in the link. */
	const view = { help:false, panel:true }
	const shellSync = function(){
		element( "shell" ).className = "show-canvas" + ( view.help ? "-help" : "" ) + ( view.panel ? "-panel" : "" )
		element( "viewFull" ).classList.toggle( "on", !view.panel )
		element( "viewPanel" ).classList.toggle( "on", view.panel )
	}
	shellSync()
	element( "helpBtn" ).addEventListener( "click", function(){ view.help = !view.help; shellSync() } )
	element( "help" ).querySelector( ".sheetClose" ).addEventListener( "click", function(){ view.help = false; shellSync() } )
	element( "view" ).addEventListener( "click", function(){
		if( view.panel ){ view.panel = false; view.help = false } else view.panel = true
		shellSync()
	} )

	/* The help sheet's two texts come from help.js. */
	element( "helpText" ).innerHTML = HELP.en
	element( "helpText" ).setAttribute( "data-cn-html", HELP.zh )
	/* EN/CN. Every translatable node carries its Chinese on the element, so the
		 toggle is a walk and a swap with no table to keep in step. */
	const carriers = document.querySelectorAll( "[data-cn],[data-cn-html],[data-cn-placeholder]" )
	Array.prototype.forEach.call( carriers, function( el ){
		el.setAttribute( "data-en", el.hasAttribute( "data-cn-html" ) ? el.innerHTML
			: el.hasAttribute( "data-cn-placeholder" ) ? el.placeholder : el.textContent )
	} )
	const speak = function( cn ){
		Array.prototype.forEach.call( carriers, function( el ){
			if( el.hasAttribute( "data-cn-html" ) ) el.innerHTML = cn ? el.getAttribute( "data-cn-html" ) : el.getAttribute( "data-en" )
			else if( el.hasAttribute( "data-cn-placeholder" ) ) el.placeholder = cn ? el.getAttribute( "data-cn-placeholder" ) : el.getAttribute( "data-en" )
			else el.textContent = cn ? el.getAttribute( "data-cn" ) : el.getAttribute( "data-en" )
		} )
		element( "langEn" ).classList.toggle( "on", !cn )
		element( "langCn" ).classList.toggle( "on", cn )
	}
	element( "lang" ).addEventListener( "click", function(){
		speak( !element( "langCn" ).classList.contains( "on" ) )
	} )

	/* Zoom is wired by hand rather than through wireRange because it must not
		 call draw(): nothing about the artwork has changed, and rebuilding the
		 whole sheet on every drag of a view control would stutter for no reason. */
	const zoom = element( "zoom" ), zoomVal = element( "zoomVal" )
	zoomSync = function(){
		zoom.value = String( Math.round( state.zoom ) )
		zoomVal.textContent = Math.round( state.zoom ) + "%"
	}
	zoomSync()
	rangeSync.push( zoomSync )
	zoom.addEventListener( "input", function(){
		state.zoom = Number( zoom.value )
		lastFit = -1                    /* the zoom is the designer's now — stop re-fitting */
		zoomSync(); syncSize()
	} )
	element( "fit" ).addEventListener( "click", function(){
		state.zoom = fitZoom()
		lastFit = state.zoom
		zoomSync(); syncSize()
	} )

	window.addEventListener( "resize", follow )
	if( window.ResizeObserver ) new ResizeObserver( follow ).observe( element( "stage" ) )

	/* A link that carries a sheet is read after every control has said how
		 it accepts a value, and the controls are then shown the result. The
		 ?selftest flag is read now too: the first draw rewrites the query with
		 the sheet's own settings, and the flag would be gone. */
	const proving = location.search.indexOf( "selftest" ) >= 0
	readParams()
	rangeSync.forEach( function( s ){ s() } )

	/* Open fitted. A sheet whose last column is hidden under the bar is not a
		 starting point a designer should have to fix before looking. */
	state.zoom = fitZoom()
	lastFit = state.zoom
	zoomSync()
	draw()
	if( proving ) selftest()
}
init()
/* The sidecar face loads asynchronously and the metrics swap moves the readout
	 onto new ground, so the title offset the language toggle sits on has to be
	 measured again once the font has arrived. */
document.fonts.ready.then( function(){ setTimeout( tuneHud, 60 ) } )
