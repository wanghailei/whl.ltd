/* The HELP sheet, in English and in Chinese, as HTML fragments, put into the
	help column by the page. Kept out of the markup so the markup stays the
	controls and nothing else. At the master's word (2026-11-12) it only
	teaches how to use the page, in a few lines: no reasons, no list of
	controls, no file format. Every claim here is a claim about the keys and
	controls as SPEC.md sets them out; a change to either changes this. The
	remark is named from language.js, where its one name per language is kept. */
import { REMARK } from "./language.js"

const EN_REMARK = REMARK.en.toLowerCase()

export const HELP = {
	en: `<p>Select a node and press TAB to add a child, ENTER to add a sibling, DELETE to delete it with everything under it. Type to write a node's words afresh, or double-click it to change them; ENTER keeps them, ESC throws the change away. The ARROW keys move between nodes. CMD+Z undoes and CMD+SHIFT+Z redoes; CTRL stands for CMD on Windows and Linux.</p>
<p>Drag a node onto another to move it there. Drag the empty canvas to move the map; pinch, or scroll with CMD held, or press − and + to zoom. SPACE folds a node's children away and opens them again. With one node selected, write its ${ EN_REMARK } at the bottom of the map. Style the selected nodes in the panel on the right.</p>
<p>SAVE keeps the map as a file and OPEN reads it back, or a Markdown outline. PNG, SVG, PDF and MD export it. Every change is also kept in this browser as you go.</p>`,
	cn: `<p>選一個節點，按 TAB 加子節點，按 ENTER 加同級節點，按 DELETE 連同其下一切刪除。直接打字即重寫節點文字，雙擊則修改原有文字；ENTER 保留，ESC 放棄。方向鍵在節點間切換。CMD+Z 復原，CMD+SHIFT+Z 重做；在 Windows 與 Linux 上以 CTRL 代替 CMD。</p>
<p>把節點拖到另一個節點上即移過去。拖曳空白處移動地圖；捏合、按住 CMD 捲動，或按 − 與 + 縮放。空白鍵收起或展開子節點。只選一個節點時，在地圖底部寫它的${ REMARK.cn }。在右側面板為選取的節點設定樣式。</p>
<p>儲存把地圖存成檔案，開啟讀回它，或讀入一份 Markdown 大綱。PNG、SVG、PDF、MD 匯出地圖。每個改動也隨手存在這個瀏覽器裡。</p>`,
}
