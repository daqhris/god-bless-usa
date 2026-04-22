import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, basename, extname, join } from "node:path";
import { directScene } from "./director/index.js";
import { kokoroAdapter } from "./voices/kokoro.js";
import { KOKORO_SAMPLE_RATE } from "./voices/voice-map.js";
import { concat, silence, writeWav, type Pcm } from "./voices/wav.js";

interface Args {
  scenes_dir: string;
  audio_out: string;
  direction_out: string;
  concat_out: string | null;
  inter_scene_gap_ms: number;
  include_coda: boolean;
}

function parse_args(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i !== -1 ? argv[i + 1] ?? null : null;
  };
  const has = (flag: string) => argv.includes(flag);

  return {
    scenes_dir: resolve(get("--scenes") ?? "scenes"),
    audio_out: resolve(get("--audio-out") ?? "public/assets/audio"),
    direction_out: resolve(get("--direction-out") ?? "dist/directions"),
    concat_out: has("--no-master")
      ? null
      : resolve(get("--master-out") ?? "public/assets/audio/god-bless-usa.wav"),
    inter_scene_gap_ms: Number(get("--gap-ms") ?? "1500"),
    include_coda: has("--include-coda"),
  };
}

function fail(msg: string): never {
  process.stderr.write(`render-all-scenes: ${msg}\n`);
  process.exit(1);
}

async function listSceneFiles(dir: string, include_coda: boolean) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(dir, e.name))
    .filter((path) => include_coda || !basename(path).startsWith("14-"))
    .sort();
}

async function main() {
  const args = parse_args();

  if (!process.env.ANTHROPIC_API_KEY) {
    fail("ANTHROPIC_API_KEY is not set. Copy app/.env.example to app/.env.");
  }

  const scene_paths = await listSceneFiles(args.scenes_dir, args.include_coda);
  if (scene_paths.length === 0) {
    fail(`no *.md scenes found in ${args.scenes_dir}`);
  }

  process.stderr.write(
    `render-all-scenes: ${scene_paths.length} scene(s) queued from ${args.scenes_dir}.\n`,
  );

  await mkdir(args.direction_out, { recursive: true });
  await mkdir(args.audio_out, { recursive: true });

  const client = new Anthropic();
  const rendered_pcms: Pcm[] = [];
  let total_input = 0;
  let total_output = 0;
  let total_cache_read = 0;
  let total_cache_written = 0;

  for (const [idx, scene_path] of scene_paths.entries()) {
    const scene_id = basename(scene_path, extname(scene_path));
    const scene_text = await readFile(scene_path, "utf8");

    process.stderr.write(
      `\n[${idx + 1}/${scene_paths.length}] directing ${scene_id}…\n`,
    );
    const { output, usage } = await directScene(client, {
      scene_id,
      scene_text,
    });
    total_input += usage.input_tokens;
    total_output += usage.output_tokens;
    total_cache_read += usage.cache_read_input_tokens;
    total_cache_written += usage.cache_creation_input_tokens;

    const json_path = join(args.direction_out, `${scene_id}.json`);
    await writeFile(json_path, JSON.stringify(output, null, 2), "utf8");

    process.stderr.write(
      `    director: ${output.segments.length} segments, tokens in=${usage.input_tokens} out=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens}.\n`,
    );

    const result = await kokoroAdapter.render(output, {
      out_dir: args.audio_out,
    });
    process.stderr.write(
      `    kokoro:   ${result.total_duration_ms}ms @ ${args.audio_out}/${scene_id}.wav.\n`,
    );

    // Re-read the saved PCM from the concatenated per-scene buffer isn't exposed
    // by the adapter — rebuild the master on the fly by re-rendering is wasteful.
    // We reload from the freshly written WAV file via a small helper instead.
    const reread = await loadWav(join(args.audio_out, `${scene_id}.wav`));
    rendered_pcms.push(reread);
    if (idx < scene_paths.length - 1) {
      rendered_pcms.push(silence(args.inter_scene_gap_ms, KOKORO_SAMPLE_RATE));
    }
  }

  process.stderr.write(
    `\nrender-all-scenes: totals — in=${total_input} out=${total_output} cache_read=${total_cache_read} cache_written=${total_cache_written}.\n`,
  );

  if (args.concat_out) {
    const master = concat(rendered_pcms);
    await writeWav(args.concat_out, master);
    const total_ms = Math.round(
      (master.samples.length / master.sample_rate) * 1000,
    );
    process.stderr.write(
      `render-all-scenes: master wrote ${args.concat_out} (${Math.round(total_ms / 1000)}s).\n`,
    );
  }
}

// Minimal WAV reader — only what we need (16-bit PCM mono, matches our writer).
async function loadWav(path: string): Promise<Pcm> {
  const buf = await readFile(path);
  // RIFF chunk header at offset 0; data chunk after the 44-byte header.
  const sample_rate = buf.readUInt32LE(24);
  const bits_per_sample = buf.readUInt16LE(34);
  if (bits_per_sample !== 16) {
    throw new Error(`loadWav: expected 16-bit PCM, got ${bits_per_sample}-bit`);
  }
  const data_size = buf.readUInt32LE(40);
  const n = data_size / 2;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    samples[i] = buf.readInt16LE(44 + i * 2) / 32767;
  }
  return { samples, sample_rate };
}

main().catch((err) => {
  process.stderr.write(
    `render-all-scenes: error — ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});
