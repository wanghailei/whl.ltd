/* A search of the map for some words, at the master's word (2026-11-12,
	23:07): it finds every node whose words or remark hold them, whatever
	their case, in the map's order, those under a fold as well as those
	drawn. Words of spaces alone find nothing. */
export class Search {
	constructor( words ){
		this.words = words.trim().toLowerCase()
	}

	matchesIn( map ){
		if( this.words === "" ) return []
		return map.topics.filter( topic => topic.text.toLowerCase().includes( this.words ) || topic.remark.toLowerCase().includes( this.words ) )
	}
}
