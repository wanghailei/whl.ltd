/* How a node, a branch or an auxiliary line looks: a style.

	A style holds only what has been set. What is not set shows through from
	the style beneath it, so a node's look is its own style laid over the
	map's style for its kind, laid over the theme (see drawing/look.js). That
	is why a style is never filled in with defaults here: an unset value and a
	value set to the default mean different things once the theme changes.

	Pre-flight answers. A style knows its own values and its kind; it is never
	told what it holds by anyone reading it. What may be set, and what a value
	may be, is its kind's knowledge, held in one polymorphic property per name
	(Choice, Colour, Measure), so no code switches on a property's type. A
	style is a value: every change returns a new style of the same kind. */

/* One of a fixed set of words. A word Mindmap once offered and no longer
	does is read as the word that took its place, so a file or a default kept
	from before still opens as near to how it looked as can be drawn. */
class Choice {
	constructor( words, { retired = {} } = {} ){
		this.words = words
		this.retired = retired
	}

	accept( value ){
		if( Object.hasOwn( this.retired, value ) ) return this.retired[ value ]
		return this.words.includes( value ) ? value : undefined
	}

	get isColour(){ return false }
}

/* A colour, said as #rrggbb. Three-digit hex is widened and any case is
	lowered, so two styles that mean the same colour hold the same text. A fill
	may also be none, which draws no fill at all. */
class Colour {
	constructor( { mayBeNone = false } = {} ){
		this.mayBeNone = mayBeNone
	}

	accept( value ){
		if( this.mayBeNone && value === "none" ) return "none"
		return hexColour( value )
	}

	get isColour(){ return true }
}

/* A number between two bounds. A number outside them is held to them; what is
	not a number at all is refused. */
class Measure {
	constructor( least, most ){
		this.least = least
		this.most = most
	}

	accept( value ){
		if( typeof value !== "number" || !Number.isFinite( value ) ) return undefined
		return Math.min( this.most, Math.max( this.least, value ) )
	}

	get isColour(){ return false }
}

/* What a style of one kind may hold. */
class StyleKind {
	constructor( properties ){
		this.properties = properties
	}

	style( values = {} ){
		return new Style( this, this.clean( values ) )
	}

	/* The value this kind would keep for a property, or undefined when it would refuse it. */
	accept( name, value ){
		return this.properties[ name ]?.accept( value )
	}

	/* Only the names this kind knows, each with a value it accepts. */
	clean( values ){
		const kept = {}
		for( const [ name, property ] of Object.entries( this.properties ) ){
			const accepted = property.accept( values?.[ name ] )
			if( accepted !== undefined ) kept[ name ] = accepted
		}
		return kept
	}

	get colourNames(){
		return Object.keys( this.properties ).filter( name => this.properties[ name ].isColour )
	}
}

export class Style {
	constructor( kind, values ){
		this.kind = kind
		this.values = Object.freeze( values )
	}

	get( name ){
		return this.values[ name ]
	}

	/* A new style with these changes made; a change to null takes the value away. */
	with( changes ){
		const merged = { ...this.values }
		for( const [ name, value ] of Object.entries( changes ) ){
			if( value === null ) delete merged[ name ]
			else merged[ name ] = value
		}
		return this.kind.style( merged )
	}

	/* This style's values, with the lower style's showing through where this one has none. */
	over( lower ){
		return this.kind.style( { ...lower.values, ...this.values } )
	}

	/* The same style without its colours, so a theme's colours show through. */
	colourless(){
		const removals = Object.fromEntries( this.kind.colourNames.map( name => [ name, null ] ) )
		return this.with( removals )
	}

	get isEmpty(){
		return Object.keys( this.values ).length === 0
	}

	toJSON(){
		return { ...this.values }
	}
}

/* Every colour in a file or typed by hand passes here, so no other text can
	reach an attribute of the drawn SVG. */
export function hexColour( value ){
	if( typeof value !== "string" ) return undefined
	const digits = value.trim().replace( /^#/, "" ).toLowerCase()
	if( /^[0-9a-f]{3}$/.test( digits ) ) return "#" + digits.split( "" ).map( digit => digit + digit ).join( "" )
	if( /^[0-9a-f]{6}$/.test( digits ) ) return "#" + digits
	return undefined
}

export const NODE_SHAPES = [ "box", "round", "pill", "none" ]
export const FONTS = [ "mono", "sans", "serif" ]
export const BRANCH_SHAPES = [ "curve", "elbow", "straight" ]
export const LINE_SHAPES = [ "curve", "straight" ]
export const DASHES = [ "solid", "dashed" ]

export const NODE = new StyleKind( {
	/* Oval and underline were offered until 0.2.0, which took them away at the master's word. */
	shape: new Choice( NODE_SHAPES, { retired: { oval: "pill", underline: "pill" } } ),
	fill: new Colour( { mayBeNone: true } ),
	border: new Colour(),
	borderWidth: new Measure( 0, 8 ),
	font: new Choice( FONTS ),
	fontSize: new Measure( 8, 72 ),
	textColour: new Colour(),
} )

export const BRANCH = new StyleKind( {
	shape: new Choice( BRANCH_SHAPES ),
	colour: new Colour(),
	width: new Measure( 0.5, 12 ),
	dash: new Choice( DASHES ),
} )

export const LINE = new StyleKind( {
	shape: new Choice( LINE_SHAPES ),
	colour: new Colour(),
	width: new Measure( 0.5, 12 ),
	dash: new Choice( DASHES ),
} )
