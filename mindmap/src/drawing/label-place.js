/* Where an auxiliary line's label stands: on the line, at the place nearest
	its middle where the label, with its edge, covers none of the boxes to keep
	clear of; where no stretch is clear, as on a short line between two close
	nodes, beside the line, its edge against it, at the clear place nearest
	the middle. At the middle itself a label printed over the words of a node
	the line ran close to (found in use, 2026-11-12). Where no place on or
	beside the line is clear, a little further out from it, alongside it, up
	to two of the label's own heights past touching it, so it still reads as
	the line's: the clear place nearest the line, and then nearest the
	middle. A long label on a short line between close nodes, as between the
	two sides of BOTH, had taken the place that covered least, over a node's
	words (found in review, 2026-11-13). Where no place that near is clear, as
	between two close siblings whose children stand near, it takes the place
	on or beside the line that covers least.

	Kept apart from the drawing, as a run of points, the label's half size and
	the boxes, so the rule can be tried on any line and any boxes. */

/* How far apart the places tried for a label along its line are, and the steps out from it. */
const STEP = 4
/* How far out from its line a label may stand past touching it, in its own heights. */
const REACH = 2

export function labelPlace( waypoints, half, boxes ){
	const covered = point => boxes.reduce( ( area, box ) => area + Math.max( 0, Math.min( point.x + half.x, box.right ) - Math.max( point.x - half.x, box.left ) ) * Math.max( 0, Math.min( point.y + half.y, box.bottom ) - Math.max( point.y - half.y, box.top ) ), 0 )
	const places = placesAlong( waypoints, STEP )
	const length = places.at( -1 ).distance
	places.sort( ( one, other ) => Math.abs( one.distance - length / 2 ) - Math.abs( other.distance - length / 2 ) )
	const clear = places.find( place => covered( place.point ) === 0 )
	if( clear ) return clear.point
	/* Beside the line, its edge against it, then a step further out at a time, each nearest the middle first. */
	for( let out = 0; out <= REACH * 2 * half.y; out += STEP ){
		const further = places.flatMap( place => beside( place, half, out ) ).find( point => covered( point ) === 0 )
		if( further ) return further
	}
	/* Beside the line first, then on it, each nearest the middle first: the first place that covers least. */
	return [ ...places.flatMap( place => beside( place, half ) ), ...places.map( place => place.point ) ].reduce( ( least, point ) => covered( point ) < covered( least ) ? point : least )
}

/* The label beside a place, on either side, its edge against the line, or
	as far again out from it as is asked. Where the piece slants, the label
	touches it at one corner, which must fall on the piece itself: beside a
	piece's end it could fall on the piece carried on past the end, and the
	label stood apart from its line (found in review, 2026-11-12). Further
	out, that corner stands straight out from the same place on the piece. */
function beside( place, half, out = 0 ){
	return [ 1, -1 ].flatMap( side => {
		const across = { x: -place.toward.y * side, y: place.toward.x * side }
		const reach = Math.abs( across.x ) * half.x + Math.abs( across.y ) * half.y + out
		const centre = place.point.plus( { x: across.x * reach, y: across.y * reach } )
		const touching = centre.minus( { x: Math.sign( across.x ) * half.x, y: Math.sign( across.y ) * half.y } )
		const along = ( touching.x - place.from.x ) * place.toward.x + ( touching.y - place.from.y ) * place.toward.y
		return along >= 0 && along <= place.length ? [ centre ] : []
	} )
}

/* Points along a run of straight pieces, a step apart, each with how far
	along the run it stands, and its piece: where it starts, the way it runs
	and how long it is; the pieces' ends among them. */
function placesAlong( points, step ){
	const places = []
	let travelled = 0
	for( let index = 1; index < points.length; index++ ){
		const from = points[ index - 1 ], along = points[ index ].minus( from ), length = along.length
		if( length === 0 ) continue
		const toward = along.unit
		for( let at = 0; at < length; at += step ) places.push( { point: from.plus( along.times( at / length ) ), distance: travelled + at, toward, from, length } )
		travelled += length
		places.push( { point: points[ index ], distance: travelled, toward, from, length } )
	}
	return places
}
