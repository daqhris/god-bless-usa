import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, basename, extname, dirname, join } from "node:path";
import { directScene } from "./director/index.js";

function fail(msg: string): never {
  process.stderr.write(`render: ${msg}\n`);
  process.exit(1);
}

async function main() {
  const scenePath = process.argv[2];
  if (!scenePath) {
    fail("usage: tsx src/render.ts <scene.md> [--out <dir>]");
  }

  const outIdx = process.argv.indexOf("--out");
  const outDir =
    outIdx !== -1 && process.argv[outIdx + 1]
      ? resolve(process.argv[outIdx + 1]!)
      : resolve("dist/directions");

  const absoluteScenePath = resolve(scenePath);
  const sceneText = await readFile(absoluteScenePath, "utf8");
  const sceneId = basename(absoluteScenePath, extname(absoluteScenePath));

  if (!process.env.ANTHROPIC_API_KEY) {
    fail("ANTHROPIC_API_KEY is not set. Copy app/.env.example to app/.env.");
  }

  const client = new Anthropic();

  process.stderr.write(`render: directing scene "${sceneId}"…\n`);
  const { output, usage } = await directScene(client, {
    scene_id: sceneId,
    scene_text: sceneText,
  });

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${sceneId}.json`);
  await writeFile(outPath, JSON.stringify(output, null, 2), "utf8");

  process.stderr.write(
    `render: wrote ${outPath}  (${output.segments.length} segments)\n`,
  );
  process.stderr.write(
    `render: tokens in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cache_read=${usage.cache_read_input_tokens} ` +
      `cache_write=${usage.cache_creation_input_tokens}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`render: error — ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
