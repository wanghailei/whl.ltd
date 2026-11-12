import { LINE } from "./style.js"

export const ARROWS = [ "none", "start", "end", "both" ]

/* An auxiliary line joins two topics outside the tree, from one to the other,
	with an optional label and an arrowhead at neither end, one or both. It
	holds the topics by identity, not by reference, so it survives the topics
	being rebuilt from a file or an undo, and a line to a topic that has gone
	can be found and dropped by the map. */
export class AuxiliaryLine {
	constructor( { id, from, to, label = "", arrows = "end", style = LINE.style() } ){
		this.id = id
		this.from = from
		this.to = to
		this.label = label
		this.arrows = arrows
		this.style = style
	}

	get arrows(){
		return this.ends
	}

	/* Anything but the four known ends is taken as the usual one, an arrow at the end. */
	set arrows( value ){
		this.ends = ARROWS.includes( value ) ? value : "end"
	}

	get hasArrowAtStart(){
		return this.arrows === "start" || this.arrows === "both"
	}

	get hasArrowAtEnd(){
		return this.arrows === "end" || this.arrows === "both"
	}

	touches( topic ){
		return this.from === topic.id || this.to === topic.id
	}

	toJSON(){
		return { id: this.id, from: this.from, to: this.to, label: this.label, arrows: this.arrows, style: this.style.toJSON() }
	}
}
