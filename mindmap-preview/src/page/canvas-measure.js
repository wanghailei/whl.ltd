/* Measures words as the browser will draw them: with a canvas, in the same
	font stack the drawing names, so a node is exactly as wide as its words.
	Widths are kept, since a redraw measures every node again; `forget` drops
	them once a font has arrived and the widths have changed. */
export class CanvasMeasure {
	constructor( document ){
		this.context = document.createElement( "canvas" ).getContext( "2d" )
		this.known = new Map()
	}

	width( text, { family, size } ){
		const key = size + "|" + family + "|" + text
		if( !this.known.has( key ) ){
			this.context.font = size + "px " + family
			this.known.set( key, this.context.measureText( text ).width )
		}
		return this.known.get( key )
	}

	forget(){
		this.known.clear()
	}
}
