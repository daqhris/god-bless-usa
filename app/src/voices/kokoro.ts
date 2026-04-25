import { KokoroTTS } from "kokoro-js";
import type { VoiceAdapter, RenderedScene } from "./adapter.js";
import type { DirectorOutput } from "../director/schema.js";
import { tokenizeSsml } from "./ssml.js";
import { concat, readWav, silence, writeWav, type Pcm } from "./wav.js";
import { mix } from "./mix.js";
import {
  synthesizeOrganDrone,
  synthesizeBellToll,
  synthesizeBellThenDrone,
} from "./ambient.js";
import {
  synthesizeTypewriterBed,
  EYEWITNESS_UNDERLAY_GAIN,
  EYEWITNESS_UNDERLAY_TAIL_MS,
} from "./underlay.js";
import {
  synthesizeTrainBed,
  synthesizeHeartBed,
  synthesizeGutBed,
  SIGNAL_BED_GAIN,
  SIGNAL_BED_TAIL_MS,
} from "./signal-beds.js";
import { applyReverb } from "./reverb.js";
import type { Segment } from "../director/schema.js";
import {
  CHORUS_ENSEMBLE,
  FULL_ENSEMBLE,
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

// Real Vatican bells (CC-BY 4.0, everythingsounds on Freesound). Optional —
// when the prepared WAV is present it replaces the synthesized peal in
// Scene 0. Loaded once per render and reused if other scenes ever call
// `bell_then_drone`.
const REAL_BELL_PATH = "public/assets/audio/source/rome-vatican-bells-25s.wav";
let realBells: Pcm | null = null;
let realBellsLoaded = false;
async function loadRealBells(): Promise<Pcm | null> {
  if (realBellsLoaded) return realBells;
  realBellsLoaded = true;
  try {
    realBells = await readWav(REAL_BELL_PATH);
    process.stderr.write(
      `kokoro: loaded real bell sample (${REAL_BELL_PATH}).\n`,
    );
  } catch {
    realBells = null;
    process.stderr.write(
      `kokoro: no real bell sample at ${REAL_BELL_PATH} — using synthesized peal.\n`,
    );
  }
  return realBells;
}

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

function clampSpeed(s: number): number {
  if (!Number.isFinite(s)) return 1;
  return Math.max(0.5, Math.min(2, s));
}

/**
 * Pre-scan segments to tag praying-alien segments with the signal they
 * inhabit. The score's three signal headers ("Signal one. Train of
 * Thoughts." etc.) are voiced by the eyewitness; the following
 * praying-alien speech gets a corresponding ambient bed underneath.
 * Returns a map: segment index → signal kind.
 */
type SignalKind = "train" | "heart" | "gut";
function mapSignalBeds(segments: Segment[]): Map<number, SignalKind> {
  const out = new Map<number, SignalKind>();
  let pending: SignalKind | null = null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (seg.type === "speech" && seg.voice === "eyewitness") {
      const text = seg.ssml.toLowerCase();
      if (text.includes("train of thoughts")) pending = "train";
      else if (text.includes("heart pulse")) pending = "heart";
      else if (text.includes("gut feeling")) pending = "gut";
      continue;
    }
    if (seg.type === "speech" && seg.voice === "praying_alien" && pending) {
      out.set(i, pending);
      pending = null;
    }
  }
  return out;
}

