import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

/**
 * Rasterise the typographic poster SVGs to PNG and the favicon to the
 * apple-touch-icon. Produces:
 *
 *   public/assets/poster/og-press.png        1200 × 630
 *   public/assets/poster/og-press-dark.png   1200 × 630
 *   public/assets/poster/square.png          1080 × 1080
 *   public/assets/poster/square-dark.png     1080 × 1080
 *   public/og-image.png                      1200 × 630   (overwrites the
 *                                                          ASCII-art file
 *                                                          at its stable
 *                                                          public URL — the
 *                                                          ASCII-art is
 *                                                          preserved at
 *                                                          assets/poster/
 *                                                          og-image-ascii.png
 *                                                          via a one-shot
 *                                                          git mv done by
 *                                                          this PR)
 *   public/apple-touch-icon.png              180 × 180     (from favicon.svg)
 *
 * Single dep (@resvg/resvg-js) — pure-Rust SVG renderer via napi, ~6 MB,
 * actively maintained, no dep tree. Run with `npm run export:images`.
 */

const POSTER_DIR = resolve("public/assets/poster");
const PUBLIC_DIR = resolve("public");

interface Job {
  /** Source SVG path. */
  src: string;
  /** Destination PNG path. */
  dst: string;
  /** Render width in pixels. Height comes from the SVG's intrinsic aspect. */
  width: number;
}

const JOBS: Job[] = [
  {
    src: `${POSTER_DIR}/og-press.svg`,
    dst: `${POSTER_DIR}/og-press.png`,
    width: 1200,
  },
  {
    src: `${POSTER_DIR}/og-press-dark.svg`,
    dst: `${POSTER_DIR}/og-press-dark.png`,
    width: 1200,
  },
  {
    src: `${POSTER_DIR}/square.svg`,
    dst: `${POSTER_DIR}/square.png`,
    width: 1080,
  },
  {
    src: `${POSTER_DIR}/square-dark.svg`,
    dst: `${POSTER_DIR}/square-dark.png`,
    width: 1080,
  },
  // Stable public URL — the OG image meta tag in every page points here.
  // Same content as og-press.png; copied to the canonical filename so any
  // cached or externally-shared link to /god-bless-usa/og-image.png keeps
  // resolving to the right artwork (just at the correct 1.91:1 aspect
  // now, not the 2:3 portrait the ASCII-art shipped at).
  {
    src: `${POSTER_DIR}/og-press.svg`,
    dst: `${PUBLIC_DIR}/og-image.png`,
    width: 1200,
  },
  // iOS Add-to-Home-Screen icon. The favicon already uses the bulletin
  // palette (gold ring on near-black), so 180×180 of the same SVG is the
  // right home-screen mark for visitors who land via the QR.
  {
    src: `${PUBLIC_DIR}/favicon.svg`,
    dst: `${PUBLIC_DIR}/apple-touch-icon.png`,
    width: 180,
  },
];

async function renderOne(job: Job): Promise<void> {
  const svg = await readFile(job.src, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: job.width },
    font: {
      // Match the SVG's own font-family chain. resvg-js can resolve system
      // fonts on Linux/macOS/Windows; Georgia is on every Windows install
      // and on macOS. If Georgia is unavailable on the runner, the
      // serifFamily fallback catches it.
      defaultFontFamily: "Georgia",
      loadSystemFonts: true,
      serifFamily: "Georgia",
    },
  });
  const png = resvg.render().asPng();
  await writeFile(job.dst, png);
  const kb = (png.byteLength / 1024).toFixed(1);
  process.stderr.write(
    `  ${job.src.replace(resolve("."), ".").padEnd(50)} → ${job.dst.replace(resolve("."), ".").padEnd(50)} (${kb} KB)\n`,
  );
}

async function main(): Promise<void> {
  process.stderr.write("export-images: rasterising posters and favicon\n");
  for (const job of JOBS) {
    await renderOne(job);
  }
  process.stderr.write(`export-images: ${JOBS.length} files written.\n`);
}

main().catch((err) => {
  process.stderr.write(
    `export-images: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
