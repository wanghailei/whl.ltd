import { MapFile } from "../file/map-file.js"
import { History } from "./history.js"
import { Selection } from "./selection.js"
import { NODE, BRANCH, LINE } from "../model/style.js"
import { Look } from "../drawing/look.js"

/* The editor: the map being edited, what is selected, and every change the
	user can make, each one undoable.

	Pre-flight answers. The editor owns the current map and the selection, and
	is the one place either changes; the page only asks it to and redraws when
	told. Every change to the map passes through `change`, which keeps the
	state before it for undo and tells the listeners — so no command can
	forget either. A change that alters nothing leaves nothing to undo. The
	rules of editing are the editor's too: that a node added and left empty is
	taken back, and that ADD joins two selected nodes or waits for a second.
	The map file and the history are injected, defaulted here, so a test can
	see exactly what was kept. */
export class Editor {
	constructor( { map, file = new MapFile(), history = new History() } ){
		this.map = map
		this.file = file
		this.history = history
		this.selection = Selection.of( map.root )
		this.listeners = []
		this.lastGesture = null
		this.lineFrom = null
		/* Branches copied, to paste: the page's own, kept while it is open, across maps opened in it. */
		this.clipboard = []
	}

	/* Hears every change: { mapChanged } says whether the map itself changed or only the selection. */
	listen( listener ){
		this.listeners.push( listener )
	}

	// ── What is selected ────────────────────────────────────────────

	get selectedTopics(){
		return this.selection.topicsIn( this.map )
	}

	get selectedLine(){
		return this.selection.lineIn( this.map )
	}

	/* The topic whose branch is selected, pressed on the canvas so its look
		 can be changed at once (the master's word, 2026-11-12). */
	get selectedBranch(){
		return this.selection.branchIn( this.map )
	}

	/* The topic a single-node command acts on: the first one selected. */
	get focus(){
		return this.selectedTopics[ 0 ] ?? null
	}

	select( topic ){
		this.reselect( Selection.of( topic ) )
	}

	/* Selects a topic, opening every fold above it first, so it is drawn:
		 where a search goes to it. The folds opened are a change of the map,
		 undone as any is; a topic already drawn changes nothing. */
	uncover( topic ){
		if( topic.isHidden ) this.change( () => this.unfoldTo( topic.parent ) )
		this.select( topic )
	}

	selectMany( topics ){
		this.reselect( Selection.ofMany( topics ) )
	}

	toggle( topic ){
		this.reselect( this.selection.toggled( topic ) )
	}

	selectAll(){
		this.selectMany( this.map.topics )
	}

	selectLine( line ){
		this.reselect( Selection.ofLine( line ) )
	}

	/* The central node has no branch to select. */
	selectBranch( topic ){
		if( !topic.isRoot ) this.reselect( Selection.ofBranch( topic ) )
	}

	clearSelection(){
		this.reselect( new Selection() )
	}

	// ── Nodes ───────────────────────────────────────────────────────

	/* A new empty child, last under the focus, selected for its words to be
		 written. A folded parent opens, or the child could not be seen. */
	addChild(){
		const parent = this.focus
		if( !parent ) return null
		return this.addUnder( parent, parent.children.length )
	}

	/* A new empty sibling straight after the focus; the central node has none, so it gets a child. */
	addSibling(){
		const focus = this.focus
		if( !focus ) return null
		if( focus.isRoot ) return this.addChild()
		return this.addUnder( focus.parent, focus.index + 1 )
	}

	/* A new empty node put between the focus and its parent, in the focus's
		 place, the focus under it with everything under that, selected for its
		 words to be written, at the master's word (2026-11-12, 23:07). The
		 central node has no parent to put one under. */
	addParent(){
		const focus = this.focus
		if( !focus || focus.isRoot ) return null
		return this.adding( parent => {
			focus.parent.adopt( parent, focus.index )
			parent.adopt( focus )
		} )
	}

	/* Moves the focus one place earlier among its siblings, by a step of −1,
		 or one later, by +1, with everything under it; at either end it stays. */
	reorder( step ){
		const focus = this.focus
		if( !focus || focus.isRoot ) return
		const place = focus.index + step
		if( place < 0 || place >= focus.parent.children.length ) return
		this.change( () => focus.parent.adopt( focus, place ) )
	}

	// ── Copy and paste ──────────────────────────────────────────────

