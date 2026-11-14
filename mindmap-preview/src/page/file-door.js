/* Files in and out of the page, all in the browser: a download for every
	file the page makes, the system's file chooser for OPEN, and a file
	dropped on the map. Nothing is uploaded anywhere. */
export class FileDoor {
	constructor( { document, input, stage } ){
		this.document = document
		this.input = input
		this.stage = stage
		this.chosen = null
		input.addEventListener( "change", () => {
			const file = input.files[ 0 ]
			input.value = ""
			if( file && this.chosen ) this.chosen( file )
		} )
	}

	/* Hands the browser a file to save, under this name. */
	download( blob, name ){
		const address = URL.createObjectURL( blob )
		const link = this.document.createElement( "a" )
		link.href = address
		link.download = name
		this.document.body.appendChild( link )
		link.click()
		link.remove()
		setTimeout( () => URL.revokeObjectURL( address ), 4000 )
	}

	/* Opens the system's file chooser; the file chosen goes to `then`. */
	choose( then ){
		this.chosen = then
		this.input.click()
	}

	/* A file dropped anywhere on the map goes to `then`. */
	acceptDrops( then ){
		this.stage.addEventListener( "dragover", event => {
			if( [ ...event.dataTransfer.types ].includes( "Files" ) ) event.preventDefault()
		} )
		this.stage.addEventListener( "drop", event => {
			const file = event.dataTransfer.files[ 0 ]
			if( !file ) return
			event.preventDefault()
			then( file )
		} )
	}
}
