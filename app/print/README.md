# Print files for the Biennale frame

Two print-ready artifacts at **450 × 300 mm** (frame outer) with a **400 × 245 mm**
visible opening:

| File | Purpose | Deliverable |
|---|---|---|
| [`bulletin.html`](./bulletin.html) | Framed portal with the full story text + live QR pointing to `https://daqhris.com/god-bless-usa/`. This is the framed bulletin visitors see first. | PDF at `~/Downloads/god-bless-usa_bulletin_final.pdf` |
| [`awalkaday91-spec.html`](./awalkaday91-spec.html) | Print specification sheet for the companion photograph `awalkaday 91-2022`. Describes frame dimensions, print file specs, paper, and the positions of the three light formations in the sky. | PDF at `~/Downloads/awalkaday91_print-specification_final.pdf` |

The actual photograph file for the print shop is the source JPEG from the artist's
`awalkaday.art` archive on Arweave — the spec sheet describes how to handle it.

## Regenerating the PDFs

No Node dependencies required — Chrome's headless mode handles the print directly:

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"   # Windows

"$CHROME" --headless --disable-gpu --print-to-pdf-no-header \
  --print-to-pdf="$HOME/Downloads/god-bless-usa_bulletin_final.pdf" \
  "file:///$(pwd)/bulletin.html"

"$CHROME" --headless --disable-gpu --print-to-pdf-no-header \
  --print-to-pdf="$HOME/Downloads/awalkaday91_print-specification_final.pdf" \
  "file:///$(pwd)/awalkaday91-spec.html"
```

The HTML sources set `@page { size: 450mm 300mm; margin: 0; }` so Chrome renders at
the exact frame-outer dimensions. No scaling, no cropping.

## Design notes

**Bulletin layout.** 3-column body inside a 400 × 245 mm visible area, bleeding to
450 × 300 mm at the frame outer. Dark background (#0a0908), cream body text
(#e8e4d9), warm amber accent (#d4a869) for refrains, section headers, and the QR
frame. Serif typography (Georgia / Fraunces / Playfair Display). The QR encodes
`https://daqhris.com/god-bless-usa/` (with trailing slash — important for
asset-path resolution and to avoid the Pages 301 redirect).

**Text fidelity.** The bulletin contains the full verbatim text from
[`/story.md`](../../story.md), including the closing paragraph about the
"Hard To Pronounce Name" African kingdom that earlier drafts had truncated.
Verified line-by-line against the source during PR review.

**Print-spec layout.** Left half: visualization of the 400 × 400 mm square print
inside the 450 × 300 mm frame, with the visible 400 × 245 mm window highlighted
and the three light formations marked at their measured positions. Right half:
technical specs in four sections (Frame / Print File / Paper / Three Light
Formations / Authorship). Footer: four weblinks + pavilion credit.

**Three light coordinates.** Measured directly from the 4906 × 4906 px Arweave
source using a Python script (`scipy.ndimage` connected components on a
background-subtracted sky mask). All three lights sit inside the visible window
once framed:

| Light | In 400 × 400 mm print | Character |
|---|---|---|
| A — small bright dot (top)    | 99.5 mm L · 146.4 mm T | Single pixel cluster |
| B — diagonal contrail (centre) | 114.8 mm L · 195.7 mm T | Long bright streak |
| C — vertical streak (right)    | 273.6 mm L · 206.6 mm T | Short bright line |

Triangular arrangement reminiscent of the three stars on Burundi's flag.
