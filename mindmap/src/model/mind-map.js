import { Topic } from "./topic.js"
import { AuxiliaryLine } from "./auxiliary-line.js"
import { NODE, BRANCH, LINE, hexColour } from "./style.js"

export const LAYOUTS = [ "right", "both", "down" ]
export const THEMES = [ "mono", "spectrum", "ocean", "earth", "dusk" ]
export const APPEARANCES = [ "light", "dark" ]
/* The forms a map's auxiliary lines take, all alike: routed round the nodes in straight runs, or arcs (drawing/line-forms.js). */
export const LINE_FORMS = [ "straight", "arc" ]

/* The fills given to whole levels of the map: a colour, or none, for every
	node at a depth, the central node's being depth nought. A value: every
	change is a new one. */
export class LevelFills {
	constructor( fills = {} ){
		this.fills = Object.freeze( fills )
	}

	/* Made from plain values: only depths, each with a fill a node would take. */
	static from( values ){
		const fills = {}
		for( const [ depth, value ] of Object.entries( values ?? {} ) ){
			const fill = NODE.accept( "fill", value )
			if( /^\d{1,3}$/.test( depth ) && fill !== undefined ) fills[ Number( depth ) ] = fill
		}
		return new LevelFills( fills )
	}

	fillAt( depth ){
		return this.fills[ depth ]
	}

	/* With this depth's fill given, or taken away by a null. */
	with( depth, fill ){
		const fills = { ...this.fills }
		if( fill === null ) delete fills[ depth ]
		else fills[ depth ] = fill
		return new LevelFills( fills )
	}

	toJSON(){
		return { ...this.fills }
	}
}

/* The map's own styles, one for each kind of thing drawn: the central node,
	every other node, every branch and every auxiliary line; with them the
	fills given to whole levels, and the canvas colour, which stands in for the
	theme's background. Each is what the map has been given — by hand, by Set
	as default, or by a file — and shows through wherever a node, branch or
	line has nothing of its own. */
export class MapStyle {
	constructor( { root = NODE.style(), node = NODE.style(), branch = BRANCH.style(), line = LINE.style(), levels = new LevelFills(), canvas = "" } = {} ){
		this.root = root
		this.node = node
		this.branch = branch
		this.line = line
		this.levels = levels
		/* A solid colour, #rrggbb, or empty for the theme's own background. */
		this.canvas = canvas
	}

	/* Made from a file's or the browser's plain values, each cleaned by its kind. */
	static from( values = {} ){
		return new MapStyle( {
			root: NODE.style( values?.root ),
			node: NODE.style( values?.node ),
			branch: BRANCH.style( values?.branch ),
			line: LINE.style( values?.line ),
			levels: LevelFills.from( values?.levels ),
			canvas: hexColour( values?.canvas ) ?? "",
		} )
	}

	forTopic( topic ){
		return topic.isRoot ? this.root : this.node
	}

	/* A new map style with this style for the topic's kind: the central node's, or every other node's. */
	withStyleFor( topic, style ){
		return this.withKind( topic.isRoot ? "root" : "node", style )
	}

	/* A new map style with one kind's style replaced. */
	withKind( kind, style ){
		return new MapStyle( { ...this, [ kind ]: style } )
	}

	/* A new map style with every node at this depth filled so, or, with a null, as before. */
	withLevelFill( depth, fill ){
		return new MapStyle( { ...this, levels: this.levels.with( depth, fill ) } )
	}

	/* A new map style on this canvas colour, or, with a null, on the theme's background. */
	withCanvas( colour ){
		return new MapStyle( { ...this, canvas: colour ?? "" } )
	}

	/* The same styles without their colours — level fills and canvas too — so a newly chosen theme shows. */
	colourless(){
		return new MapStyle( {
			root: this.root.colourless(),
			node: this.node.colourless(),
			branch: this.branch.colourless(),
			line: this.line.colourless(),
		} )
	}

	toJSON(){
		return { root: this.root.toJSON(), node: this.node.toJSON(), branch: this.branch.toJSON(), line: this.line.toJSON(), levels: this.levels.toJSON(), canvas: this.canvas }
	}
}

