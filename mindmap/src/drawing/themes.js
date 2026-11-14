/* Pre-v3 themes, retained only by the Imported colours provider so older
	maps and defaults keep their exact generated colours. No theme is offered
	by the current panel. The original palette arithmetic remains unchanged. */
import { NODE, BRANCH, LINE } from "../model/style.js"
import { houseCell } from "./colour.js"

/* The colours a theme gives in one appearance, light or dark: the
	background; the central node's fill; a run of colours for the other nodes,
	at full strength and a rung nearer the ground; the border of every node,
	the scheme's own or else its fill; the colour of a branch asked of the
	central node; and the auxiliary lines. Which of the run a node takes is
	the map's colour style's choice (colour-styles.js). A theme gives colours
	only; shapes, fonts and widths are the map's and the nodes' own, the colour
	of the words follows the fill behind them, and a branch takes the fill of
	the node it leads to (look.js). */
class Scheme {
	constructor( { background, root, mains, deeper = mains, border = null, branch, line } ){
		this.background = background
		this.root = root
		this.mains = mains
		this.deepers = deeper
		this.border = border
		this.branchColour = branch
		this.lineColour = line
	}

	/* The colour of this place in the run at full strength, counted round, however many places a map asks for. */
	main( index ){
		return this.mains[ index % this.mains.length ]
	}

	/* The colour of this place in the run a rung nearer the ground, counted round. */
	deeper( index ){
		return this.deepers[ index % this.deepers.length ]
	}

	/* A node's fill, as the colour style chooses it, and its border. */
	node( topic, colours ){
		const fill = colours.fillOf( topic, this )
		return NODE.style( { fill, border: this.border ?? fill } )
	}

	/* The colour a branch takes where the node it leads to shows no fill: the
		 colour the style gives that node. The central node has no branch of its
		 own; asked for one, it is given the scheme's own branch colour. */
	branch( topic, colours ){
		return BRANCH.style( { colour: topic.isRoot ? this.branchColour : colours.fillOf( topic, this ) } )
	}

	line(){
		return LINE.style( { colour: this.lineColour } )
	}
}

/* A theme: its schemes for the two appearances, and its own colour style,
	the one a map takes until one is chosen for it: the rainbow for the
	palette themes, and ONE for Mono, so a Mono map is all white, or all
	black, as it ever was, at the master's word through the Director
	(2026-11-12): LEVEL's and RAINBOW's greys show only when chosen. */
export class Theme {
	constructor( { light, dark, colourStyle = "rainbow" } ){
		this.schemes = { light, dark }
		this.colourStyle = colourStyle
	}

	static for( name ){
		return THEMES[ name ] ?? THEMES.mono
	}

	scheme( appearance ){
		return this.schemes[ appearance ] ?? this.schemes.dark
	}
}

/* Eight hue families of the house palette laid in a stride round their ring,
	as Alluvial lays its shelf, so neighbouring main branches stand far apart
	on the wheel instead of shading into one another. */
function palette( columns, rung ){
	return [ 0, 4, 2, 6, 1, 5, 3, 7 ].map( slot => houseCell( columns[ slot ], rung ) )
}

/* A palette theme: hue families for the branches, and one family for the
	ground and the central node — deep in the dark, pale in the light. The
	rungs are chosen by contrast, measured for every family of every theme
	(test/logic/look.test.js holds them to it): the words on each fill read at
	4.5 to 1 or better, and a branch drawn in a fill reads on the ground at 3
	to 1 or better. That rules out rung 10 for words, and in the light, rungs
	above 9 for branches. On the dark ground the main nodes are rung 12
	(lightness 0.68) and those deeper rung 9; on the light, rung 6 and rung 9. */
function paletteTheme( { columns, ground } ){
	return new Theme( {
		dark: new Scheme( {
			background: houseCell( ground, 0 ),
			root: houseCell( ground, 15 ),
			mains: palette( columns, 12 ),
			deeper: palette( columns, 9 ),
			branch: houseCell( ground, 12 ),
			line: houseCell( ground, 13 ),
		} ),
		light: new Scheme( {
			background: houseCell( ground, 17 ),
			root: houseCell( ground, 4 ),
			mains: palette( columns, 6 ),
			deeper: palette( columns, 9 ),
			branch: houseCell( ground, 6 ),
			line: houseCell( ground, 5 ),
		} ),
	} )
}

/* The five schemes. Mono is the house itself: white nodes on a near-black
	ground, black ones on white, its first colour the ink of the ground, as
	every node is under ONE, its own colour style; it has no hues, so for LEVEL and RAINBOW to show
	their difference it runs on in steps of grey, at the master's word
	(2026-11-12, 22:35), neighbours far apart, each reading under black or
	white words and on the ground as the palette themes' colours do. It does
	not fade outwards. Its four greys stand evenly apart in lightness, at
	least 0.15 in OKLab's, from its first, the ground's ink, to the
	furthest a branch still reads on the ground at 3 to 1; white and #d4d4d4
	looked almost the same (found in use, 2026-11-13). The others take their hue families from the house
	palette's 28: Spectrum spread round the whole wheel, Ocean the cyans to the
	blues, Earth the ochres to the greens, Dusk the violets to the roses. */
const THEMES = {
	mono: new Theme( {
		dark: new Scheme( {
			background: "#0b0b0b",
			root: "#ffffff",
			mains: [ "#ffffff", "#949494", "#c8c8c8", "#636363" ],
			border: "#8c8c8c",
			branch: "#8c8c8c",
			line: "#bdbdbd",
		} ),
		light: new Scheme( {
			background: "#ffffff",
			root: "#111111",
			mains: [ "#111111", "#616161", "#363636", "#8e8e8e" ],
			border: "#8c8c8c",
			branch: "#8c8c8c",
			line: "#595959",
		} ),
		colourStyle: "one",
	} ),
	spectrum: paletteTheme( { columns: [ 0, 4, 8, 11, 14, 18, 21, 25 ], ground: 16 } ),
	ocean: paletteTheme( { columns: [ 12, 13, 14, 15, 16, 17, 18, 19 ], ground: 16 } ),
	earth: paletteTheme( { columns: [ 1, 2, 3, 4, 5, 6, 7, 9 ], ground: 3 } ),
	dusk: paletteTheme( { columns: [ 19, 20, 21, 22, 23, 24, 25, 26 ], ground: 22 } ),
}
