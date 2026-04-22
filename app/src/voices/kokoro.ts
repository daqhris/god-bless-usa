import { KokoroTTS } from "kokoro-js";
import type { VoiceAdapter, RenderedScene } from "./adapter.js";
import type { DirectorOutput } from "../director/schema.js";
import { tokenizeSsml } from "./ssml.js";
import { concat, silence, writeWav, type Pcm } from "./wav.js";
import {
  KOKORO_MODEL_ID,
  KOKORO_SAMPLE_RATE,
  KOKORO_VOICE_MAP,
} from "./voice-map.js";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";

// kokoro-js 1.2.x loads bundled voice files with a path that depends on
// `import.meta.dirname`, which lands in Node 20.11. On older Node 20.x it's
// undefined and `path.resolve(undefined, '../voices/…')` throws. The library
// also checks `typeof __dirname !== "undefined"` first — setting a global
// `__dirname` pointing at the kokoro-js dist directory satisfies that branch.
// Upstream fix is a Node upgrade (engines declares >=20.11); this shim keeps
// things working in between.
const _g = globalThis as typeof globalThis & { __dirname?: string };
if (typeof _g.__dirname === "undefined") {
  const require = createRequire(import.meta.url);
  const kokoroEntry = require.resolve("kokoro-js");
  _g.__dirname = dirname(kokoroEntry);
}

let cached: KokoroTTS | null = null;

async function loadTts(): Promise<KokoroTTS> {
  if (cached) return cached;
  process.stderr.write(
    `kokoro: loading ${KOKORO_MODEL_ID} (first run downloads ~80MB)…\n`,
  );
  cached = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
    dtype: "q8",
    device: "cpu",
  });
  process.stderr.write(`kokoro: model ready.\n`);
  return cached;
}

async function renderSpeech(
  tts: KokoroTTS,
  voice_id: string,
  ssml: string,
): Promise<Pcm> {
  const tokens = tokenizeSsml(ssml);
  const chunks: Pcm[] = [];
  for (const tok of tokens) {
    if (tok.type === "break") {
      chunks.push(silence(tok.ms, KOKORO_SAMPLE_RATE));
      continue;
    }
    const audio = await tts.generate(tok.text, {
      // Voice IDs come from a static map in voice-map.ts; kokoro-js types the
      // voice as a keyof-union, which our string value matches at runtime.
      voice: voice_id as NonNullable<
        Parameters<KokoroTTS["generate"]>[1]
      >["voice"],
      speed: 1,
    });
    const samples =
      audio.audio instanceof Float32Array
        ? audio.audio
        : new Float32Array(audio.audio);
    chunks.push({ samples, sample_rate: audio.sampling_rate });
  }
  return concat(chunks);
}

export const kokoroAdapter: VoiceAdapter = {
  id: "kokoro-82m",
  licence: "Apache-2.0",

  async render(
    direction: DirectorOutput,
    opts: { out_dir: string },
  ): Promise<RenderedScene> {
    const tts = await loadTts();
    await mkdir(opts.out_dir, { recursive: true });

    const rendered = [];
    const pcm_segments: Pcm[] = [];

    for (const seg of direction.segments) {
      if (seg.type === "silence") {
        const pcm = silence(seg.duration_ms, KOKORO_SAMPLE_RATE);
        pcm_segments.push(pcm);
        rendered.push({
          segment: seg,
          audio_path: "<inline-silence>",
          duration_ms: seg.duration_ms,
        });
        continue;
      }

      if (seg.type === "ambient") {
        process.stderr.write(
          `kokoro: ambient cue "${seg.cue}" skipped (PR #3 will wire ambient assets). Inserting silence ${seg.duration_ms}ms.\n`,
        );
        const pcm = silence(seg.duration_ms, KOKORO_SAMPLE_RATE);
        pcm_segments.push(pcm);
        rendered.push({
          segment: seg,
          audio_path: "<skipped-ambient>",
          duration_ms: seg.duration_ms,
        });
        continue;
      }

      const voice_id = KOKORO_VOICE_MAP[seg.voice];
      if (!voice_id) {
        throw new Error(`No Kokoro voice mapped for "${seg.voice}".`);
      }
      const pcm = await renderSpeech(tts, voice_id, seg.ssml);
      pcm_segments.push(pcm);
      const duration_ms = Math.round((pcm.samples.length / pcm.sample_rate) * 1000);
      rendered.push({
        segment: seg,
        audio_path: "<inline>",
        duration_ms,
      });
    }

    const full = concat(pcm_segments);
    const out_path = join(opts.out_dir, `${direction.scene_id}.wav`);
    await writeWav(out_path, full);

    const total_duration_ms = Math.round(
      (full.samples.length / full.sample_rate) * 1000,
    );

    process.stderr.write(
      `kokoro: wrote ${out_path} (${total_duration_ms}ms, ${rendered.length} segments).\n`,
    );

    return {
      scene_id: direction.scene_id,
      segments: rendered.map((r) => ({ ...r, audio_path: out_path })),
      total_duration_ms,
    };
  },
};
