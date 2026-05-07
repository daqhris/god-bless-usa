import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// PNG icon sizes needed by the web app manifest. iOS already has
// apple-touch-icon.png (180×180) shipped separately; these two cover
// Android's install prompt + maskable rendering. The SVG's design fills
// only the inner ~56% of its viewBox, well within Android's maskable
// safe zone, so a single icon set serves both "any" and "maskable" uses.
const SIZES = [192, 512];

async function main(): Promise<void> {
  const svg_path = resolve("public/favicon.svg");
  const svg = await readFile(svg_path);
  for (const size of SIZES) {
    const out_path = resolve(`public/icon-${size}.png`);
    const png = new Resvg(svg, { fitTo: { mode: "width", value: size } })
      .render()
      .asPng();
    await writeFile(out_path, png);
    process.stderr.write(`make-icons: wrote ${out_path} (${png.length} bytes)\n`);
  }
}

main().catch((err) => {
  process.stderr.write(
    `make-icons: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
