/* The three faces a node can be set in, as font stacks. Mono is the house's
	own law for every WHL site, the stack the interface and the other whl.ltd
	tools use (styles/base.css, --mindmap-font-mono), with one name more: the
	desktop cut of Berkeley Mono installs on macOS as Berkeley Mono Variable,
	which an exported SVG opened outside the page finds only by that name. In
	the page the first face, the sidecar berkeley.woff2, always answers. Sans
	and serif name faces every desktop has, so an exported SVG reads the same
	on another machine. The browser measures and draws with the same stack, so
	measured and drawn widths agree. */
const FAMILIES = {
	mono: "\"Berkeley Mono\", \"Berkeley Mono Variable\", \"IBM Plex Mono\", \"IBM Plex Sans TC\", monospace",
	sans: "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
	serif: "Georgia, \"Times New Roman\", serif",
}

export function fontFamily( font ){
	return FAMILIES[ font ] ?? FAMILIES.mono
}
