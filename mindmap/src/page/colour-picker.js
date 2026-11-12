import { chromaEdge, clamp01, hexToLch, hexToRgb, lchToHex, oklabToRgb, oklchToOklab, rgbToHex } from "../drawing/colour.js"

/* The colour picker, the house's, ported from Alluvial: a hue strip over a
	chroma × lightness field. Across the field is chroma, up it is lightness;
	the right edge is the gamut edge for that lightness, so every point is a
	colour the map can carry.

	It edits one target at a time, and a target is only `get` and `set`: the
	picker knows nothing of what it feeds. A drag sets once a frame, not once
	a move, since every set redraws the map. */
export class ColourPicker {
	constructor( document ){
		this.document = document
		this.box = document.getElementById( "picker" )
		this.hexField = document.getElementById( "picker-hex" )
		this.state = { open: false, target: null, lightness: 0.8, chroma: 0.5, hue: 80 }
		this.dragging = null
		this.pending = false
		this.wire()
	}

	element( id ){
		return this.document.getElementById( id )
	}

	/* Opens on a target beside its chip; the same chip again closes it. */
	toggle( target, anchor ){
		if( this.state.open && this.state.target.id === target.id ) this.close()
		else this.open( target, anchor )
	}

	open( target, anchor ){
		Object.assign( this.state, { open: true, target } )
		this.settle( hexToRgb( target.get() ) ? target.get() : "#c8102e" )
		this.box.classList.remove( "hidden" )
		/* Beside the panel when there is room to its left, else under the chip, held inside the window either way. */
		const rail = this.element( "toolbar" ).getBoundingClientRect(), size = this.box.getBoundingClientRect(), at = anchor.getBoundingClientRect()
		const roomLeft = rail.left - size.width - 10
		const view = this.document.defaultView
		if( roomLeft >= 10 ){
			this.box.style.left = roomLeft + "px"
			this.box.style.top = Math.max( 10, Math.min( at.top, view.innerHeight - size.height - 10 ) ) + "px"
		} else {
			this.box.style.left = Math.max( 10, Math.min( at.left, view.innerWidth - size.width - 10 ) ) + "px"
			this.box.style.top = Math.max( 10, Math.min( at.bottom + 8, view.innerHeight - size.height - 10 ) ) + "px"
		}
		this.paintHue()
		this.paintField()
		this.hexField.value = target.get()
		this.marks()
	}

	close(){
		Object.assign( this.state, { open: false, target: null } )
		this.box.classList.add( "hidden" )
	}

	get hex(){
		const { lightness, chroma, hue } = this.state
		return lchToHex( [ lightness, chroma * chromaEdge( lightness, hue ), hue ] )
	}

	settle( hex ){
		const lch = hexToLch( hex )
		this.state.lightness = clamp01( lch[ 0 ] )
		this.state.hue = lch[ 2 ]
		this.state.chroma = Math.min( 1, lch[ 1 ] / Math.max( 1e-4, chromaEdge( this.state.lightness, this.state.hue ) ) )
	}

	setSoon(){
		if( this.pending ) return
		this.pending = true
		this.document.defaultView.requestAnimationFrame( () => {
			this.pending = false
			if( !this.state.open ) return
			const hex = this.hex
			this.hexField.value = hex
			this.state.target.set( hex )
		} )
	}

	marks(){
		const fieldWrap = this.element( "field-wrap" ), hueWrap = this.element( "hue-wrap" )
		this.element( "dot" ).style.left = this.state.chroma * fieldWrap.clientWidth + "px"
		this.element( "dot" ).style.top = ( 1 - this.state.lightness ) * fieldWrap.clientHeight + "px"
		this.element( "hue-dot" ).style.left = this.state.hue / 360 * hueWrap.clientWidth + "px"
	}

	paintField(){
		const canvas = this.element( "field" ), context = canvas.getContext( "2d" )
		if( !context ) return
		const width = canvas.width, height = canvas.height, image = context.createImageData( width, height )
		for( let y = 0; y < height; y++ ){
			const lightness = 1 - ( y + 0.5 ) / height, edge = chromaEdge( lightness, this.state.hue )
			for( let x = 0; x < width; x++ ){
				paint( image.data, ( y * width + x ) * 4, oklabToRgb( oklchToOklab( [ lightness, ( x + 0.5 ) / width * edge, this.state.hue ] ) ) )
			}
		}
		context.putImageData( image, 0, 0 )
	}

	paintHue(){
		const canvas = this.element( "hue" ), context = canvas.getContext( "2d" )
		if( !context ) return
		const width = canvas.width, height = canvas.height, image = context.createImageData( width, height )
		for( let x = 0; x < width; x++ ){
			const hue = ( x + 0.5 ) / width * 360
			const rgb = oklabToRgb( oklchToOklab( [ 0.68, chromaEdge( 0.68, hue ) * 0.95, hue ] ) )
			for( let y = 0; y < height; y++ ) paint( image.data, ( y * width + x ) * 4, rgb )
		}
		context.putImageData( image, 0, 0 )
	}

	wire(){
		const field = this.element( "field" ), hue = this.element( "hue" )
		const readField = event => {
			const area = field.getBoundingClientRect()
			this.state.chroma = clamp01( ( event.clientX - area.left ) / area.width )
			this.state.lightness = clamp01( 1 - ( event.clientY - area.top ) / area.height )
			this.marks()
			this.setSoon()
		}
		const readHue = event => {
			const area = hue.getBoundingClientRect()
			this.state.hue = Math.min( 359.99, Math.max( 0, ( event.clientX - area.left ) / area.width * 360 ) )
			this.paintField()
			this.marks()
			this.setSoon()
		}
		field.addEventListener( "pointerdown", event => { this.dragging = readField; field.setPointerCapture( event.pointerId ); readField( event ); event.preventDefault() } )
		hue.addEventListener( "pointerdown", event => { this.dragging = readHue; hue.setPointerCapture( event.pointerId ); readHue( event ); event.preventDefault() } )
		const view = this.document.defaultView
		view.addEventListener( "pointermove", event => { if( this.dragging ) this.dragging( event ) } )
		view.addEventListener( "pointerup", () => { this.dragging = null } )
		/* A hex typed in the picker moves the marks and is set as it is typed. */
		this.hexField.addEventListener( "input", () => {
			let typed = this.hexField.value.trim()
			if( typed && typed[ 0 ] !== "#" ) typed = "#" + typed
			const rgb = hexToRgb( typed )
			if( !rgb ) return
			const hex = rgbToHex( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] )
			this.settle( hex )
			this.paintField()
			this.marks()
			this.state.target.set( hex )
		} )
		this.element( "picker-close" ).addEventListener( "click", () => this.close() )
		/* Anything pressed outside closes it; a chip is left to its own click, which decides open or close. */
		this.document.addEventListener( "pointerdown", event => {
			if( !this.state.open ) return
			if( this.box.contains( event.target ) || event.target.closest?.( ".chip" ) ) return
			this.close()
		}, true )
		/* Esc closes the picker and goes no further, so it does not also clear the selection. */
		view.addEventListener( "keydown", event => {
			if( event.key !== "Escape" || !this.state.open ) return
			event.stopPropagation()
			this.close()
		}, true )
	}
}

function paint( data, offset, rgb ){
	data[ offset ] = Math.round( clamp01( rgb[ 0 ] ) * 255 )
	data[ offset + 1 ] = Math.round( clamp01( rgb[ 1 ] ) * 255 )
	data[ offset + 2 ] = Math.round( clamp01( rgb[ 2 ] ) * 255 )
	data[ offset + 3 ] = 255
}
