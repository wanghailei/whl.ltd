/* A file name for a map's file: its title, without the characters a file
	system refuses, with the file's suffix. A map with no title is named
	Mindmap. */
export function fileName( title, suffix ){
	const stem = title.replace( /[\/\\:*?"<>|\u0000-\u001f]+/g, "-" ).trim() || "Mindmap"
	return stem + suffix
}
