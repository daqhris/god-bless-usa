# Poster — typographic press still

Six masters — three formats in two themes — derived from the **printed
liturgical bulletin** at `print/bulletin.html` (Georgia serif, gold
accent on cream paper or near-black ground). The SVGs are the master
designs; convert to PNG / PDF for surfaces that need raster.

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

Pulled from `print/bulletin.html` so the poster reads consistent with
the printed liturgical bulletin. The dark variant matches the bulletin
exactly; the light variant is a paper-and-ink inversion of the same
hues.

| token | light | dark (= bulletin) |
|-------|-------|-------------------|
| background | `#f9f6ef` (cream paper) | `#0a0908` (near-black) |
| foreground | `#1a1a1a` | `#e8e4d9` (cream ink) |
| muted | `#5a5a5a` | `#8a8478` (warm grey) |
| accent | `#d4a869` (gold) | `#d4a869` (gold — same) |

The accent gold `#d4a869` is intentionally low-contrast on cream — it
reads as a presence rather than a flag, the way gold leaf does on a
liturgical page. If a particular surface needs the date emphasis to
shout (e.g. a flyer printed for outdoor display), edit the date
`<text>` element's `fill` to a darker amber such as `#a47020`.
