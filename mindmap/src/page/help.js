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
/* The reorder keys, ALT with Carbon's up or down arrow from the page's
	symbols (index.html), each one piece: the house face draws ↑ and ↓ at its
	x-height, specks at the help's size (found in use, 2026-11-13). Each
	arrow is named for screen readers in the sheet's language. */
const ALT = {
	en: { up: altWith( "up", "up" ), down: altWith( "down", "down" ) },
	cn: { up: altWith( "up", "上" ), down: altWith( "down", "下" ) },
}

/* Each task: its question and answer in English, then in Chinese. */
const TASKS = [
	{
		en: [ "I want to start a new map. How?", "Press NEW in the panel. The map you had goes, and CMD+Z brings it back." ],
		cn: [ "我想新建一張導圖，怎麼做？", "點擊面板中的「新建」。當前導圖會被替換，按 CMD+Z 可恢復。" ],
	},
	{
		en: [ "I want to add a node. How?", "Select a node and press TAB for a child, ENTER for a sibling after it, or SHIFT+TAB for a new parent above it, and type its words." ],
		cn: [ "我想添加一個節點，怎麼做？", "選擇一個節點，按 TAB 添加子節點、ENTER 在其後添加同級節點，或 SHIFT+TAB 在其上添加父節點，再輸入文本。" ],
	},
	{
		en: [ "I want to type a list of nodes in one go. How?", "Type a node's words and press ENTER: the next sibling opens below for its words. ESC on the empty one ends the list." ],
		cn: [ "我想連續輸入多個節點，怎麼做？", "輸入節點文本後按 ENTER，下方即創建下一個同級節點供輸入。在空節點中按 ESC 即可結束。" ],
	},
	{
		en: [ "I want to change a node's words. How?", "Double-click it, or select it and press SPACE, and type after its words: ENTER keeps them and opens a sibling below, SHIFT+ENTER starts a new line, ESC throws the change away. Or select it and type to write them afresh." ],
		cn: [ "我想修改節點文本，怎麼做？", "雙擊節點，或選擇後按空格鍵，在原文本後輸入：ENTER 確認並創建同級節點，SHIFT+ENTER 換行，ESC 取消。選擇後直接輸入則替換文本。" ],
	},
	{
		en: [ "I want to put a node earlier or later among its siblings. How?", `Select it and press ${ ALT.en.up } or ${ ALT.en.down }, or drag it between two of its siblings.` ],
		cn: [ "我想調整節點在同級中的順序，怎麼做？", `選擇後按 ${ ALT.cn.up } 或 ${ ALT.cn.down }，或將其拖拽到兩個同級節點之間。` ],
	},
	{
		en: [ "I want to copy or move a branch. How?", "Select its node and press CMD+C to copy or CMD+X to cut it, then select another node and press CMD+V: the branch goes under it." ],
		cn: [ "我想複製或移動一個分支，怎麼做？", "選擇其節點，按 CMD+C 複製或 CMD+X 剪切，再選擇另一個節點，按 CMD+V 將分支粘貼為其子節點。" ],
	},
	{
		en: [ "I want to delete a node. How?", "Select it and press DELETE or BACKSPACE; everything under it goes with it." ],
		cn: [ "我想刪除節點，怎麼做？", "選擇後按 DELETE 或 BACKSPACE，該節點及其所有子節點將一併刪除。" ],
	},
	{
		en: [ "I want to select nodes. How?", "Click a node; SHIFT- or CMD-click adds one, SHIFT-drag over the empty canvas selects every node it touches, and CMD+A selects all. The ARROW keys move to the nearest node that way." ],
		cn: [ "我想選擇節點，怎麼做？", "點擊節點；按住 SHIFT 或 CMD 點擊可添加或取消選擇，按住 SHIFT 拖拽空白處可框選，CMD+A 全選。方向鍵選擇該方向最近的節點。" ],
	},
	{
		en: [ "I want to find a node. How?", `Press CMD+F and type: every node whose words or ${ EN_REMARK } hold them glows. ENTER goes to the next and SHIFT+ENTER back, opening folds on the way; ESC closes the field.` ],
		cn: [ "我想查找節點，怎麼做？", `按 CMD+F 輸入要查找的文本：文本或${ REMARK.cn }匹配的節點會高亮顯示。ENTER 到下一個，SHIFT+ENTER 到上一個，途中自動展開；ESC 關閉。` ],
	},
	{
		en: [ "I want to move a node elsewhere. How?", "Drag it onto another node: it becomes that node's last child, with everything under it. Or drag it between two nodes, where a short line marks the place: it goes in there." ],
		cn: [ "我想將節點移到其他位置，怎麼做？", "將其拖拽到另一個節點上，該節點及其子節點會移至目標的子節點末尾。也可拖拽到兩個節點之間，短線標出插入位置，鬆開即可插入。" ],
	},
	{
		en: [ "I want to fold a branch away. How?", "Select its node and press CMD+., or click the small dot at the node's end; do it again to open it." ],
		cn: [ "我想收起一個分支，怎麼做？", "選擇節點後按 CMD+.，或點擊節點末端的小圓點；再次操作即可展開。" ],
	},
	{
		en: [ "I want to see and edit the map as an outline. How?", "Press OUTLINE: the map shows at the left as an indented list, in step with it. Click a line to select it; double-click it or press SPACE to write its words; ENTER, TAB and SHIFT+TAB add nodes." ],
		cn: [ "我想在大綱中查看並編輯導圖，怎麼做？", "點擊「大綱」，左側顯示與導圖同步的縮進列表。點擊一行選擇節點，雙擊或按空格鍵編輯文本；ENTER、TAB、SHIFT+TAB 添加節點，與導圖中相同。" ],
	},
	{
		en: [ "I want to join two nodes with a line and label it. How?", "Select both and press ADD under Line, or select one, press ADD and click the other. Double-click the line to write its label. Two nodes take one line." ],
		cn: [ "我想用輔助線連接兩個節點並添加標籤，怎麼做？", "選擇兩個節點，點擊「輔助線」下的「添加」；或選擇一個、點擊「添加」，再點擊另一個。雙擊輔助線可輸入標籤。兩個節點之間最多一條輔助線。" ],
	},
	{
		en: [ "I want to change a colour or a style. How?", "Click a node, branch or line to change its colour, shape or dash. SET AS DEFAULT on a node or line gives its look to its kind where not styled by hand, and to new maps." ],
		cn: [ "我想修改顏色或樣式，怎麼做？", "點擊節點、分支或輔助線，在面板中修改顏色、形狀或線型。選擇節點或輔助線後點擊「設為默認」，同類中未手動設置樣式的對象和新建導圖都使用此樣式。" ],
	},
	{
		en: [ "I want to make a border, a branch or a line thicker. How?", "Under Branch width, press + or − to change every branch; no selection needed. For a border or auxiliary line, select it and use its WIDTH. Picking a BORDER colour adds a border where none shows." ],
		cn: [ "我想讓邊框、分支或輔助線變粗，怎麼做？", "在「分支寬度」下點擊 + 或 −，統一修改所有分支，無需選擇。邊框和輔助線則選擇後修改各自的寬度。選擇邊框顏色可為節點添加寬度為 1 的邊框。" ],
	},
	{
		en: [ "I want to colour the map by level, all in one colour, or by branch. How?", "Under Theme, choose LEVEL for one colour per level, ONE for one colour throughout, or RAINBOW for one colour per main branch. A node's branch always takes the node's colour, and a fill given to a node wins." ],
		cn: [ "我想按層級、統一顏色或按分支為導圖配色，怎麼做？", "在「主題」下選擇「同層同色」，每層一色；「全局同色」為整張導圖統一配色；「彩虹色」每個主分支一色。分支與其節點同色，手動設置的節點填充優先。" ],
	},
	{
		en: [ "I want to curve the lines between nodes. How?", "Choose ARC under Line to draw every line as part of a circle from node to node, or STRAIGHT for straight lines that turn round the nodes on round corners." ],
		cn: [ "我想讓輔助線彎曲，怎麼做？", "在「輔助線」下選擇「弧線」，每條輔助線即為連接節點的一段圓弧；選擇「直線」，則使用繞過節點、轉角圓滑的直線。" ],
	},
	{
		en: [ "I want to change the layout or theme. How?", "Press RIGHT, BOTH or DOWN under Layout, or a theme under Theme. LIGHT/DARK at the top switches the appearance." ],
		cn: [ "我想切換布局或主題，怎麼做？", "在「布局」下選擇「向右」、「兩側」或「向下」，在「主題」下選擇主題。頂部的淺/深切換明暗外觀。" ],
	},
	{
		en: [ `I want to add a ${ EN_REMARK } to a node. How?`, `Select one node: write up to 50 characters including spaces in the bottom field. ENTER or leaving keeps it; ESC cancels. Pasted line breaks become spaces; excess input shows a notice instead of being cut.` ],
		cn: [ `我想給節點添加${ REMARK.cn }，怎麼做？`, `選擇一個節點，在底部輸入框中輸入單行${ REMARK.cn }，含空格最多 50 個字符。按 ENTER 或離開輸入框保存，ESC 取消。粘貼時換行轉為空格；超限修改會被拒絕並提示。` ],
	},
	{
		en: [ "I want to read or replace an older remark. How?", "Older long or multiline remarks stay whole. Hover over or focus the bottom field to read the original. To replace it, type a valid single-line edit and confirm; cancelling keeps the original." ],
		cn: [ "我想查看或替換舊版備註，怎麼做？", "舊版的長備註或多行備註保持完整。將鼠標指針停留在底部輸入框上或聚焦，即可查看原文。輸入有效的單行文本並確認後才能替換；取消則保留原文。" ],
	},
	{
		en: [ "I want to move or zoom the map. How?", "Drag the empty canvas, or scroll, to move it. Pinch, scroll with CMD held, or press − and + to zoom; CENTRE or CMD+0 brings it back to the middle." ],
		cn: [ "我想移動或縮放導圖，怎麼做？", "拖拽空白處或滾動可移動導圖。捏合、按住 CMD 滾動，或點擊 − 與 + 可縮放；點擊「居中」或按 CMD+0 將導圖移回中心。" ],
	},
	{
		en: [ "I want to undo a change. How?", "CMD+Z undoes and CMD+SHIFT+Z redoes. On Windows and Linux, use CTRL for CMD." ],
		cn: [ "我想撤銷修改，怎麼做？", "CMD+Z 撤銷，CMD+SHIFT+Z 重做。在 Windows 與 Linux 上使用 CTRL 代替 CMD。" ],
	},
	{
		en: [ "I want to save my map and open it again. How?", "SAVE keeps the map as a file, and OPEN reads it back. Every change is also kept in this browser as you go." ],
		cn: [ "我想保存導圖並再次打開，怎麼做？", "點擊「保存」將導圖保存為文件，點擊「打開」讀取文件。每次修改也會自動保存在此瀏覽器中。" ],
	},
	{
		en: [ "I want to export a picture or an outline of my map. How?", "PNG, SVG and PDF export the map as it is drawn; MD exports its words as a Markdown outline." ],
		cn: [ "我想導出導圖的圖片或大綱，怎麼做？", "PNG、SVG、PDF 導出當前繪製的導圖；MD 將文本導出為 Markdown 大綱。" ],
	},
	{
		en: [ "I want to make a map from a Markdown outline. How?", "Press OPEN and choose the outline, or drop it on the canvas: its headings and list items become nodes." ],
		cn: [ "我想從 Markdown 大綱創建導圖，怎麼做？", "點擊「打開」選擇大綱，或將其拖拽到畫布上：標題與列表項會轉為節點。" ],
	},
]

export const HELP = { en: sheet( "en" ), cn: sheet( "cn" ) }

/* ALT and the arrow one way, with the name a screen reader says for it. */
function altWith( way, name ){
	return `<span class="chord">ALT+<svg class="key-arrow" role="img" aria-label="${ name }"><use href="#arrow-${ way }"/></svg></span>`
}

/* The sheet in one language: each question a small heading, its answer under it. */
function sheet( language ){
	return TASKS.map( task => {
		const [ question, answer ] = task[ language ]
		return `<h3>${ question }</h3>\n<p>${ answer }</p>`
	} ).join( "\n" )
}
