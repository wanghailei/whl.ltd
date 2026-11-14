import { MapStyle, APPEARANCES } from "../model/mind-map.js"
import { hexColour } from "../model/style.js"

const KEYS = { draft: "mindmap.draft", setAside: "mindmap.draft-set-aside", defaults: "mindmap.defaults", appearance: "mindmap.appearance", highlight: "mindmap.highlight" }

/* What the page keeps in the browser, and nothing else: the draft of the map
	being edited, the styles saved as the default for new maps, the
	appearance last chosen, and the colour the selection glows in.

	The browser may refuse — storage full, blocked, or a private window that
	has none — so every read and write is guarded, a refused write says so
	for the page to tell the user, and a refused read is simply nothing kept.
	The storage is injected, the browser's by default. */
export class BrowserStore {
	constructor( storage = browserStorage() ){
		this.storage = storage
	}

	draft(){
		return this.read( KEYS.draft )
	}

	/* Whether the browser kept it. */
	keepDraft( text ){
		return this.write( KEYS.draft, text )
	}

	/* A draft that would not open, kept under a key of its own — one per
		 draft set aside — so neither a new draft nor another set aside can
		 overwrite it. Answers with the key, or null when the browser refused. */
	setAside( text ){
		let key = KEYS.setAside + "-" + Date.now()
		while( this.read( key ) !== null ) key += "+"
		return this.write( key, text ) ? key : null
	}

	defaults(){
		const kept = this.read( KEYS.defaults )
		if( kept === null ) return null
		try {
			const values = JSON.parse( kept )
			return values?.colourScheme ? MapStyle.from( values ) : MapStyle.legacy( values )
		} catch {
			return null
		}
	}

	keepDefaults( mapStyle ){
		return this.write( KEYS.defaults, JSON.stringify( mapStyle ) )
	}

	appearance(){
		const kept = this.read( KEYS.appearance )
		return APPEARANCES.includes( kept ) ? kept : null
	}

	keepAppearance( name ){
		return this.write( KEYS.appearance, name )
	}

	/* The colour the selection glows in, if one was picked; a colour only. */
	highlight(){
		return hexColour( this.read( KEYS.highlight ) ) ?? null
	}

	/* Keeps a colour, or with null forgets it, giving back the house's own. */
	keepHighlight( colour ){
		if( colour !== null ) return this.write( KEYS.highlight, colour )
		try {
			this.storage?.removeItem( KEYS.highlight )
			return true
		} catch {
			return false
		}
	}

	read( key ){
		try {
			return this.storage ? this.storage.getItem( key ) : null
		} catch {
			return null
		}
	}

	write( key, value ){
		try {
			if( !this.storage ) return false
			this.storage.setItem( key, value )
			return true
		} catch {
			return false
		}
	}
}

/* Reaching localStorage itself can throw where the browser blocks site data. */
function browserStorage(){
	try {
		return globalThis.localStorage ?? null
	} catch {
		return null
	}
}
