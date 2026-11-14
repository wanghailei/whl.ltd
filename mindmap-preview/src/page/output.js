import { Rasteriser } from "../output/rasteriser.js"
import { PdfPicture } from "../output/pdf-picture.js"
import { Outline } from "../file/outline.js"
import { fileName } from "../file/file-name.js"

/* The map leaving the page as PNG, SVG, PDF or a Markdown outline, each
	named for the map and handed to the browser to save. Everything is made
	here, in the browser; nothing is sent anywhere. */
export class Output {
	constructor( { document, door, rasteriser = new Rasteriser( { document } ), outline = new Outline() } ){
		this.door = door
		this.rasteriser = rasteriser
		this.outline = outline
	}

	svg( picture ){
		this.door.download( new Blob( [ picture.document() ], { type: "image/svg+xml" } ), fileName( picture.map.title, ".svg" ) )
	}

	async png( picture ){
		const { canvas } = await this.rasteriser.draw( picture )
		const blob = await new Promise( resolve => canvas.toBlob( resolve, "image/png" ) )
		if( !blob ) throw new Error( "The canvas made no PNG." )
		this.door.download( blob, fileName( picture.map.title, ".png" ) )
	}

	/* The PDF holds the PNG's pixels on a page of the map's own size. */
	async pdf( picture ){
		const { canvas, scale } = await this.rasteriser.draw( picture )
		const { data } = canvas.getContext( "2d" ).getImageData( 0, 0, canvas.width, canvas.height )
		const pdf = PdfPicture.fromCanvas( { width: canvas.width, height: canvas.height, data, scale, title: picture.map.title } )
		this.door.download( new Blob( [ await pdf.bytes() ], { type: "application/pdf" } ), fileName( picture.map.title, ".pdf" ) )
	}

	markdown( map ){
		this.door.download( new Blob( [ this.outline.write( map ) ], { type: "text/markdown" } ), this.outline.nameFor( map ) )
	}
}
