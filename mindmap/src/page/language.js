/* The interface's two tongues, English and Chinese. The Chinese is
	Traditional, never Simplified, as on every app on whl.ltd, at the master's
	rule (2026-11-12, 19:58).

	Words in the markup carry their Chinese on the element, as in Alluvial —
	data-cn for text, data-cn-placeholder for a placeholder, data-cn-title for
	a tooltip and data-cn-aria-label for the name a screen reader says — so
	the toggle is a walk and a swap with no table to keep in step. Words the page writes
	itself — the notices, a heading that counts, the remark's name — come from WORDS
	below, each a function of what it reports. */
/* The public name of a node's remark, one word per language: renaming it is this line. */
export const REMARK = { en: "Remark", cn: "備註" }

/* What an empty central node shows until its words are typed: the same
	words in every language, at the master's word (2026-11-12). */
export const CENTRAL_PLACEHOLDER = "Je pense, donc je suis."

const WORDS = {
	en: {
		remark: () => REMARK.en,
		nodeHeading: ( { selected } ) => selected === 1 ? "Node" : selected + " nodes",
		notSaved: () => "The browser would not keep this draft. Use Save to keep the map in a file.",
		notAMap: () => "This file is not a Mindmap map or a Markdown outline. Open a .mindmap.json file or a .md outline.",
		newer: ( { version } ) => "This map was saved by a newer Mindmap (file version " + version + "). Open it in the newer Mindmap.",
		broken: () => "This map file has no central node, so it cannot be opened. Open another copy of it.",
		emptyOutline: () => "This outline has no headings or list items to make a map of. Open an outline with at least one item.",
		joinPick: () => "Click the node to join the line to. Esc cancels.",
		joinSelect: () => "Select one node, or two, and press ADD to join them with a line.",
		defaultKept: () => "Kept as the default: new maps start with this style.",
		defaultRefused: () => "The browser would not keep the default. This map has it; new maps will not.",
		exportFailed: ( { kind } ) => "The " + kind + " could not be made in this browser. SVG is made without drawing pixels: try it, or fold away part of a very large map and try again.",
		notAColour: ( { typed } ) => "“" + typed + "” is not a colour. Write it as a hex code, #rrggbb; a fill may also be none.",
		draftSetAside: () => "The map kept in this browser could not be opened — it may come from a newer Mindmap — so it has been set aside, untouched, and a new map begun. Save it as a file to open it in the Mindmap that made it.",
		draftLost: () => "The map kept in this browser could not be opened, and the browser would not keep a copy apart, so this new map has taken its place. Save it as a file now to keep it.",
		saveSetAside: () => "Save it",
		foldBranch: () => "Fold",
		openBranch: () => "Open",
	},
	cn: {
		remark: () => REMARK.cn,
		nodeHeading: ( { selected } ) => selected === 1 ? "節點" : selected + " 個節點",
		notSaved: () => "瀏覽器不肯保存這份草稿。請用「儲存」把地圖存成檔案。",
		notAMap: () => "這個檔案不是 Mindmap 地圖，也不是 Markdown 大綱。請開啟 .mindmap.json 檔案或 .md 大綱。",
		newer: ( { version } ) => "這張地圖由較新的 Mindmap 儲存（檔案版本 " + version + "）。請在較新的 Mindmap 開啟。",
		broken: () => "這個地圖檔沒有中心節點，無法開啟。請開啟它的另一份副本。",
		emptyOutline: () => "這份大綱沒有標題或清單項目可做成地圖。請開啟至少有一個項目的大綱。",
		joinPick: () => "點選要連到的節點。按 Esc 取消。",
		joinSelect: () => "選一個或兩個節點，再按「新增」以輔助線相連。",
		defaultKept: () => "已設為預設：新地圖將以此樣式開始。",
		defaultRefused: () => "瀏覽器不肯保存預設。這張地圖已套用，新地圖則不會。",
		exportFailed: ( { kind } ) => "這個瀏覽器無法產生 " + kind + "。SVG 不需繪成像素，可以改試它；或把很大的地圖收起一部分再試。",
		notAColour: ( { typed } ) => "「" + typed + "」不是顏色。請寫成 #rrggbb 形式的十六進位色碼；填色也可寫 none 表示無填色。",
		draftSetAside: () => "存在這個瀏覽器的地圖無法開啟——可能來自較新的 Mindmap——已原封不動另存一旁，並開了一張新地圖。把它存成檔案，便可在製作它的 Mindmap 中開啟。",
		draftLost: () => "存在這個瀏覽器的地圖無法開啟，瀏覽器也不肯另存一份，所以這張新地圖已取代它。請立刻把它存成檔案保留。",
		saveSetAside: () => "存成檔案",
		foldBranch: () => "收起",
		openBranch: () => "展開",
	},
}

/* The four things an element of the markup can say, each read and written
	its own way, and the attribute that carries its Chinese. */
const SAYINGS = [
	{ chinese: "data-cn", read: element => element.textContent, write: ( element, words ) => { element.textContent = words } },
	{ chinese: "data-cn-placeholder", read: element => element.placeholder, write: ( element, words ) => { element.placeholder = words } },
	{ chinese: "data-cn-title", read: element => element.title, write: ( element, words ) => { element.title = words } },
	{ chinese: "data-cn-aria-label", read: element => element.getAttribute( "aria-label" ), write: ( element, words ) => element.setAttribute( "aria-label", words ) },
]

export class Language {
	constructor( document ){
		this.document = document
		this.tongue = "en"
		/* Everything the markup says in both tongues, its English read once, before any swap. */
		this.said = SAYINGS.flatMap( saying => [ ...document.querySelectorAll( `[${ saying.chinese }]` ) ].map( element => ( {
			saying, element, english: saying.read( element ), chinese: element.getAttribute( saying.chinese ),
		} ) ) )
	}

	get isChinese(){
		return this.tongue === "cn"
	}

	/* Swaps everything said to the other tongue and marks which side is live. */
	speak( tongue ){
		this.tongue = tongue
		for( const { saying, element, english, chinese } of this.said ) saying.write( element, this.isChinese ? chinese : english )
		this.document.getElementById( "language-en" ).classList.toggle( "on", !this.isChinese )
		this.document.getElementById( "language-cn" ).classList.toggle( "on", this.isChinese )
		/* The tag tells the browser which forms to draw shared characters in,
			 where the face has none of its own: Traditional, as the words are. */
		this.document.documentElement.lang = this.isChinese ? "zh-Hant" : "en-GB"
	}

	toggle(){
		this.speak( this.isChinese ? "en" : "cn" )
	}

	/* A sentence the page writes itself, in the live tongue. */
	say( word, details = {} ){
		return WORDS[ this.tongue ][ word ]( details )
	}
}
