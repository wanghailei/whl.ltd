/* How a map's nodes take the colours of its theme, chosen for the whole map
	at the master's word (2026-11-12, 22:35): every node at one depth in one
	colour, every node in one colour, or each main branch with all under it in
	one colour. The central node always takes its scheme's own colour; the
	scheme holds the colours, and a style only chooses among them (themes.js).
	A branch takes the colour of the node it leads to (look.js), so in every
	style a node and its branch are one colour.

	Pre-flight answers. A style knows only which of a scheme's colours a node
	takes, asking the node its depth and its main branch; the factory picks a
	style by the map's word, and nothing else asks which style a map has. */
class ColourStyle {
	fillOf( topic, scheme ){
		return topic.isRoot ? scheme.root : this.colourOf( topic, scheme )
	}
}

/* 同層同色: every node at one depth takes one colour, each depth the next. */
class LevelColours extends ColourStyle {
	colourOf( topic, scheme ){
		return scheme.main( topic.depth - 1 )
	}
}

/* 全局同色: every node but the central one takes the scheme's first colour. */
class OneColour extends ColourStyle {
	colourOf( topic, scheme ){
		return scheme.main( 0 )
	}
}

/* 彩虹色: each main branch, with all its sub-branches, takes one colour: the
	main node at full strength, every node deeper a rung of the same colour
	nearer the canvas, so the map fades outwards. */
class RainbowColours extends ColourStyle {
	colourOf( topic, scheme ){
		const index = topic.mainBranch.index
		return topic.depth === 1 ? scheme.main( index ) : scheme.deeper( index )
	}
}

const STYLES = { level: new LevelColours(), one: new OneColour(), rainbow: new RainbowColours() }

/* The colour style of this name; a name not known is the rainbow. A map
	given none takes its theme's own (look.js, themes.js). */
export function colourStyleFor( name ){
	return STYLES[ name ] ?? STYLES.rainbow
}
