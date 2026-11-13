/* The interface's two tongues, English and Chinese. The Chinese is
	Traditional, never Simplified, as on every app on whl.ltd, at the master's
	rule (2026-11-12, 19:58). Its software terminology follows Mainland
	China usage, at his word (2026-11-13, 12:41), independently of script.

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
		notSaved: () => "瀏覽器無法保存此草稿。請使用「保存」將導圖保存為文件。",
		notAMap: () => "此文件不是 Mindmap 導圖或 Markdown 大綱。請打開 .mindmap.json 文件或 .md 大綱。",
		newer: ( { version } ) => "此導圖由較新版本的 Mindmap 保存（文件版本 " + version + "）。請使用較新版本的 Mindmap 打開。",
		broken: () => "此導圖文件沒有中心節點，無法打開。請打開另一份副本。",
		emptyOutline: () => "此大綱沒有可轉為導圖的標題或列表項。請打開至少包含一項的大綱。",
		joinPick: () => "點擊要連接的節點。按 Esc 取消。",
		joinSelect: () => "請選擇一個或兩個節點，再點擊「添加」，用輔助線連接。",
		defaultKept: () => "已設為默認：新建導圖將使用此樣式。",
		defaultRefused: () => "瀏覽器無法保存默認樣式。當前導圖已應用此樣式，新建導圖不會使用。",
		exportFailed: ( { kind } ) => "此瀏覽器無法導出 " + kind + "。SVG 無需光柵化，請嘗試導出 SVG，或收起大型導圖的部分分支後重試。",
		notAColour: ( { typed } ) => "「" + typed + "」不是有效顏色。請輸入 #rrggbb 格式的十六進制顏色代碼；填充也可輸入 none，表示無填充。",
		draftSetAside: () => "此瀏覽器中保存的導圖無法打開，可能來自較新版本的 Mindmap。原草稿已原樣另存，並已新建導圖。請將原草稿保存為文件，再使用創建它的 Mindmap 打開。",
		draftLost: () => "此瀏覽器中保存的導圖無法打開，且無法另存副本，瀏覽器中的原草稿已被新建導圖替換。請立即點擊「保存為文件」，保存原草稿。",
		saveSetAside: () => "保存為文件",
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
