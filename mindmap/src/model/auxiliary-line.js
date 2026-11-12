import { LINE } from "./style.js"

/* An auxiliary line joins two topics outside the tree, from one to the other,
	with an optional label. It has no arrowheads, at the master's word
	(2026-11-12), for now. It holds the topics by identity, not by reference,
	so it survives the topics being rebuilt from a file or an undo, and a line
	to a topic that has gone can be found and dropped by the map. */
export class AuxiliaryLine {
	constructor( { id, from, to, label = "", style = LINE.style() } ){
		this.id = id
		this.from = from
		this.to = to
		this.label = label
		this.style = style
	}

	touches( topic ){
		return this.from === topic.id || this.to === topic.id
	}

	/* Whether this line joins the topics of these two identities, either way. */
	joins( one, other ){
		return ( this.from === one && this.to === other ) || ( this.from === other && this.to === one )
	}

	toJSON(){
		return { id: this.id, from: this.from, to: this.to, label: this.label, style: this.style.toJSON() }
	}
}
