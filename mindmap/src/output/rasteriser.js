/* Pixels per map pixel in a PNG or a PDF: twice the screen's, so words stay crisp on a sharp display or in print. */
const SHARPNESS = 2
/* The most a canvas is asked to hold. Past this long a side a browser
	fails to draw without a word, and a PDF holds the pixels three times
	over while it is made — 40 million pixels is some 400 MB at the peak —
	so a large map is drawn finer rather than not at all. */
const LARGEST_AREA = 4e7
const LARGEST_SIDE = 16384

/* Draws a map's picture onto a canvas, through the same SVG the SVG export
	writes, so PNG, PDF, SVG and the screen all show one drawing.

	An SVG drawn as an image cannot reach the page's own fonts, only the
	system's, so the house face is handed to it inside the drawing — for this
	drawing only, never in a file the user keeps: the face is licensed per
	seat. Where the face is not beside the page, the drawing falls back as the
	page does. */
export class Rasteriser {
	constructor( { document, faceAddress = "berkeley.woff2" } ){
		this.document = document
		this.faceAddress = faceAddress
		this.face = null
	}

	/* The canvas, and the scale it was drawn at: canvas pixels to a map pixel.
		 The drawing is handed over by a Blob address, which has none of a data
		 address's limits on size. After the picture decodes, two frames pass
		 before it is drawn: a browser may finish loading the face inside an
		 SVG picture after the picture says it is ready (not seen in Chromium;
		 Firefox and Safari are not tested). */
	async draw( picture ){
		const frame = picture.frame
		const scale = Math.min( SHARPNESS, LARGEST_SIDE / frame.width, LARGEST_SIDE / frame.height, Math.sqrt( LARGEST_AREA / ( frame.width * frame.height ) ) )
		const view = this.document.defaultView
		const address = URL.createObjectURL( new Blob( [ picture.document( { fontFace: await this.fontFace() } ) ], { type: "image/svg+xml" } ) )
		try {
			const image = this.document.createElement( "img" )
			image.src = address
			await image.decode()
			await new Promise( resolve => view.requestAnimationFrame( () => view.requestAnimationFrame( resolve ) ) )
			const canvas = this.document.createElement( "canvas" )
			canvas.width = Math.round( frame.width * scale )
			canvas.height = Math.round( frame.height * scale )
			canvas.getContext( "2d" ).drawImage( image, 0, 0, canvas.width, canvas.height )
			return { canvas, scale }
		} finally {
			URL.revokeObjectURL( address )
		}
	}

	/* The house face as an @font-face rule carrying the face itself; nothing when it is not there. */
	fontFace(){
		this.face ??= this.readFace()
		return this.face
	}

	async readFace(){
		try {
			const response = await fetch( this.faceAddress )
			if( !response.ok ) return ""
			const address = await asDataAddress( await response.blob() )
			return "@font-face{font-family:\"Berkeley Mono\";src:url(" + address + ") format(\"woff2\")}"
		} catch {
			return ""
		}
	}
}

function asDataAddress( blob ){
	return new Promise( ( resolve, reject ) => {
		const reader = new FileReader()
		reader.onload = () => resolve( reader.result )
		reader.onerror = () => reject( reader.error )
		reader.readAsDataURL( new Blob( [ blob ], { type: "font/woff2" } ) )
	} )
}
