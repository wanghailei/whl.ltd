/* The remark of the one selected node: its longer words, read and written
	at the bottom centre of the canvas, where the page's stylesheet fixes it
	(styles/page.css). A remark is the node's content, not a tool, so it stands
	by the map and not in the control panel. With no node selected, or
	several, it is hidden: one remark belongs to one node.

	What is typed is kept when the field is left — by a press on the map, a
	click on a control, the window losing focus — and lands on the node it was
	shown for, whatever is selected by then. The page keeps what is typed
	before NEW or OPEN puts another map in this one's place, since a click
	does not take the focus from a field in every browser. */
export class RemarkField {
	constructor( { area, field, write } ){
		this.area = area
		this.field = field
		this.shownFor = null
		field.addEventListener( "change", () => {
			if( this.shownFor ) write( this.shownFor, field.value )
		} )
	}

	/* Shows this topic's remark, the remark's name in the interface's
		 language its placeholder, for there is no title over it; with no topic, hides. */
	show( topic, name ){
		this.area.classList.toggle( "hidden", !topic )
		if( !topic ) return
		this.field.placeholder = name
		this.field.setAttribute( "aria-label", name )
		/* Words being typed are left alone while they are typed. */
		const typing = this.field.ownerDocument.activeElement === this.field && this.shownFor === topic.id
		this.shownFor = topic.id
		if( !typing ) this.field.value = topic.remark
	}
}
