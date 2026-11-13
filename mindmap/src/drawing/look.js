import { NODE, BRANCH, LINE } from "../model/style.js"
import { Theme } from "./themes.js"
import { inkOver, isLightColour, contrast } from "./colour.js"
import { shownFill } from "./shapes.js"
import { colourStyleFor } from "./colour-styles.js"

/* What every value falls back to when nothing above has set it: the house's
	shapes, sizes and widths — every node a pill with no border, set at one
	size at every level, the central node too, and every branch an elbow.
	Colours always come from the theme. */
const BASE = {
	root: NODE.style( { shape: "pill", borderWidth: 0, font: "mono", fontSize: 14 } ),
	node: NODE.style( { shape: "pill", borderWidth: 0, font: "mono", fontSize: 14 } ),
	/* 1.25 wide, thinner than the 2 it was, at the master's word (2026-11-12). */
	branch: BRANCH.style( { shape: "elbow", width: 1.25, dash: "solid" } ),
	/* Dotted in round dots, and 1.5 wide, at the master's word (2026-11-12):
		 halved to 0.75 first, it was too thin to read once dotted. */
	line: LINE.style( { width: 1.5, dash: "dotted" } ),
}
/* WCAG's measures for what is drawn straight onto the canvas: words read at
	4.5 to 1 against it, and a line or an outline is seen at 3 to 1. */
const WORDS_READ = 4.5
const MARKS_SEEN = 3
/* How wide the edge is that a node is drawn with where its fill alone would not be seen on the canvas: a border's narrowest step. */
const EDGE_WIDTH = 1

/* How each thing on the map looks, every value settled. The one place the
	order is kept:

	- a node: what it has been given by hand; for its fill, then the fill of
	  its branch — the nearest set by hand above it; then the map's style for
	  its kind; then the theme, coloured by the map's colour style; then the
	  base;
	- a branch: what it has been given by hand, over the map's branch style;
	  its colour, when neither gives one, the fill of the node it leads to, at
	  the master's word (2026-11-12, 22:35): a node and its branch are one
	  colour; where that node shows no fill, the colour the theme gives it;
	  then the base;
	- an auxiliary line: by hand, the map's line style, the theme, the base.

	The theme is taken in the map's appearance, light or dark; a canvas
	colour of the map's own stands in for the theme's background, and then
	the appearance is the canvas's own, so the nodes follow it.

	Whatever is drawn straight onto the canvas — a branch, an auxiliary line
	and its label, a node's border, the words of a node that shows no fill
	— reads on it by WCAG's measure, whoever chose its colour: where it falls
	short, it is drawn in the canvas's own ink, black or white, whichever
	reads better (found in use, 2026-11-13: lines, outlines and words given
	black by hand vanished on a black canvas). The canvas and the fills keep
	the colours chosen; a filled node whose fill would not be seen on the
	canvas is drawn with an edge in its ink instead (nodeAsDrawn). */
export class Look {
	constructor( map ){
		this.map = map
		this.canvas = map.style.canvas
		this.appearance = this.canvas ? ( isLightColour( this.canvas ) ? "light" : "dark" ) : map.appearance
		this.scheme = Theme.for( map.theme ).scheme( this.appearance )
		/* The colour style the map has been given, or else its theme's own. */
		this.colourStyle = map.style.colourStyle || Theme.for( map.theme ).colourStyle
		this.colours = colourStyleFor( this.colourStyle )
	}

	/* Words not given a colour — by hand or by the map's style — are black
		 or white, whichever reads better over what lies behind them: the
		 node's fill, or the map's background where the shape shows no fill. A
		 theme cannot choose them, since it does not know the shape or a fill
		 set by hand. */
	node( topic ){
		const chosen = topic.style.over( this.inheritedFill( topic ) ).over( this.map.style.forTopic( topic ) )
		const style = chosen.over( this.scheme.node( topic, this.colours ) ).over( topic.isRoot ? BASE.root : BASE.node )
		const fill = shownFill( style ), words = chosen.get( "textColour" ) ?? inkOver( fill ?? this.background )
		const border = style.get( "borderWidth" ) > 0 ? this.onCanvas( style.get( "border" ), MARKS_SEEN ) : style.get( "border" )
		return style.with( { textColour: fill ? words : this.onCanvas( words, WORDS_READ ), border } )
	}

	/* A node as it is drawn: its look, edged in the canvas's own ink where it
		 shows a fill standing below 3 to 1 against the canvas and has no border
		 to show its shape (found in review, 2026-11-13: in Mono's LEVEL and
		 RAINBOW, grey pills vanished into a mid-grey or orange canvas, #8e8e8e
		 at 1.07 to 1 on #e85d04). The fill keeps its colour, and its words read
		 on it as ever. The edge is the drawing's, not the node's: the panel
		 shows the node's look, its own border none, so the edge is never a
		 border the user did not give and could not take away. */
	nodeAsDrawn( topic ){
		const style = this.node( topic ), fill = shownFill( style )
		const unseen = fill && !( style.get( "borderWidth" ) > 0 ) && contrast( fill, this.background ) < MARKS_SEEN
		return unseen ? style.with( { border: inkOver( this.background ), borderWidth: EDGE_WIDTH } ) : style
	}

	/* The fill a node takes when it has none of its own: its branch's. */
	inheritedFill( topic ){
		return NODE.style( { fill: topic.branchFill } )
	}

	branch( topic ){
		const chosen = topic.branch.over( this.map.style.branch )
		const given = chosen.over( this.scheme.branch( topic, this.colours ) ).over( BASE.branch )
		const to = chosen.get( "colour" ) !== undefined || topic.isRoot ? null : shownFill( this.node( topic ) )
		return given.with( { colour: this.onCanvas( to ?? given.get( "colour" ), MARKS_SEEN ) } )
	}

	line( line ){
		const style = line.style.over( this.map.style.line ).over( this.scheme.line() ).over( BASE.line )
		return style.with( { colour: this.onCanvas( style.get( "colour" ), MARKS_SEEN ) } )
	}

	/* The colour of a line's label: its line's, where words read in it. */
	labelColour( line ){
		return this.onCanvas( this.line( line ).get( "colour" ), WORDS_READ )
	}

	/* A colour drawn straight onto the canvas, or the canvas's own ink where it reads there below this measure. */
	onCanvas( colour, least ){
		return contrast( colour, this.background ) >= least ? colour : inkOver( this.background )
	}

	get background(){
		return this.canvas || this.scheme.background
	}

	/* Whether the ground is light, which turns the interface's ink black. */
	get isLight(){
		return isLightColour( this.background )
	}

	/* The ink the interface's words, the remark's among them, are written in on this ground. */
	get ink(){
		return inkOver( this.background )
	}
}
