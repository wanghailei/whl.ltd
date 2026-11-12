import { NODE, BRANCH, LINE } from "../model/style.js"
import { houseCell } from "./colour.js"

/* The colours a theme gives in one appearance, light or dark: the
	background, the fill and border of every node, the colour of a branch from
	a node that shows no fill, and the auxiliary lines. A theme gives colours
	only; shapes, fonts and widths are the map's and the nodes' own, the colour
	of the words follows the fill behind them, and a branch takes the fill of
	the node it starts from (look.js).

	The plain scheme fills every node at every level with the ink of its
	ground: white on a dark canvas, black on a light one. */
class Scheme {
	constructor( { background, fill, border, branch, line } ){
		this.background = background
		this.fill = fill
		this.border = border
		this.branchColour = branch
		this.lineColour = line
	}

	node(){
		return NODE.style( { fill: this.fill, border: this.border } )
	}

	branch(){
		return BRANCH.style( { colour: this.branchColour } )
	}

	line(){
		return LINE.style( { colour: this.lineColour } )
	}
}

/* A scheme that gives every main branch a colour of its own. The central
	node is filled from the ground's own family; a main node with its branch's
	colour; every node deeper with a rung of the same colour nearer the
	ground, so the map fades outwards as it goes. A branch from a node that
	shows no fill is drawn in its main branch's colour. */
class PaletteScheme extends Scheme {
	constructor( { root, mains, deeper, ...colours } ){
		super( colours )
		this.root = root
		this.palettes = [ mains, deeper ]
	}

	node( topic ){
		const colour = topic.isRoot ? this.root : this.colourOf( topic, this.palettes[ Math.min( topic.depth, 2 ) - 1 ] )
		return NODE.style( { fill: colour, border: colour } )
	}

	/* The central node has no branch of its own; asked for one, it is given the scheme's own branch colour. */
	branch( topic ){
		if( topic.isRoot ) return super.branch()
		return BRANCH.style( { colour: this.colourOf( topic, this.palettes[ 0 ] ) } )
	}

	colourOf( topic, palette ){
		return palette[ topic.mainBranch.index % palette.length ]
	}
}

export class Theme {
	constructor( { light, dark } ){
		this.schemes = { light, dark }
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
		dark: new PaletteScheme( {
			background: houseCell( ground, 0 ),
			root: houseCell( ground, 15 ),
			mains: palette( columns, 12 ),
			deeper: palette( columns, 9 ),
			branch: houseCell( ground, 12 ),
			line: houseCell( ground, 13 ),
		} ),
		light: new PaletteScheme( {
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
	ground, black ones on white. The others take their hue families from the
	house palette's 28: Spectrum spread round the whole wheel, Ocean the cyans
	to the blues, Earth the ochres to the greens, Dusk the violets to the
	roses. */
const THEMES = {
	mono: new Theme( {
		dark: new Scheme( {
			background: "#0b0b0b",
			fill: "#ffffff",
			border: "#8c8c8c",
			branch: "#8c8c8c",
			line: "#bdbdbd",
		} ),
		light: new Scheme( {
			background: "#ffffff",
			fill: "#111111",
			border: "#8c8c8c",
			branch: "#8c8c8c",
			line: "#595959",
		} ),
	} ),
	spectrum: paletteTheme( { columns: [ 0, 4, 8, 11, 14, 18, 21, 25 ], ground: 16 } ),
	ocean: paletteTheme( { columns: [ 12, 13, 14, 15, 16, 17, 18, 19 ], ground: 16 } ),
	earth: paletteTheme( { columns: [ 1, 2, 3, 4, 5, 6, 7, 9 ], ground: 3 } ),
	dusk: paletteTheme( { columns: [ 19, 20, 21, 22, 23, 24, 25, 26 ], ground: 22 } ),
}