/* A mind map: the tree of topics under its central node, the auxiliary lines
	between them and the form they take, and the map's layout, theme,
	appearance and styles.

	Pre-flight answers. The map owns the identities of its topics and lines and
	hands out new ones, so two never share one. It owns removal too: a topic
	that goes takes its lines with it, which no caller could be trusted to
	remember. Layout, theme, appearance and line form refuse a name the map does not know,
	so a map is never in a state no code can draw. Two topics are joined by one
	line at most, either way, at the master's word (2026-11-12): the map makes
	no second, and of several handed to it, as an older file may hold, it
	keeps the first. A line joins two topics, never one to itself: the editor
	never made one, and an arc cannot be drawn from a tail to that same tail
	(found in review, 2026-11-12: one in a hand-edited file stopped the page
	drawing), so the map makes none and keeps none handed to it. */
export class MindMap {
	constructor( { root, layout = "right", theme = "mono", appearance = "dark", lineForm = "straight", style = new MapStyle(), lines = [] } ){
		this.root = root
		this.chosenLayout = "right"
		this.chosenTheme = "mono"
		this.chosenAppearance = "dark"
		this.chosenLineForm = "straight"
		this.layout = layout
		this.theme = theme
		this.appearance = appearance
		this.lineForm = lineForm
		this.style = style
		this.lines = lines.filter( ( line, index ) => line.from !== line.to && lines.findIndex( other => other.joins( line.from, line.to ) ) === index )
		this.counters = { topic: highest( this.topics.map( topic => topic.id ), "n" ), line: highest( lines.map( line => line.id ), "l" ) }
	}

	/* A new map: one central node, and the styles a user saved as their default. */
	static fresh( { text, style = {}, theme = "mono", appearance = "dark" } ){
		return new MindMap( { root: new Topic( { id: "n1", text } ), style: MapStyle.from( style ), theme, appearance } )
	}

	get topics(){
		return [ ...this.root.walk() ]
	}

	find( id ){
		return this.topics.find( topic => topic.id === id ) ?? null
	}

	/* A topic with an identity no other in this map has; it is not yet in the tree. */
	newTopic( fields = {} ){
		this.counters.topic += 1
		return new Topic( { ...fields, id: "n" + this.counters.topic } )
	}

	/* The central node stays: a map without one is not a map. */
	remove( topic ){
		if( topic.isRoot ) return
		const leaving = [ ...topic.walk() ]
		topic.parent.release( topic )
		this.lines = this.lines.filter( line => !leaving.some( gone => line.touches( gone ) ) )
	}

	/* A new line between two topics, or, where a line already joins them either way, that line, and none is made; none from a topic to itself. */
	newLine( fields ){
		if( fields.from === fields.to ) return null
		const joining = this.lineBetween( fields.from, fields.to )
		if( joining ) return joining
		this.counters.line += 1
		const line = new AuxiliaryLine( { ...fields, id: "l" + this.counters.line } )
		this.lines.push( line )
		return line
	}

	findLine( id ){
		return this.lines.find( line => line.id === id ) ?? null
	}

	/* The line joining the topics of these two identities, either way, or null. */
	lineBetween( one, other ){
		return this.lines.find( line => line.joins( one, other ) ) ?? null
	}

	removeLine( line ){
		this.lines = this.lines.filter( each => each !== line )
	}

	/* The first line of the central node's text, which names the map's files. */
	get title(){
		return this.root.text.split( "\n" )[ 0 ].trim()
	}

	get layout(){ return this.chosenLayout }
	set layout( name ){ if( LAYOUTS.includes( name ) ) this.chosenLayout = name }

	get theme(){ return this.chosenTheme }
	set theme( name ){ if( THEMES.includes( name ) ) this.chosenTheme = name }

	get appearance(){ return this.chosenAppearance }
	set appearance( name ){ if( APPEARANCES.includes( name ) ) this.chosenAppearance = name }

	get lineForm(){ return this.chosenLineForm }
	set lineForm( name ){ if( LINE_FORMS.includes( name ) ) this.chosenLineForm = name }

	toJSON(){
		return {
			layout: this.layout,
			theme: this.theme,
			appearance: this.appearance,
			lineForm: this.lineForm,
			style: this.style.toJSON(),
			root: this.root.toJSON(),
			auxiliaryLines: this.lines.map( line => line.toJSON() ),
		}
	}
}

/* The largest number among identities of the form prefix-and-digits, so new
	ones carry on past every one already in use. */
function highest( ids, prefix ){
	const numbers = ids.map( id => new RegExp( "^" + prefix + "(\\d+)$" ).exec( id ) ).filter( Boolean ).map( match => Number( match[ 1 ] ) )
	return Math.max( 0, ...numbers )
}