	/* The selected nodes, each with everything under it, kept to paste, in
		 the map's order: copies, so changes to the map after do not reach them.
		 A node under another selected one goes with that one, once. */
	copy(){
		const selected = this.selectedTopics
		const tops = this.map.topics.filter( topic => selected.includes( topic ) && !selected.some( other => other !== topic && other.contains( topic ) ) )
		if( tops.length > 0 ) this.clipboard = tops.map( topic => this.map.copyOf( topic ) )
	}

	cut(){
		this.copy()
		this.deleteSelected()
	}

	/* Copies of what was copied, each with identities of its own, become the
		 last children of the focus, opened if folded, and are selected. */
	paste(){
		const parent = this.focus
		if( !parent || this.clipboard.length === 0 ) return
		const pasted = this.clipboard.map( topic => this.map.copyOf( topic ) )
		this.change( () => {
			this.unfoldTo( parent )
			for( const topic of pasted ) parent.adopt( topic )
		} )
		this.selectMany( pasted )
	}

	rename( topic, text ){
		this.change( () => { topic.text = text } )
	}

	/* The first words of a node just added. Written, they are one step with
		 the add, which undo takes back together; left empty, the node was never
		 wanted and goes — withdrawn without a trace when the add is still the
		 last change, or else taken away as a change of its own. Taken away so,
		 whatever stands under it stays, in its place: a parent added above a
		 node, then left empty after another change, took the node and its
		 branch with it (found in review, 2026-11-13). */
	finishWriting( topic, text ){
		if( text.trim() !== "" ){
			this.change( () => { topic.text = text }, Editor.writing( topic ) )
			return
		}
		const before = this.history.withdraw( Editor.writing( topic ) )
		if( before === null ){
			const left = this.map.find( topic.id )
			if( left && left.text === "" ) this.change( () => {
				const [ parent, place ] = [ left.parent, left.index ]
				for( const [ at, child ] of [ ...left.children ].entries() ) parent.adopt( child, place + 1 + at )
				this.map.remove( left )
			} )
			return
		}
		this.map = this.file.read( before )
		this.lastGesture = null
		this.selection = this.beforeAdding ?? Selection.of( this.map.root )
		if( this.selectedTopics.length === 0 ) this.selection = Selection.of( this.map.root )
		this.announce( { mapChanged: true } )
	}

	/* Deletes the selected line, or the selected nodes with everything under
		 them, and selects the nearest node left: the one before, the one after,
		 or the parent. */
	deleteSelected(){
		const line = this.selectedLine
		if( line ){
			this.change( () => this.map.removeLine( line ) )
			this.clearSelection()
			return
		}
		const leaving = this.selectedTopics.filter( topic => !topic.isRoot )
		if( leaving.length === 0 ) return
		const first = leaving[ 0 ]
		const siblings = first.parent.children.filter( sibling => !leaving.includes( sibling ) )
		const after = siblings.find( sibling => sibling.index > first.index )
		const before = siblings.filter( sibling => sibling.index < first.index ).pop()
		const nearest = before ?? after ?? first.parent
		this.change( () => leaving.forEach( topic => this.map.remove( topic ) ) )
		this.select( this.map.find( nearest.id ) ?? this.map.root )
	}

	/* Moves a node, with everything under it, under another: to a place
		 among its children, counted as they stand before the move, or else to
		 be its last child. Says whether the map changed: a node cannot go under
		 itself or anything under it, and one dropped where it already is
		 changes nothing. */
	move( topic, parent, place = parent.children.length ){
		if( topic.isRoot || topic.contains( parent ) ) return false
		/* Taken out from before the place, the node leaves one fewer before it. */
		const index = topic.parent === parent && topic.index < place ? place - 1 : place
		return this.change( () => parent.adopt( topic, index ) )
	}

	toggleFold(){
		const folding = this.selectedTopics.filter( topic => topic.children.length > 0 )
		if( folding.length === 0 ) return
		const fold = !folding[ 0 ].folded
		this.change( () => folding.forEach( topic => { topic.folded = fold } ) )
	}

	/* A node's remark, written on that node whatever is selected by the time
		 the writing is kept: the remark is the node's own content, not a style
		 for the selection. */
	writeRemark( topic, text ){
		this.change( () => { topic.remark = text } )
	}

	// ── Styles ──────────────────────────────────────────────────────

