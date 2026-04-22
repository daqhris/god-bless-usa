import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DirectorOutputSchema } from "./director/schema.js";
import { kokoroAdapter } from "./voices/kokoro.js";

function fail(msg: string): never {
  process.stderr.write(`render-audio: ${msg}\n`);
  process.exit(1);
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    fail("usage: tsx src/render-audio.ts <direction.json> [--out <dir>]");
  }

  const outIdx = process.argv.indexOf("--out");
  const outDir =
    outIdx !== -1 && process.argv[outIdx + 1]
      ? resolve(process.argv[outIdx + 1]!)
      : resolve("public/assets/audio");

  const raw = await readFile(resolve(jsonPath), "utf8");
  const parsed = DirectorOutputSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    fail(
      `direction JSON failed schema validation: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const result = await kokoroAdapter.render(parsed.data, { out_dir: outDir });
  process.stderr.write(
    `render-audio: done — ${result.total_duration_ms}ms across ${result.segments.length} segments.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `render-audio: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
