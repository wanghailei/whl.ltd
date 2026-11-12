import { NODE, BRANCH, LINE } from "../model/style.js"
import { Theme } from "./themes.js"
import { inkOver, isLightColour } from "./colour.js"
import { shapeFor } from "./shapes.js"
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
	the appearance is the canvas's own, so the nodes follow it. */
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
		if( chosen.get( "textColour" ) !== undefined ) return style
		return style.with( { textColour: inkOver( this.shownFill( style ) ?? this.background ) } )
	}

	/* The fill a node takes when it has none of its own: its branch's. */
	inheritedFill( topic ){
		return NODE.style( { fill: topic.branchFill } )
	}

	/* The fill a node shows, or null where its shape shows none or it has none. */
	shownFill( style ){
		const fill = style.get( "fill" )
		return shapeFor( style.get( "shape" ) ).showsFill && fill !== "none" ? fill : null
	}

	branch( topic ){
		const chosen = topic.branch.over( this.map.style.branch )
		const given = chosen.over( this.scheme.branch( topic, this.colours ) ).over( BASE.branch )
		if( chosen.get( "colour" ) !== undefined || topic.isRoot ) return given
		const to = this.shownFill( this.node( topic ) )
		return to ? given.with( { colour: to } ) : given
	}

	line( line ){
		return line.style.over( this.map.style.line ).over( this.scheme.line() ).over( BASE.line )
	}

	get background(){
		return this.canvas || this.scheme.background
	}

	/* Whether the ground is light, which turns the interface's ink black. */
	get isLight(){
		return isLightColour( this.background )
	}
}
