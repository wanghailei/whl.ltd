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
		en: [ "I want to add a node. How?", "Select a node and press TAB for a child, ENTER for a sibling after it, or SHIFT+TAB for a new parent above it, and type its words." ],
		cn: [ "我想加一個節點，怎麼做？", "選一個節點，按 TAB 加子節點，ENTER 在其後加同級節點，或 SHIFT+TAB 在其上加一個父節點，再打字。" ],
	},
	{
		en: [ "I want to type a list of nodes in one go. How?", "Type a node's words and press ENTER: the next sibling opens below for its words. ESC on the empty one ends the list." ],
		cn: [ "我想一口氣打出一串節點，怎麼做？", "打完一個節點的文字後按 ENTER，下方隨即開出下一個同級節點。在空的那個按 ESC 即結束。" ],
	},
	{
		en: [ "I want to change a node's words. How?", "Double-click it and type: ENTER keeps the words and opens a sibling below, SHIFT+ENTER starts a new line, ESC throws the change away, and a click elsewhere keeps them. Or select it and type to write them afresh." ],
		cn: [ "我想改節點的文字，怎麼做？", "雙擊節點後打字：ENTER 保留並在下方開出同級節點，SHIFT+ENTER 換行，ESC 放棄，點別處即保留。選取後直接打字則重寫文字。" ],
	},
	{
		en: [ "I want to put a node earlier or later among its siblings. How?", "Select it and press ALT+↑ or ALT+↓, or drag it between two of its siblings." ],
		cn: [ "我想調整節點在同級中的順序，怎麼做？", "選取後按 ALT+↑ 或 ALT+↓，或把它拖到兩個同級節點之間。" ],
	},
	{
		en: [ "I want to copy or move a branch. How?", "Select its node and press CMD+C to copy or CMD+X to cut it, then select another node and press CMD+V: the branch goes under it." ],
		cn: [ "我想複製或搬移一個分支，怎麼做？", "選取其節點，按 CMD+C 複製或 CMD+X 剪下，再選另一個節點按 CMD+V，分支即貼到它之下。" ],
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
		en: [ "I want to find a node. How?", `Press CMD+F and type: every node whose words or ${ EN_REMARK } hold them glows. ENTER goes to the next and SHIFT+ENTER back, opening folds on the way; ESC closes the field.` ],
		cn: [ "我想找一個節點，怎麼做？", `按 CMD+F 後打字：文字或${ REMARK.cn }含有這些字的節點都會發亮。ENTER 到下一個，SHIFT+ENTER 回上一個，途中自動展開；ESC 關閉。` ],
	},
	{
		en: [ "I want to move a node elsewhere. How?", "Drag it onto another node: it becomes that node's last child, with everything under it. Or drag it between two nodes, where a short line marks the place: it goes in there." ],
		cn: [ "我想把節點移到別處，怎麼做？", "把它拖到另一個節點上：它連同其下一切成為那個節點的最後一個子節點。或把它拖到兩個節點之間，出現一條短線標出位置，放開即插入該處。" ],
	},
	{
		en: [ "I want to fold a branch away. How?", "Select its node and press SPACE, or click the small dot at the node's end; do it again to open it." ],
		cn: [ "我想收起一個分支，怎麼做？", "選取節點後按空白鍵，或點節點末端的小圓點；再做一次即展開。" ],
	},
	{
		en: [ "I want to see and edit the map as an outline. How?", "Press OUTLINE: the map shows at the left as an indented list, in step with it. Click a line to select its node, double-click to write its words; ENTER, TAB and SHIFT+TAB add nodes as on the map." ],
		cn: [ "我想以大綱檢視並編輯地圖，怎麼做？", "按「大綱」，地圖即以縮排清單顯示在左側，與地圖同步。點一行選取節點，雙擊改寫文字；ENTER、TAB、SHIFT+TAB 加節點，與在地圖上相同。" ],
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
		en: [ "I want to make a border, a branch or a line thicker. How?", "Select it and press + or − beside WIDTH; the width shows beside them. Picking a BORDER colour for a node with no border gives it one, 1 wide." ],
		cn: [ "我想讓邊框、分支或輔助線變粗，怎麼做？", "選取後按「寬度」旁的 + 或 −，寬度就顯示在旁邊。為沒有邊框的節點選「邊框」顏色，即得到寬 1 的邊框。" ],
	},
	{
		en: [ "I want to colour the map by level, all in one colour, or by branch. How?", "Under Theme, choose LEVEL for one colour per level, ONE for one colour throughout, or RAINBOW for one colour per main branch. A node's branch always takes the node's colour, and a fill given to a node wins." ],
		cn: [ "我想按層、全圖一色或按分支為地圖上色，怎麼做？", "在「主題」下選「同層同色」每層一色，選「全局同色」全圖一色，或選「彩虹色」每個主分支一色。分支與其節點同色，手動給節點的填色優先。" ],
	},
	{
		en: [ "I want to curve the lines between nodes. How?", "Choose ARC under Line to draw every line as part of a circle from node to node, or STRAIGHT for straight lines that turn round the nodes on round corners." ],
		cn: [ "我想讓輔助線彎曲，怎麼做？", "在「輔助線」下選「弧線」，每條輔助線都成為從節點到節點的一段圓弧；選「直線」則得到繞過節點、拐角圓滑的直線。" ],
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
