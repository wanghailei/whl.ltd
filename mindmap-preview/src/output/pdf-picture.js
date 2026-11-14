/* Points in a CSS pixel: a PDF page is measured in points, 72 to the inch, the screen in pixels, 96 to it. */
const POINTS_PER_PIXEL = 0.75
/* The longest side a PDF page may have and still open everywhere: Acrobat refuses more than 200 inches. */
const LONGEST_PAGE = 14400

/* A PDF of one page holding one picture: the map, as pixels.

	Written by hand rather than with a library, since the page needs only
	this much of PDF: a catalogue, one page of the map's own size, one image
	filling it, and a title. The image is the map's pixels, compressed
	losslessly with the deflate the browser already has, so the words stay
	crisp at any print size the pixels allow. Drawing the map as PDF paths and
	text instead would need every font the map uses embedded in the file —
	the house face is licensed per seat, and Chinese faces run to megabytes —
	so a picture is the one PDF that looks exactly like the screen. */
export class PdfPicture {
	/* `pixels` are red, green and blue bytes, row by row from the top; `page` is in points. */
	constructor( { width, height, pixels, page, title = "", compress = deflate } ){
		this.width = width
		this.height = height
		this.pixels = pixels
		this.page = page
		this.title = title
		this.compress = compress
	}

	/* From a canvas's red, green, blue and alpha bytes, drawn at `scale`
		 canvas pixels to a map pixel. The map's background is opaque, so its
		 alpha is dropped. The page is the map's own size in points, shrunk,
		 keeping its proportions, where it would pass the longest page a PDF
		 reader opens. */
	static fromCanvas( { width, height, data, scale, title } ){
		const pixels = new Uint8Array( width * height * 3 )
		for( let from = 0, to = 0; from < data.length; from += 4, to += 3 ){
			pixels[ to ] = data[ from ]
			pixels[ to + 1 ] = data[ from + 1 ]
			pixels[ to + 2 ] = data[ from + 2 ]
		}
		const across = width / scale * POINTS_PER_PIXEL, down = height / scale * POINTS_PER_PIXEL
		const shrink = Math.min( 1, LONGEST_PAGE / Math.max( across, down ) )
		return new PdfPicture( { width, height, pixels, page: { width: hundredths( across * shrink ), height: hundredths( down * shrink ) }, title } )
	}

	async bytes(){
		const image = await this.compress( this.pixels )
		const file = new PdfFile()
		file.add( "%PDF-1.4\n%âãÏÓ\n" )
		file.object( 1, "<< /Type /Catalog /Pages 2 0 R >>" )
		file.object( 2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" )
		file.object( 3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ this.page.width } ${ this.page.height }] /Resources << /XObject << /Map 4 0 R >> >> /Contents 5 0 R >>` )
		file.object( 4, `<< /Type /XObject /Subtype /Image /Width ${ this.width } /Height ${ this.height } /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${ image.length } >>\nstream\n`, image, "\nendstream" )
		/* The image, drawn over the whole page: one unit square scaled to the page. */
		const drawing = `q ${ this.page.width } 0 0 ${ this.page.height } 0 0 cm /Map Do Q`
		file.object( 5, `<< /Length ${ drawing.length } >>\nstream\n${ drawing }\nendstream` )
		file.object( 6, `<< /Title ${ textString( this.title ) } /Producer (WHL Mindmap) >>` )
		return file.close( { root: 1, info: 6 } )
	}
}

/* The bytes of a PDF as they are written, with where each object begins, for the cross-reference table. */
class PdfFile {
	constructor(){
		this.parts = []
		this.length = 0
		this.offsets = []
	}

	add( ...chunks ){
		for( const chunk of chunks ){
			const bytes = typeof chunk === "string" ? latin1( chunk ) : chunk
			this.parts.push( bytes )
			this.length += bytes.length
		}
	}

	/* Objects are numbered as the other objects refer to them, so they must be written in that order. */
	object( number, ...body ){
		if( number !== this.offsets.length + 1 ) throw new Error( `PDF object ${ number } written out of order, after ${ this.offsets.length }.` )
		this.offsets.push( this.length )
		this.add( `${ number } 0 obj\n`, ...body, "\nendobj\n" )
	}

	close( { root, info } ){
		const table = this.length
		const entries = this.offsets.map( offset => String( offset ).padStart( 10, "0" ) + " 00000 n \n" ).join( "" )
		this.add( `xref\n0 ${ this.offsets.length + 1 }\n0000000000 65535 f \n${ entries }` )
		this.add( `trailer\n<< /Size ${ this.offsets.length + 1 } /Root ${ root } 0 R /Info ${ info } 0 R >>\nstartxref\n${ table }\n%%EOF\n` )
		const bytes = new Uint8Array( this.length )
		let at = 0
		for( const part of this.parts ){
			bytes.set( part, at )
			at += part.length
		}
		return bytes
	}
}

/* Text of any language as a PDF text string: UTF-16, big end first, after its byte-order mark, in hex. */
function textString( text ){
	const hex = [ ...text ].flatMap( character => {
		const code = character.codePointAt( 0 )
		if( code < 0x10000 ) return [ code ]
		const high = code - 0x10000
		return [ 0xd800 + ( high >> 10 ), 0xdc00 + ( high & 0x3ff ) ]
	} ).map( unit => unit.toString( 16 ).toUpperCase().padStart( 4, "0" ) ).join( "" )
	return "<FEFF" + hex + ">"
}

function latin1( text ){
	return Uint8Array.from( text, character => character.charCodeAt( 0 ) )
}

function hundredths( value ){
	return Math.round( value * 100 ) / 100
}

/* Deflate, as PDF's FlateDecode reads it: the zlib form the browser's own compression stream writes. */
async function deflate( bytes ){
	const stream = new Blob( [ bytes ] ).stream().pipeThrough( new CompressionStream( "deflate" ) )
	return new Uint8Array( await new Response( stream ).arrayBuffer() )
}
