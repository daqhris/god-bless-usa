# Print files for the Biennale frame

Two print-ready artifacts at different page sizes — one goes into the frame, the
other is a working document for the print shop:

| File | Page size | Purpose | Deliverable |
|---|---|---|---|
| [`bulletin.html`](./bulletin.html) | **450 × 300 mm** (frame-matching) | Framed portal with the full story text + live QR pointing to `https://daqhris.com/god-bless-usa/`. The framed bulletin visitors see first. | PDF at `~/Downloads/god-bless-usa_bulletin_final.pdf` |
| [`awalkaday91-spec.html`](./awalkaday91-spec.html) | **A4 landscape** (297 × 210 mm) | Print specification sheet for the companion photograph *awalkaday 91-2022*. Shows the expected framed result with the photo embedded, and all printing specs. | PDF at `~/Downloads/awalkaday91_print-specification_final.pdf` |

The bulletin gets framed behind glass. The spec sheet is a working reference for
the print shop — it is NOT framed.

The actual photograph file is the source JPEG at the artist's
[Arweave archive](https://xjp7hza4gi5jdcag2jq3jmtdysje24arqrq2mxdxxqenaxadq7yq.arweave.net/ul_z5BwyOpGIBtJhtLJjxJJNcBGEYaZcd7wI0FwDh_E)
(4906 × 4906 px). The spec sheet tells the printer how to handle it.

## Regenerating the PDFs

No Node dependencies required — Chrome's headless mode handles the print directly:

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"   # Windows
cd app/print

"$CHROME" --headless --disable-gpu --print-to-pdf-no-header \
  --print-to-pdf="$HOME/Downloads/god-bless-usa_bulletin_final.pdf" \
  "file:///$(pwd)/bulletin.html"

"$CHROME" --headless --disable-gpu --print-to-pdf-no-header \
  --print-to-pdf="$HOME/Downloads/awalkaday91_print-specification_final.pdf" \
  "file:///$(pwd)/awalkaday91-spec.html"
```

Each HTML sets its own `@page { size: …; margin: 0; }` — `450mm 300mm` for the
bulletin, `A4 landscape` for the spec. No scaling, no cropping.

## Design notes

### Bulletin

3-column body inside a 400 × 245 mm visible area, bleeding to 450 × 300 mm at the
frame outer. Dark background (#0a0908), cream body text (#e8e4d9), warm amber
accent (#d4a869) for refrains, section headers, and the QR frame. Serif
typography (Georgia / Fraunces / Playfair Display). The QR encodes
`https://daqhris.com/god-bless-usa/` (with trailing slash — important for
asset-path resolution and to avoid the Pages 301 redirect).

**Text fidelity.** The bulletin contains the full verbatim text from
[`/story.md`](../../story.md), including the closing paragraph about the
"Hard To Pronounce Name" African kingdom that earlier drafts had truncated.
Verified line-by-line.

### Photo specification

A4 landscape. Left half: frame mockup at 0.333× scale showing the **bright
polished wood** frame, the cream matting, and the 200 × 200 mm photo centered
inside the 400 × 245 mm visible window. The photo itself (a 700 × 700 preview
JPEG at `awalkaday91-preview.jpg`) is embedded so the artist can see the expected
framed result. Three lights marked A / B / C with small badges next to each
bright point.

Right half: technical specs in five sections — Frame / Print File / Paper / Three
Lights / Authorship. Footer: four weblinks (awalkaday.art, daqhris.com, Arweave
source, audio companion) and the pavilion credit.

### Print size — why 200 × 200 mm, not 400 × 400 mm

The earlier plan (400 × 400 mm print, extending beyond the frame top/bottom with
77.5 mm hidden on each side) placed Lights A and B within ~100 mm of the left
rabbet — hard to loupe, risk of visual clipping near the edge. The revised plan:

- **Photo print size:** 200 × 200 mm square
- **Placement:** centered in the 400 × 245 mm visible window
- **Margins:** 100 mm horizontal each side, 22.5 mm vertical each side
- **Nothing is hidden** behind the frame lip any more
- **Output DPI:** 623 dpi from the 4906 × 4906 px source — beyond fine-art
- **Nearest edge from any light:** ≥ 95 mm

### Three light coordinates (revised for the 200 × 200 mm print)

Measured directly from the 4906 × 4906 px Arweave source using
`scipy.ndimage` connected components on a background-subtracted sky mask.

| Light | In 200 × 200 mm print | Character |
|---|---|---|
| A — small bright dot (top)    | 49.8 mm L · 73.2 mm T  | Single pixel cluster |
| B — diagonal contrail (centre) | 57.4 mm L · 97.8 mm T  | Long bright streak   |
| C — vertical streak (right)    | 136.8 mm L · 103.2 mm T | Short bright line    |

Triangular arrangement reminiscent of the three stars on Burundi's flag.

## Assets

- `awalkaday91-preview.jpg` — 700 × 700 preview of the photograph (23 KB), used
  in the spec visualization. Safe to commit — it's a derived low-res asset,
  and the full-res 4906 × 4906 original is canonically archived on Arweave.
- `awalkaday91-preview-inverted.jpg` — alternative inverted-colour preview,
  kept for future variants (not currently used).
