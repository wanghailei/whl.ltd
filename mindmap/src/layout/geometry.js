/* A point on the map, or a direction: the same two numbers, read either way.
	Map units are CSS pixels at 100% zoom. */
export class Point {
	constructor( x, y ){
		this.x = x
		this.y = y
	}

	plus( other ){ return new Point( this.x + other.x, this.y + other.y ) }
	minus( other ){ return new Point( this.x - other.x, this.y - other.y ) }
	times( factor ){ return new Point( this.x * factor, this.y * factor ) }
	dot( other ){ return this.x * other.x + this.y * other.y }

	get length(){ return Math.hypot( this.x, this.y ) }

	/* The same direction, one unit long; a point at the origin has none and stays put. */
	get unit(){
		const length = this.length
		return length === 0 ? this : this.times( 1 / length )
	}

	/* A quarter turn, for the side a curve bulges to. */
	get perpendicular(){ return new Point( -this.y, this.x ) }

	/* Whether the direction runs more across than up and down. */
	get isLevel(){ return Math.abs( this.x ) >= Math.abs( this.y ) }
}

/* A rectangle on the map, by its top-left corner and its size. */
export class Box {
	constructor( x, y, width, height ){
		this.x = x
		this.y = y
		this.width = width
		this.height = height
	}

	static around( centre, width, height ){
		return new Box( centre.x - width / 2, centre.y - height / 2, width, height )
	}

	/* The smallest box holding all these. */
	static enclosing( boxes ){
		const left = Math.min( ...boxes.map( box => box.left ) ), top = Math.min( ...boxes.map( box => box.top ) )
		const right = Math.max( ...boxes.map( box => box.right ) ), bottom = Math.max( ...boxes.map( box => box.bottom ) )
		return new Box( left, top, right - left, bottom - top )
	}

	get left(){ return this.x }
	get right(){ return this.x + this.width }
	get top(){ return this.y }
	get bottom(){ return this.y + this.height }
	get centre(){ return new Point( this.x + this.width / 2, this.y + this.height / 2 ) }

	/* Whether the two share any area; boxes that only touch do not. */
	overlaps( other ){
		return this.left < other.right && other.left < this.right && this.top < other.bottom && other.top < this.bottom
	}

	/* The same box with room added on every side. */
	grown( margin ){
		return new Box( this.x - margin, this.y - margin, this.width + 2 * margin, this.height + 2 * margin )
	}

	/* Where a ray from the centre in this direction leaves the box. */
	edgeToward( direction ){
		const half = new Point( this.width / 2, this.height / 2 )
		const across = direction.x === 0 ? Infinity : half.x / Math.abs( direction.x )
		const down = direction.y === 0 ? Infinity : half.y / Math.abs( direction.y )
		return this.centre.plus( direction.times( Math.min( across, down ) ) )
	}

	toJSON(){
		return { x: this.x, y: this.y, width: this.width, height: this.height }
	}
}