async function renderSpeech(
  tts: KokoroTTS,
  voice_id: string,
  ssml: string,
  base_speed: number,
): Promise<Pcm> {
  const tokens = tokenizeSsml(ssml);
  const chunks: Pcm[] = [];
  for (const tok of tokens) {
    if (tok.type === "break") {
      chunks.push(silence(tok.ms, KOKORO_SAMPLE_RATE));
      continue;
    }
    const effective_speed = clampSpeed(base_speed * tok.speed_factor);
    const audio = await tts.generate(tok.text, {
      voice: voice_id as NonNullable<
        Parameters<KokoroTTS["generate"]>[1]
      >["voice"],
      speed: effective_speed,
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
    const signal_beds = mapSignalBeds(direction.segments);

    for (const [seg_index, seg] of direction.segments.entries()) {
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
        let pcm: Pcm;
        let kind_label = seg.kind;
        switch (seg.kind) {
          case "bell":
            pcm = synthesizeBellToll(seg.duration_ms, KOKORO_SAMPLE_RATE);
            break;
          case "bell_then_drone": {
            const bells = await loadRealBells();
            pcm = synthesizeBellThenDrone(
              seg.duration_ms,
              KOKORO_SAMPLE_RATE,
              bells ?? undefined,
            );
            break;
          }
          case "drone":
          default:
            pcm = synthesizeOrganDrone(seg.duration_ms, KOKORO_SAMPLE_RATE);
            kind_label = "drone";
        }
        pcm_segments.push(pcm);
        rendered.push({
          segment: seg,
          audio_path: `<synthesized-${kind_label}>`,
          duration_ms: seg.duration_ms,
        });
        continue;
      }

      let pcm: Pcm;
      const base_speed = clampSpeed(seg.speed ?? 1);
      if (seg.voice === "chorus") {
        // Layer the ensemble: render the same SSML through each voice and sum
        // with small timing offsets to produce choral texture.
        const lanes = [];
        for (const member of CHORUS_ENSEMBLE) {
          const member_pcm = await renderSpeech(
            tts,
            member.voice_id,
            seg.ssml,
            base_speed,
          );
          lanes.push({ pcm: member_pcm, offset_ms: member.offset_ms });
        }
        pcm = mix(lanes);
      } else if (seg.voice === "full_ensemble") {
        // FULL ENSEMBLE — every voice together. Used for AMEN and HUGS.
        // Renders through every lane in FULL_ENSEMBLE (priest + chorus +
        // praying alien) with weighted gains so the leader anchors and the
        // alien is audibly present without dominating.
        const lanes = [];
        for (const member of FULL_ENSEMBLE) {
          const member_pcm = await renderSpeech(
            tts,
            member.voice_id,
            seg.ssml,
            base_speed,
          );
          lanes.push({
            pcm: member_pcm,
            offset_ms: member.offset_ms,
            gain: member.gain,
          });
        }
        pcm = mix(lanes);
      } else {
        const voice_id = KOKORO_VOICE_MAP[seg.voice];
        if (!voice_id) {
          throw new Error(`No Kokoro voice mapped for "${seg.voice}".`);
        }
        pcm = await renderSpeech(tts, voice_id, seg.ssml, base_speed);

        // EYEWITNESS gets a typewriter bed — the report is being typed as it
        // is transmitted. The bed extends a tail past the last word so the
        // keystrokes bridge into the inter-scene silence / next scene.
        if (seg.voice === "eyewitness") {
          const voice_ms = Math.round(
            (pcm.samples.length / pcm.sample_rate) * 1000,
          );
          const bed = synthesizeTypewriterBed(
            voice_ms + EYEWITNESS_UNDERLAY_TAIL_MS,
            KOKORO_SAMPLE_RATE,
          );
          pcm = mix([
            { pcm, offset_ms: 0, gain: 1 },
            { pcm: bed, offset_ms: 0, gain: EYEWITNESS_UNDERLAY_GAIN },
          ]);
        }

        // PRAYING ALIEN in Scene IX's three signals gets an interior ambient
        // bed beneath the voice — train chuff, heart pulse, or gut rumble.
        // Low gain: the bed is the mind's texture, never foreground.
        const signal = signal_beds.get(seg_index);
        if (seg.voice === "praying_alien" && signal) {
          const voice_ms = Math.round(
            (pcm.samples.length / pcm.sample_rate) * 1000,
          );
          const bed_ms = voice_ms + SIGNAL_BED_TAIL_MS;
          const bed =
            signal === "train"
              ? synthesizeTrainBed(bed_ms, KOKORO_SAMPLE_RATE)
              : signal === "heart"
                ? synthesizeHeartBed(bed_ms, KOKORO_SAMPLE_RATE)
                : synthesizeGutBed(bed_ms, KOKORO_SAMPLE_RATE);
          pcm = mix([
            { pcm, offset_ms: 0, gain: 1 },
            { pcm: bed, offset_ms: 0, gain: SIGNAL_BED_GAIN },
          ]);
        }
      }

      // Post-processing reverb per the director's room assignment for this
      // segment. Applied after all voice paths (single, chorus ensemble,
      // full ensemble) so chorus refrains pick up the "heavy" cathedral
      // tail the director asks for. `dry_close: true` collapses to "none"
      // even if a reverb preset is named — the acoustic has contracted to
      // close-mic and any room sound would contradict that.
      if (seg.type === "speech") {
        const reverb_kind = seg.post_processing.dry_close
          ? "none"
          : seg.post_processing.reverb;
        pcm = applyReverb(pcm, reverb_kind);
      }

      pcm_segments.push(pcm);
      const duration_ms = Math.round(
        (pcm.samples.length / pcm.sample_rate) * 1000,
      );
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
