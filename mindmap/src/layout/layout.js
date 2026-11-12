import { RightTree, BothTree, DownTree } from "./trees.js"

/* The three layouts by the names a map keeps them under. The factory is the
	one place a layout's name is read; each layout knows only how it arranges.
	Every name in the model's LAYOUTS has one here, which the layout tests
	hold it to. The radial layout is taken away for now, at the master's word
	(2026-11-12); it may come back, from the history. */
const LAYOUTS = {
	right: RightTree,
	both: BothTree,
	down: DownTree,
}

export class Layout {
	static for( map ){
		const Chosen = LAYOUTS[ map.layout ] ?? RightTree
		return new Chosen()
	}
}
