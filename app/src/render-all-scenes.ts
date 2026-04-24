import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, basename, extname, join } from "node:path";
import { directScene } from "./director/index.js";
import { DEFAULT_PLAYLIST } from "./playlist.js";
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
  playlist_path: string | null;
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
    // 3-second default gives each scene acoustic room to breathe and leaves
    // deliberate negative space for later soundscape layers. Override via
    // --gap-ms N for tighter or looser pacing.
    inter_scene_gap_ms: Number(get("--gap-ms") ?? "3000"),
    // Coda ships by default — it closes the surveillance loop. --no-coda opts out.
    include_coda: !has("--no-coda"),
    playlist_path: get("--playlist"),
  };
}

function fail(msg: string): never {
  process.stderr.write(`render-all-scenes: ${msg}\n`);
  process.exit(1);
}

async function loadPlaylist(
  dir: string,
  playlist_path: string | null,
  include_coda: boolean,
): Promise<string[]> {
  let ids: string[];
  if (playlist_path) {
    const raw = await readFile(resolve(playlist_path), "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
      fail(
        `--playlist ${playlist_path}: expected a JSON array of scene-id strings`,
      );
    }
    ids = parsed;
  } else {
    ids = [...DEFAULT_PLAYLIST];
  }
  if (!include_coda) {
    ids = ids.filter((id) => id !== "14-coda");
  }

  // Verify each playlist entry corresponds to a real scene file.
  const resolved: string[] = [];
  for (const id of ids) {
    const path = join(dir, `${id}.md`);
    try {
      await stat(path);
    } catch {
      fail(`playlist entry "${id}" has no matching scene file at ${path}`);
    }
    resolved.push(path);
  }
  return resolved;
}

async function main() {
  const args = parse_args();

  if (!process.env.ANTHROPIC_API_KEY) {
    fail("ANTHROPIC_API_KEY is not set. Copy app/.env.example to app/.env.");
  }

  const scene_paths = await loadPlaylist(
    args.scenes_dir,
    args.playlist_path,
    args.include_coda,
  );
  if (scene_paths.length === 0) {
    fail(`playlist is empty after --no-coda filtering`);
  }

  process.stderr.write(
    `render-all-scenes: playlist of ${scene_paths.length} scene(s) from ${args.scenes_dir}.\n`,
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

// Entrypoint guard — running as a CLI invokes the pipeline, but a stray
// `import { … } from "./render-all-scenes.js"` anywhere else in the codebase
// must NOT auto-dispatch a full render (which would eat Anthropic credits
// and overwrite scene WAVs mid-edit).
import { fileURLToPath } from "node:url";
const is_entrypoint =
  !!process.argv[1] &&
  resolve(process.argv[1]!) === resolve(fileURLToPath(import.meta.url));

if (is_entrypoint) {
  main().catch((err) => {
    process.stderr.write(
      `render-all-scenes: error — ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
