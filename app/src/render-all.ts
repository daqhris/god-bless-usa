import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, basename, extname, join } from "node:path";
import { directScene } from "./director/index.js";
import { kokoroAdapter } from "./voices/kokoro.js";

function fail(msg: string): never {
  process.stderr.write(`render-all: ${msg}\n`);
  process.exit(1);
}

async function main() {
  const scenePath = process.argv[2];
  if (!scenePath) {
    fail("usage: tsx src/render-all.ts <scene.md> [--audio-out <dir>] [--direction-out <dir>]");
  }

  const audioIdx = process.argv.indexOf("--audio-out");
  const audioOut =
    audioIdx !== -1 && process.argv[audioIdx + 1]
      ? resolve(process.argv[audioIdx + 1]!)
      : resolve("public/assets/audio");

  const dirIdx = process.argv.indexOf("--direction-out");
  const directionOut =
    dirIdx !== -1 && process.argv[dirIdx + 1]
      ? resolve(process.argv[dirIdx + 1]!)
      : resolve("dist/directions");

  const absoluteScenePath = resolve(scenePath);
  const sceneText = await readFile(absoluteScenePath, "utf8");
  const sceneId = basename(absoluteScenePath, extname(absoluteScenePath));

  if (!process.env.ANTHROPIC_API_KEY) {
    fail("ANTHROPIC_API_KEY is not set. Copy app/.env.example to app/.env.");
  }

  const client = new Anthropic();

  process.stderr.write(`render-all: step 1/2 — directing "${sceneId}" with Opus 4.7…\n`);
  const { output, usage } = await directScene(client, {
    scene_id: sceneId,
    scene_text: sceneText,
  });

  await mkdir(directionOut, { recursive: true });
  const jsonPath = join(directionOut, `${sceneId}.json`);
  await writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
  process.stderr.write(
    `render-all: direction saved (${output.segments.length} segments, ` +
      `tokens in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cache_read=${usage.cache_read_input_tokens}).\n`,
  );

  process.stderr.write(`render-all: step 2/2 — rendering audio with Kokoro…\n`);
  const rendered = await kokoroAdapter.render(output, { out_dir: audioOut });

  process.stderr.write(
    `render-all: done — ${rendered.total_duration_ms}ms audio at ${join(audioOut, sceneId)}.wav\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `render-all: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
