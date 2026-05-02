# Poster — typographic press still

Three layouts in one typographic system, derived from the visitor
player's palette (Georgia serif on cream paper, deep-red accent rule).
The SVGs are the master designs; convert to PNG / PDF for surfaces
that need raster.

## Files

| File | Aspect | Use |
|------|--------|-----|
| `og-press.svg` | 1200 × 630 (1.91:1) | OG card, social share, press emails. No QR (illegible at thumbnail). |
| `square.svg` | 1080 × 1080 | Instagram feed, generic social. Title split across four lines. |
| `press-still-a4.svg` | 210 × 297 mm | Print, PDF press kit. Includes QR + full footer (credit, licence, source). |
| `index.html` | — | Local preview of all three at reasonable on-screen sizes. Open `npm run serve` and visit http://localhost:5173/assets/poster/. Carries `noindex` so the proof page does not show up in search. |

## Audit locally

```bash
cd app
npm run serve
# visit http://localhost:5173/assets/poster/
```

## Export to raster

The SVGs use Georgia (system serif on every platform that renders
SVG inline). For PNG / PDF export, convert text to paths first so
the typeface doesn't fall back on machines without Georgia:

```bash
# Inkscape (preserves vectors as paths)
inkscape og-press.svg --export-type=png --export-width=1200 --export-text-to-path
inkscape square.svg   --export-type=png --export-width=1080 --export-text-to-path
inkscape press-still-a4.svg --export-type=pdf --export-text-to-path
```

The browser's Print → Save as PDF dialog also works for the A4 press
still and is a faster path if Inkscape isn't installed.
