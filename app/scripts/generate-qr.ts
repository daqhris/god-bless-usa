import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import QRCode from "qrcode";

const DEFAULT_URL = "https://daqhris.com/god-bless-usa/";
const DEFAULT_OUT = "public/assets/qr/god-bless-usa.svg";

async function main() {
  const url = process.argv[2] ?? DEFAULT_URL;
  const out = resolve(process.argv[3] ?? DEFAULT_OUT);

  // Quiet zone (margin) of 2 modules satisfies most printers and scanners.
  // Error-correction level "M" (medium, ~15% recovery) is the sweet spot for
  // a clean print on a framed artifact — high enough to survive minor smudges,
  // low enough not to inflate the QR's module count and make it visually busy.
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    width: 512,
    color: { dark: "#0a0908", light: "#f9f6ef" },
  });

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, svg, "utf8");

  process.stderr.write(`generate-qr: ${url} → ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(
    `generate-qr: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
