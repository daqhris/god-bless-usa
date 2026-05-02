# Poster — typographic press still

Six masters — three formats in two themes — derived from the visitor
player's palette (Georgia serif, single deep-red accent rule on the
light theme; lighter rose accent on the dark theme). The SVGs are the
master designs; convert to PNG / PDF for surfaces that need raster.

## Files

| File | Aspect | Theme | Use |
|------|--------|-------|-----|
| `og-press.svg` | 1200 × 630 | light | OG card, social share, press emails. No QR (illegible at thumbnail). |
| `og-press-dark.svg` | 1200 × 630 | dark | Same, dark theme. For platforms that respect prefers-color-scheme, or where a dark register reads better. |
| `square.svg` | 1080 × 1080 | light | Instagram feed, generic social. Title split across four lines. |
| `square-dark.svg` | 1080 × 1080 | dark | Same, dark theme. |
| `press-still-a4.svg` | 210 × 297 mm | light | Print, PDF press kit. Includes QR + full footer (credit, licence, source). Default for hand-distributed copies (saves toner). |
| `press-still-a4-dark.svg` | 210 × 297 mm | dark | Same, dark theme. For screens, projectors, digital press attachments. The QR is wrapped in a small cream tile so it stays scannable on the dark ground. |
| `index.html` | — | — | Local proof page showing all six side by side at reasonable on-screen sizes. Carries `noindex` so the proof page does not show up in search. Open `npm run serve` and visit http://localhost:5173/assets/poster/. |

## Audit locally

```bash
cd app
npm run serve
# visit http://localhost:5173/assets/poster/
```

## Export to raster

The SVGs use Georgia (system serif on every platform that renders
SVG inline). For PNG / PDF export, convert text to paths first so
the typeface doesn't fall back on machines without Georgia.

Inkscape (preserves vectors as paths):

```
inkscape og-press.svg --export-type=png --export-width=1200 --export-text-to-path
inkscape og-press-dark.svg --export-type=png --export-width=1200 --export-text-to-path
inkscape square.svg --export-type=png --export-width=1080 --export-text-to-path
inkscape square-dark.svg --export-type=png --export-width=1080 --export-text-to-path
inkscape press-still-a4.svg --export-type=pdf --export-text-to-path
inkscape press-still-a4-dark.svg --export-type=pdf --export-text-to-path
```

The browser's Print → Save as PDF dialog also works for the A4 press
stills and is a faster path if Inkscape isn't installed.

## Palette

Pulled from the visitor player's `style.css`:

| token | light | dark |
|-------|-------|------|
| background | `#f9f6ef` (cream) | `#181816` (warm near-black) |
| foreground | `#1a1a1a` | `#e8e4d9` (cream ink) |
| muted | `#5a5a5a` | `#9a948a` |
| accent | `#8a2c2c` (deep red) | `#d47575` (lighter rose) |
