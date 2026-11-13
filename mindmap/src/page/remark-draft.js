const GRAPHEMES = new Intl.Segmenter( undefined, { granularity: "grapheme" } )
const LIMIT = 50

function singleLine( text ){
	return text.replace( /\r\n|\r|\n/g, " " )
}

/* Owns the original and the accepted edit. A legacy remark is projected,
	not migrated: simply reading it must never rewrite the saved content.
	The draft knows its state, asks no other object's internals, and leaves
	confirmation and persistence to its direct collaborator, RemarkField. */
export class RemarkDraft {
	constructor( original ){
		this.original = original
		this.value = singleLine( original )
	}

	get isLegacy(){
		return this.original !== singleLine( this.original ) || [ ...GRAPHEMES.segment( this.original ) ].length > LIMIT
	}

	get changed(){
		return this.value !== singleLine( this.original )
	}

	/* Reject the entire edit, never silently chop a paste or a grapheme.
		Selection replacement is already reflected in the candidate string. */
	accept( text ){
		const candidate = singleLine( text )
		if( [ ...GRAPHEMES.segment( candidate ) ].length > LIMIT ) return false
		this.value = candidate
		return true
	}
}
