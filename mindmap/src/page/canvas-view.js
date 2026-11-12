import { Point } from "../layout/geometry.js"

const LEAST_ZOOM = 0.1
const MOST_ZOOM = 4
/* What a press of minus or plus zooms by: a tenth of the map's own size. */
const ZOOM_STEP = 0.1

/* The map on the canvas: the picture drawn into the SVG, moved and scaled
	by one transform on its group, and the selection marked on it.

	Zoom and pan are the view's, never the map's: they are not saved, not
	undone, and not exported. Map units are pixels at 100%; the view turns
	them into the canvas's pixels and back. */
export class CanvasView {
	constructor( { stage, viewport } ){
		this.stage = stage
		this.viewport = viewport
		this.zoom = 1
		this.offset = new Point( stage.clientWidth / 2, stage.clientHeight / 2 )
		this.listeners = []
	}

	/* Hears every change of zoom or pan. */
	listen( listener ){
		this.listeners.push( listener )
	}

	/* Draws the picture and marks what the editor has selected. */
	show( picture, editor ){
		this.picture = picture
		this.viewport.innerHTML = picture.markup( { screen: true } )
		this.mark( editor )
		this.apply()
	}

	/* Marks the selection on the drawing as it stands; a change of selection
		 alone redraws nothing, so the elements under the pointer stay. */
	mark( editor ){
		this.viewport.querySelectorAll( ".selected" ).forEach( element => element.classList.remove( "selected" ) )
		for( const topic of editor.selectedTopics ) this.topicElement( topic.id )?.classList.add( "selected" )
		/* A line is drawn in parts — its press target under the nodes, the line itself, its label — and each is marked. */
		const line = editor.selectedLine
		if( line ) this.viewport.querySelectorAll( `[data-line="${ CSS.escape( line.id ) }"]` ).forEach( element => element.classList.add( "selected" ) )
		const branch = editor.selectedBranch
		if( branch ) this.viewport.querySelector( `[data-branch="${ CSS.escape( branch.id ) }"]` )?.classList.add( "selected" )
	}

	/* Marks the nodes a search found, by their identities, so they glow; none, none. */
	markFound( ids ){
		this.viewport.querySelectorAll( ".found" ).forEach( element => element.classList.remove( "found" ) )
		for( const id of ids ) this.topicElement( id )?.classList.add( "found" )
	}

	/* While a node is dragged over a gap among a parent's children, a short
		 line across the gap marks where it would go; with no gap, none. Only
		 the marker is drawn: nothing else moves until the node is let go. */
	markGap( gap ){
		this.viewport.querySelector( ".gap-marker" )?.remove()
		if( !gap ) return
		const marker = this.viewport.ownerDocument.createElementNS( "http://www.w3.org/2000/svg", "path" )
		marker.setAttribute( "class", "gap-marker" )
		marker.setAttribute( "d", `M ${ gap.from.x } ${ gap.from.y } L ${ gap.to.x } ${ gap.to.y }` )
		this.viewport.append( marker )
	}

	/* Identities come from files, so they are escaped before they stand in a selector. */
	topicElement( id ){
		return this.viewport.querySelector( `[data-topic="${ CSS.escape( id ) }"]` )
	}

	/* Where a point of the window falls on the map. */
	toMap( clientX, clientY ){
		const corner = this.stage.getBoundingClientRect()
		return new Point( ( clientX - corner.left - this.offset.x ) / this.zoom, ( clientY - corner.top - this.offset.y ) / this.zoom )
	}

	/* Where a point of the map falls on the stage, in the stage's own pixels. */
	toStage( point ){
		return new Point( this.offset.x + point.x * this.zoom, this.offset.y + point.y * this.zoom )
	}

	panBy( across, down ){
		this.offset = this.offset.plus( new Point( across, down ) )
		this.apply()
	}

	/* Scales the map, keeping the map point under this window point where it is. */
	zoomTo( zoom, clientX, clientY ){
		const corner = this.stage.getBoundingClientRect()
		const anchor = new Point( clientX ?? corner.left + this.stage.clientWidth / 2, clientY ?? corner.top + this.stage.clientHeight / 2 )
		const held = this.toMap( anchor.x, anchor.y )
		this.zoom = Math.min( MOST_ZOOM, Math.max( LEAST_ZOOM, zoom ) )
		this.offset = new Point( anchor.x - corner.left - held.x * this.zoom, anchor.y - corner.top - held.y * this.zoom )
		this.apply()
	}

	/* Zooms round the canvas's middle by whole steps of a tenth: 100% to 110%
		 to 120%, rounded to the hundredth so the steps do not drift. */
	zoomStep( steps ){
		this.zoomTo( Math.round( ( this.zoom + steps * ZOOM_STEP ) * 100 ) / 100 )
	}

	zoomBy( factor, clientX, clientY ){
		this.zoomTo( this.zoom * factor, clientX, clientY )
	}

	/* The whole map's middle in the middle of the canvas, at the zoom it has:
		 never shrunk to fit, at the master's word (2026-11-12), so words keep
		 their size and a map larger than the canvas runs past its edges, to be
		 panned to. */
	centre(){
		const middle = this.picture.arrangement.bounds.centre
		this.offset = new Point( this.stage.clientWidth / 2 - middle.x * this.zoom, this.stage.clientHeight / 2 - middle.y * this.zoom )
		this.apply()
	}

	/* Keeps a node in sight: when it has gone past an edge, the map is moved
		 just enough to bring it back. `below` is how much of the canvas's foot
		 something else covers, which the node is kept clear of too. */
	reveal( topic, { below = 0 } = {} ){
		const box = this.picture?.arrangement.boxOf( topic )
		if( !box ) return
		const topLeft = this.toStage( new Point( box.left, box.top ) ), bottomRight = this.toStage( new Point( box.right, box.bottom ) )
		const margin = 24
		const across = Math.max( 0, margin - topLeft.x ) - Math.max( 0, bottomRight.x - ( this.stage.clientWidth - margin ) )
		const down = Math.max( 0, margin - topLeft.y ) - Math.max( 0, bottomRight.y - ( this.stage.clientHeight - margin - below ) )
		if( across !== 0 || down !== 0 ) this.panBy( across, down )
	}

	apply(){
		this.viewport.setAttribute( "transform", `translate(${ this.offset.x } ${ this.offset.y }) scale(${ this.zoom })` )
		for( const listener of this.listeners ) listener()
	}
}