	/* A gesture names a run of changes — a slider dragged, a colour picked by
		 dragging — that undo takes back as one. A border colour given to a node
		 whose border is drawn 0 wide gives it a border 1 wide as well, so the
		 border shows at once, at the master's word (2026-11-12, 22:35): picking
		 a colour and seeing nothing was a bad experience. */
	styleNodes( changes, gesture = null ){
		const look = new Look( this.map )
		this.change( () => this.selectedTopics.forEach( topic => {
			const shown = changes.border && look.node( topic ).get( "borderWidth" ) === 0 ? { borderWidth: 1 } : {}
			topic.style = topic.style.with( { ...shown, ...changes } )
		} ), gesture )
	}

	/* Width belongs to the whole map; colour, shape and dash still belong to
		 the selected branch or the selected nodes' branches. Keep the map width
		 and removal of every legacy override in one undo step, visiting folded
		 descendants too. Reading files keeps those overrides so undo is exact. */
	styleBranches( { width, ...changes }, gesture = null ){
		const branched = this.selectedBranch ? [ this.selectedBranch ] : this.selectedTopics
		this.change( () => {
			if( width !== undefined ){
				this.map.style = this.map.style.withKind( "branch", this.map.style.branch.with( { width } ) )
				for( const topic of this.map.topics ) topic.branch = topic.branch.with( { width: null } )
			}
			for( const topic of branched ) topic.branch = topic.branch.with( changes )
		}, gesture )
	}

	/* The map stands on this solid colour; a null gives it back the theme's background. */
	paintCanvas( colour, gesture = null ){
		this.change( () => { this.map.style = this.map.style.withCanvas( colour ) }, gesture )
	}

	/* Takes away what the selected nodes have been given by hand, node and branch. */
	clearStyles(){
		this.change( () => this.selectedTopics.forEach( topic => {
			topic.style = NODE.style()
			topic.branch = BRANCH.style()
		} ) )
	}

	/* What the focus — or the selected line — has been given by hand becomes
		 the map's style for its kind, and it keeps nothing of its own, since
		 the map's style now says the same — save a node's fill, which it keeps:
		 its fill also fills its branch, the nodes under it, so taking it away
		 would change how this map looks. A legacy branch width stays local,
		 since it is not a choice for the map. The central node has no branch. */
	setAsDefault(){
		const line = this.selectedLine
		const topic = this.focus
		this.change( () => {
			if( line ){
				this.map.style = this.map.style.withKind( "line", line.style.over( this.map.style.line ) )
				line.style = LINE.style()
				return
			}
			if( !topic ) return
			this.map.style = this.map.style.withStyleFor( topic, topic.style.over( this.map.style.forTopic( topic ) ) )
			topic.style = NODE.style( { fill: topic.style.get( "fill" ) } )
			if( topic.isRoot ) return
			/* A legacy width is not a new map-wide choice: keep it on its own
				 branch, and promote only colour, shape and dash. */
			this.map.style = this.map.style.withKind( "branch", topic.branch.with( { width: null } ).over( this.map.style.branch ) )
			topic.branch = BRANCH.style( { width: topic.branch.get( "width" ) } )
		} )
	}

	// ── The map ─────────────────────────────────────────────────────

	changeLayout( name ){
		this.change( () => { this.map.layout = name } )
	}

	/* The form every auxiliary line of the map takes: straight or arc. */
	changeLineForm( name ){
		this.change( () => { this.map.lineForm = name } )
	}

	/* How the nodes take the theme's colours: by level, all one, or by main branch. */
	changeColourStyle( name ){
		this.change( () => { this.map.style = this.map.style.withColourStyle( name ) } )
	}

	/* A theme sets aside the colours of the map's own styles, so it shows;
		 what nodes and lines have been given by hand stays. */
	changeTheme( name ){
		this.change( () => {
			this.map.theme = name
			this.map.style = this.map.style.colourless()
		} )
	}

	/* LIGHT or DARK asks for the theme's own ground, so a canvas colour is set aside. */
	changeAppearance( name ){
		this.change( () => {
			this.map.appearance = name
			this.map.style = this.map.style.withCanvas( null )
		} )
	}

	/* Opening a file or starting a new map: undo brings the old map back. */
	replace( map ){
		this.history.record( this.file.write( this.map ) )
		this.map = map
		this.lastGesture = null
		this.lineFrom = null
		this.selection = Selection.of( map.root )
		this.announce( { mapChanged: true } )
	}

	// ── Auxiliary lines ─────────────────────────────────────────────

