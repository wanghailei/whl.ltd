/* Writing SVG as text. Every word a user typed, and every value from a file,
	reaches the markup through `escaped`, so nothing in a node can become an
	element or an attribute. Numbers are rounded to hundredths: finer is
	invisible and only swells the file. */
export function escaped( text ){
	return String( text ).replace( UNCARRIED, keepPairs ).replace( /[&<>"']/g, character => ENTITIES[ character ] )
}

/* What XML cannot carry — control characters but tab and line breaks, and
	half of a surrogate pair with no other half — is left out of the drawing,
	which would otherwise not open, nor pass through a URL. Whole pairs are
	matched first and kept, so no lookbehind is needed: Safari before 16.4
	cannot parse one, and the whole page would not load. */
const UNCARRIED = /[\ud800-\udbff][\udc00-\udfff]|[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff\ud800-\udfff]/g

function keepPairs( match ){
	return match.length === 2 ? match : ""
}

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }

/* The attributes as ` name="value"`, leaving out any whose value is undefined or null. */
export function attributes( values ){
	return Object.entries( values )
		.filter( ( [ , value ] ) => value !== undefined && value !== null )
		.map( ( [ name, value ] ) => " " + name + "=\"" + escaped( typeof value === "number" ? rounded( value ) : value ) + "\"" )
		.join( "" )
}

export function rounded( value ){
	return Math.round( value * 100 ) / 100
}
