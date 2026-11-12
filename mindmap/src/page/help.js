/* The HELP sheet, in English and in Chinese, as HTML fragments, put into the
	help column by the page. Kept out of the markup so the markup stays the
	controls and nothing else.

	At the master's word (2026-11-12, 21:50) it is an FAQ built from the
	user's key tasks: each a question, "I want to … How?", set as a small
	heading, and an answer of a line or two, covering every core feature
	through a task. It only teaches how to use the page: no reasons, no bare
	list of controls, no file format. Every answer is a claim about the keys
	and controls as SPEC.md sets them out; a change to either changes this.
	The remark is named from language.js, where its one name per language is
	kept. */
import { REMARK } from "./language.js"

const EN_REMARK = REMARK.en.toLowerCase()

/* Each task: its question and answer in English, then in Chinese. */
const TASKS = [
	{
		en: [ "I want to start a new map. How?", "Press NEW in the panel. The map you had goes, and CMD+Z brings it back." ],
		cn: [ "我想開一張新地圖，怎麼做？", "按面板上的「新建」。原來的地圖會被換掉，按 CMD+Z 可以找回。" ],
	},
	{
		en: [ "I want to add a node. How?", "Select a node and press TAB for a child, or ENTER for a sibling after it; type its words and press ENTER." ],
		cn: [ "我想加一個節點，怎麼做？", "選一個節點，按 TAB 加子節點，或按 ENTER 在其後加同級節點；打字後按 ENTER。" ],
	},
	{
		en: [ "I want to change a node's words. How?", "Double-click it and type: ENTER keeps the words, SHIFT+ENTER starts a new line, ESC throws the change away. Or select it and type to write them afresh." ],
		cn: [ "我想改節點的文字，怎麼做？", "雙擊節點後打字：ENTER 保留，SHIFT+ENTER 換行，ESC 放棄。選取後直接打字則重寫文字。" ],
	},
	{
		en: [ "I want to delete a node. How?", "Select it and press DELETE or BACKSPACE; everything under it goes with it." ],
		cn: [ "我想刪除節點，怎麼做？", "選取後按 DELETE 或 BACKSPACE，其下一切一併刪除。" ],
	},
	{
		en: [ "I want to select nodes. How?", "Click a node; SHIFT- or CMD-click adds one, SHIFT-drag over the empty canvas selects every node it touches, and CMD+A selects all. The ARROW keys move to the nearest node that way." ],
		cn: [ "我想選取節點，怎麼做？", "點一下節點；按住 SHIFT 或 CMD 點擊可加選，按住 SHIFT 拖曳空白處可框選，CMD+A 全選。方向鍵移到那一側最近的節點。" ],
	},
	{
		en: [ "I want to move a node elsewhere. How?", "Drag it onto another node: it becomes that node's last child, with everything under it." ],
		cn: [ "我想把節點移到別處，怎麼做？", "把它拖到另一個節點上：它連同其下一切成為那個節點的最後一個子節點。" ],
	},
	{
		en: [ "I want to fold a branch away. How?", "Select its node and press SPACE, or click the small dot at the node's end; do it again to open it." ],
		cn: [ "我想收起一個分支，怎麼做？", "選取節點後按空白鍵，或點節點末端的小圓點；再做一次即展開。" ],
	},
	{
		en: [ "I want to join two nodes with a line and label it. How?", "Select both and press ADD under Line, or select one, press ADD and click the other. Double-click the line to write its label. Two nodes take one line." ],
		cn: [ "我想用輔助線連接兩個節點並加上標籤，怎麼做？", "選取兩個節點後按「輔助線」下的「新增」，或選一個、按「新增」、再點另一個。雙擊輔助線即可寫標籤。兩個節點之間只有一條輔助線。" ],
	},
	{
		en: [ "I want to change a colour or a style. How?", "Click a node, branch or line and change its colour, shape, width or dash in the panel. SET AS DEFAULT on a node or line gives that look to its kind where not styled by hand, and to new maps." ],
		cn: [ "我想改顏色或樣式，怎麼做？", "點一下節點、分支或輔助線，在面板中改它的顏色、形狀、寬度或線型。在節點或輔助線上按「設為預設」，同類中未手動設定的與新地圖都照這個樣子。" ],
	},
	{
		en: [ "I want to curve the lines between nodes. How?", "Choose ARC under Line to draw every line as one smooth curve from node to node, or STRAIGHT for straight lines that turn round the nodes on round corners." ],
		cn: [ "我想讓輔助線彎曲，怎麼做？", "在「輔助線」下選「弧線」，每條輔助線都成為從節點到節點的一道圓滑曲線；選「直線」則得到繞過節點、拐角圓滑的直線。" ],
	},
	{
		en: [ "I want to change the layout or theme. How?", "Press RIGHT, BOTH or DOWN under Layout, or a theme under Theme. LIGHT/DARK at the top switches the appearance." ],
		cn: [ "我想換佈局或主題，怎麼做？", "在「佈局」下按右展、兩側或向下，在「主題」下選一個主題。頂端的淺/深切換明暗。" ],
	},
	{
		en: [ `I want to add a ${ EN_REMARK } to a node. How?`, `Select one node and write in the field at the bottom of the map. Rest the pointer on the node to read its ${ EN_REMARK }.` ],
		cn: [ `我想給節點寫${ REMARK.cn }，怎麼做？`, `只選一個節點，在地圖底部的欄位寫下。指標停在節點上即可讀到${ REMARK.cn }。` ],
	},
	{
		en: [ "I want to move or zoom the map. How?", "Drag the empty canvas, or scroll, to move it. Pinch, scroll with CMD held, or press − and + to zoom; CENTRE or CMD+0 brings it back to the middle." ],
		cn: [ "我想移動或縮放地圖，怎麼做？", "拖曳空白處或捲動來移動。捏合、按住 CMD 捲動，或按 − 與 + 縮放；「置中」或 CMD+0 把地圖移回中間。" ],
	},
	{
		en: [ "I want to undo a change. How?", "CMD+Z undoes and CMD+SHIFT+Z redoes. On Windows and Linux, use CTRL for CMD." ],
		cn: [ "我想復原改動，怎麼做？", "CMD+Z 復原，CMD+SHIFT+Z 重做。在 Windows 與 Linux 上以 CTRL 代替 CMD。" ],
	},
	{
		en: [ "I want to save my map and open it again. How?", "SAVE keeps the map as a file, and OPEN reads it back. Every change is also kept in this browser as you go." ],
		cn: [ "我想儲存地圖並再次開啟，怎麼做？", "「儲存」把地圖存成檔案，「開啟」讀回它。每個改動也隨手存在這個瀏覽器裡。" ],
	},
	{
		en: [ "I want to export a picture or an outline of my map. How?", "PNG, SVG and PDF export the map as it is drawn; MD exports its words as a Markdown outline." ],
		cn: [ "我想匯出地圖的圖片或大綱，怎麼做？", "PNG、SVG、PDF 匯出畫出的地圖；MD 把文字匯出為 Markdown 大綱。" ],
	},
	{
		en: [ "I want to make a map from a Markdown outline. How?", "Press OPEN and choose the outline, or drop it on the canvas: its headings and list items become nodes." ],
		cn: [ "我想從 Markdown 大綱做地圖，怎麼做？", "按「開啟」選擇大綱，或把它拖到畫布上：標題與清單項目都會成為節點。" ],
	},
]

export const HELP = { en: sheet( "en" ), cn: sheet( "cn" ) }

/* The sheet in one language: each question a small heading, its answer under it. */
function sheet( language ){
	return TASKS.map( task => {
		const [ question, answer ] = task[ language ]
		return `<h3>${ question }</h3>\n<p>${ answer }</p>`
	} ).join( "\n" )
}