	/* ADD: two selected nodes are joined at once; one waits for the node to
		 join it to; with none, or more than two, nothing happens. */
	beginLine(){
		const topics = this.selectedTopics
		if( topics.length === 2 ) this.join( topics[ 0 ], topics[ 1 ] )
		this.lineFrom = topics.length === 1 ? topics[ 0 ].id : null
	}

	get isJoining(){
		return this.lineFrom !== null
	}

	finishLine( topic ){
		const from = this.map.find( this.lineFrom )
		this.lineFrom = null
		if( from ) this.join( from, topic )
	}

	cancelLine(){
		this.lineFrom = null
	}

	/* A line from one node to another, selected; none from a node to itself,
		 and none where a line already joins the two, which is selected instead
		 and leaves nothing to undo (model/mind-map.js). */
	join( from, to ){
		if( from === to ) return null
		let line = null
		this.change( () => { line = this.map.newLine( { from: from.id, to: to.id } ) } )
		this.selectLine( line )
		return line
	}

	labelLine( label ){
		this.changeLine( line => { line.label = label } )
	}

	styleLine( changes, gesture = null ){
		this.changeLine( line => { line.style = line.style.with( changes ) }, gesture )
	}

	// ── Undo ────────────────────────────────────────────────────────

	undo(){
		this.travel( this.history.undo( this.file.write( this.map ) ) )
	}

	redo(){
		this.travel( this.history.redo( this.file.write( this.map ) ) )
	}

	get canUndo(){
		return this.history.canUndo
	}

	get canRedo(){
		return this.history.canRedo
	}

	// ── Inside ──────────────────────────────────────────────────────

	/* The one way the map changes: the state before is kept for undo unless
		 nothing changed, or the change carries on the gesture of the one
		 before it; and everyone listening is told. Says whether the map
		 changed, for the one caller that must know — a drop that moved nothing. */
	change( mutation, gesture = null ){
		const before = this.file.write( this.map )
		mutation()
		if( this.file.write( this.map ) === before ) return false
		if( gesture === null || gesture !== this.lastGesture ) this.history.record( before, gesture )
		this.lastGesture = gesture
		this.announce( { mapChanged: true } )
		return true
	}

	changeLine( mutation, gesture = null ){
		const line = this.selectedLine
		if( line ) this.change( () => mutation( line ), gesture )
	}

	addUnder( parent, index ){
		return this.adding( child => {
			this.unfoldTo( parent )
			parent.adopt( child, index )
		} )
	}

	/* A new empty node, put in the tree by `place`. What was selected before
		 the add is kept, for an empty node to go back to. The new node is
		 selected without ending the gesture of its add, so its first words
		 join it. */
	adding( place ){
		this.beforeAdding = this.selection
		const topic = this.map.newTopic()
		this.change( () => place( topic ), Editor.writing( topic ) )
		this.selection = Selection.of( topic )
		this.announce( { mapChanged: false } )
		return topic
	}

	/* Opens every fold from a topic up, so it and its children are drawn. */
	unfoldTo( topic ){
		for( let opening = topic; opening; opening = opening.parent ) opening.folded = false
	}

	/* The gesture of adding a node and writing its first words. */
	static writing( topic ){
		return "write " + topic.id
	}

	/* Goes to a state from the history, keeping what is selected wherever it
		 still exists; a selected node, or the node a selected branch leads to,
		 that the state folds away gives its place to the fold that hides it, so
		 the selection is always something drawn (found in review, 2026-11-12:
		 a hidden branch stayed selected, its section still live). */
	travel( state ){
		if( state === null ) return
		this.map = this.file.read( state )
		this.lastGesture = null
		const topics = this.selectedTopics
		if( topics.some( topic => topic.isHidden ) ) this.selection = Selection.ofMany( [ ...new Set( topics.map( topic => topic.shownAncestor ) ) ] )
		const branch = this.selectedBranch
		if( branch?.isHidden ) this.selection = Selection.of( branch.shownAncestor )
		if( this.selectedTopics.length === 0 && !this.selectedLine && !this.selectedBranch ) this.selection = Selection.of( this.map.root )
		this.announce( { mapChanged: true } )
	}

	/* A new selection ends any gesture: a drag after it is a step of its own. */
	reselect( selection, { mapChanged = false } = {} ){
		this.selection = selection
		this.lastGesture = null
		this.announce( { mapChanged } )
	}

	announce( change ){
		for( const listener of this.listeners ) listener( change )
	}
}
