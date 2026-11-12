import { Box } from "../layout/geometry.js"

/* A press must travel this far, in window pixels, before it is a drag rather than a click. */
const DRAG_THRESHOLD = 4

/* The pointer on the canvas: what a click, a double-click, a drag and the
	wheel do, turned into the page's named actions.

	A press on a node selects it and may become a drag that moves the node
	onto another; a press on the empty canvas pans, or with Shift draws the
	selecting rectangle, and a click there without moving clears the
	selection. A press on a fold dot or badge folds, on an auxiliary line
	selects the line. Each kind of press is a
	gesture of its own, which knows how it moves and how it ends. */
export class Pointer {
	constructor( { stage, view, marquee, actions } ){
		this.stage = stage
		this.view = view
		this.marquee = marquee
		this.actions = actions
		this.gesture = null
		stage.addEventListener( "pointerdown", event => this.press( event ) )
		stage.addEventListener( "pointermove", event => this.gesture?.follow( event ) )
		stage.addEventListener( "pointerup", event => this.release( event ) )
		stage.addEventListener( "pointercancel", () => this.abandon() )
		/* The browser's own double-click comes after both clicks are done, so a
			 field opened by it is not closed again by the second click; and since
			 a click that only selects redraws nothing, both clicks land on the
			 same element. */
		stage.addEventListener( "dblclick", event => this.doubleClick( event ) )
		stage.addEventListener( "wheel", event => this.wheel( event ), { passive: false } )
	}

	press( event ){
		if( event.button !== 0 || event.target.closest( "#text-editor" ) ) return
		/* What is being typed in a field lands where it was typed before this press changes anything. */
		this.actions.settle()
		const target = event.target
		const topic = target.closest( "[data-topic]" )
		if( target.closest( ".fold-dot, .fold-badge" ) && topic ){
			this.actions.fold( topic.dataset.topic )
			return
		}
		if( topic ){
			this.pressTopic( event, topic.dataset.topic )
			return
		}
		const line = target.closest( "[data-line]" )
		if( line ){
			this.actions.selectLine( line.dataset.line )
			return
		}
		this.gesture = event.shiftKey ? new MarqueeGesture( this, event ) : new PanGesture( this, event )
	}

	pressTopic( event, id ){
		if( this.actions.isJoining() ){
			this.actions.join( id )
			return
		}
		this.actions.press( id, event.shiftKey || event.metaKey || event.ctrlKey )
		this.gesture = new DragGesture( this, event, id )
	}

	release( event ){
		const gesture = this.gesture
		this.gesture = null
		gesture?.end( event )
	}

	abandon(){
		this.gesture?.abandon()
		this.gesture = null
	}

	doubleClick( event ){
		if( event.target.closest( ".fold-dot, .fold-badge" ) ) return
		const topic = event.target.closest( "[data-topic]" )
		if( topic ){
			this.actions.editTopic( topic.dataset.topic )
			return
		}
		const line = event.target.closest( "[data-line]" )
		if( line ) this.actions.editLabel( line.dataset.line )
	}

	/* Scrolling pans; a pinch, or scrolling with Cmd or Ctrl held, zooms round the pointer. */
	wheel( event ){
		event.preventDefault()
		if( event.ctrlKey || event.metaKey ) this.view.zoomBy( Math.exp( -event.deltaY * 0.01 ), event.clientX, event.clientY )
		else this.view.panBy( -event.deltaX, -event.deltaY )
	}
}

/* A press that has not yet travelled far enough is still a click. */
class Gesture {
	constructor( pointer, event ){
		this.pointer = pointer
		this.start = { x: event.clientX, y: event.clientY }
		this.last = { ...this.start }
		this.moved = false
	}

	follow( event ){
		if( !this.moved && Math.hypot( event.clientX - this.start.x, event.clientY - this.start.y ) < DRAG_THRESHOLD ) return
		if( !this.moved ) this.pointer.stage.setPointerCapture( event.pointerId )
		this.moved = true
		this.move( event )
		this.last = { x: event.clientX, y: event.clientY }
	}

	move(){}
	end(){}
	abandon(){}
}

/* The empty canvas dragged: the map follows. A click without a drag clears the selection. */
class PanGesture extends Gesture {
	move( event ){
		this.pointer.stage.classList.add( "panning" )
		this.pointer.view.panBy( event.clientX - this.last.x, event.clientY - this.last.y )
	}

	end(){
		this.pointer.stage.classList.remove( "panning" )
		if( !this.moved ) this.pointer.actions.clearSelection()
	}
}

/* Shift and the empty canvas dragged: every node the rectangle touches is selected. */
class MarqueeGesture extends Gesture {
	move( event ){
		const { stage, marquee } = this.pointer
		const corner = stage.getBoundingClientRect()
		const left = Math.min( this.start.x, event.clientX ) - corner.left, top = Math.min( this.start.y, event.clientY ) - corner.top
		Object.assign( marquee.style, { left: left + "px", top: top + "px", width: Math.abs( event.clientX - this.start.x ) + "px", height: Math.abs( event.clientY - this.start.y ) + "px" } )
		marquee.classList.remove( "hidden" )
	}

	end( event ){
		this.abandon()
		if( !this.moved ) return
		const view = this.pointer.view
		const from = view.toMap( this.start.x, this.start.y ), to = view.toMap( event.clientX, event.clientY )
		this.pointer.actions.selectArea( new Box( Math.min( from.x, to.x ), Math.min( from.y, to.y ), Math.abs( to.x - from.x ), Math.abs( to.y - from.y ) ) )
	}

	abandon(){
		this.pointer.marquee.classList.add( "hidden" )
	}
}

/* A node dragged: it follows the pointer, and the node under the pointer is
	marked while it would take the drop. Let go over it, the node moves there;
	anywhere else, it goes back. */
class DragGesture extends Gesture {
	constructor( pointer, event, id ){
		super( pointer, event )
		this.id = id
		this.target = null
	}

	move( event ){
		const { view, actions, stage } = this.pointer
		const element = view.topicElement( this.id )
		if( !element ) return
		element.classList.add( "dragging" )
		element.setAttribute( "transform", `translate(${ ( event.clientX - this.start.x ) / view.zoom } ${ ( event.clientY - this.start.y ) / view.zoom })` )
		const under = stage.ownerDocument.elementFromPoint( event.clientX, event.clientY )?.closest( "[data-topic]" )
		this.target = under && actions.accepts( this.id, under.dataset.topic ) ? under.dataset.topic : null
		view.viewport.querySelectorAll( ".drop-target" ).forEach( each => each.classList.remove( "drop-target" ) )
		if( this.target ) view.topicElement( this.target )?.classList.add( "drop-target" )
	}

	end(){
		if( !this.moved ) return
		if( this.target ) this.pointer.actions.move( this.id, this.target )
		else this.pointer.actions.redraw()
	}

	abandon(){
		if( this.moved ) this.pointer.actions.redraw()
	}
}
