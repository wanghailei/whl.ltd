import { MapFile, MapFileError } from "./map-file.js"
import { Outline } from "./outline.js"

/* Opens whatever file the user hands over as a map: the map's own file, or
	a Markdown outline. The name says which when it can — .md and .markdown
	are outlines, .json the map's file; otherwise the file is tried as a map,
	then as an outline. What is neither fails as not a map. An outline's map
	is begun by `newMap`, the page's own way of beginning a new map. */
export class MapReader {
	constructor( { mapFile = new MapFile(), outline = new Outline() } = {} ){
		this.mapFile = mapFile
		this.outline = outline
	}

	read( name, text, newMap ){
		if( /\.(md|markdown)$/i.test( name ) ) return this.outline.read( text, newMap )
		if( /\.json$/i.test( name ) ) return this.mapFile.read( text )
		try {
			return this.mapFile.read( text )
		} catch( error ){
			if( error.reason !== "not-a-map" ) throw error
		}
		try {
			return this.outline.read( text, newMap )
		} catch {
			throw new MapFileError( "not-a-map" )
		}
	}
}
