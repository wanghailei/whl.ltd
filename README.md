# whl.ltd

The website of Wanted Hacker Limited, served by GitHub Pages.

- `index.html` — the front page; its background is a fresh roll of the
  Gradient engine on every visit, driven through a hidden same-origin iframe
  (`randomAll` → lift the drawn SVG → judge ink with the tool's sampler).
  One engine, no copied algorithm — so the front page needs the tool page
  beside it and must be previewed over HTTP, not `file://`.
- `colours/gradient/` — WHL Colours Gradient, a single-file gradient tool;
  updated by copying the released `whl_colours_gradient.html` in as
  `index.html`

See `LICENSE.md` for terms.
