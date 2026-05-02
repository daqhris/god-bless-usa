import { resolve, join } from "node:path";
import {
  concat,
  readWav,
  silence,
  writeWav,
  type Pcm,
} from "../src/voices/wav.js";

/**
 * Build the promotional audio trailer — two outputs from one source list:
 *
 *   trailer.wav         ~60s primary teaser ("avant-goût") — Instagram
 *                       Reels, social embeds, press-kit "first taste."
 *   trailer-bumper.wav  ~30s tighter cut — Stories, Reels cover, quick
 *                       reveal where attention is shorter.
 *
 * Approach: slice the existing per-scene WAVs (which already carry reverb,
 * underlay, signal beds — exactly what the visitor hears at the master) at
 * timestamps derived empirically from silence detection on the rendered
 * audio (see scripts/scan-silences.ts). For one beat where slicing fails
 * cleanly (Scene IX has continuous signal beds that mask silence
 * detection inside its long Train-of-Thoughts SSML block), the fragment
 * is re-rendered standalone via render-trailer-fragments.ts and read
 * from dist/trailer-fragments/.
 *
 * Hard cuts on acoustic shifts (heavy-reverb chorus → dry praying alien),
 * small fades inside fragments to avoid clicks, ~2s of true silence at
 * the end so the loop boundary on Meta / Instagram lands inside silence
 * rather than mid-decay.
 *
 * Workflow:
 *   1. npm run render:trailer-fragments   (only when fragment SSML changes)
 *   2. npm run build:trailer               (every iteration)
 *   3. npm run encode:audio -- public/assets/audio/trailer.wav
 *   4. npm run encode:audio -- public/assets/audio/trailer-bumper.wav
 *
 * To nudge a beat: edit its start_ms / end_ms below, run build:trailer,
 * audition. Constants are named so the diff reads as a score.
 */

const SCENE_DIR = resolve("public/assets/audio");
const FRAGMENT_DIR = resolve("dist/trailer-fragments");
const SR = 24000;

const DEFAULT_FADE_IN_MS = 200;
const DEFAULT_FADE_OUT_MS = 200;

interface Beat {
  /**
   * Where the audio comes from. "scene" reads from public/assets/audio/.
   * "fragment" reads from dist/trailer-fragments/ (Kokoro re-renders).
   */
  source: "scene" | "fragment";
  name: string;
  start_ms: number;
  end_ms: number;
  fade_in_ms?: number;
  fade_out_ms?: number;
  note: string;
}

// ---- Primary teaser — six-beat narrative arc ----
const PRIMARY: Beat[] = [
  {
    source: "scene",
    name: "00-opening",
    start_ms: 0,
    end_ms: 9500,
    fade_in_ms: 0,
    fade_out_ms: 600,
    note: "Cathedral entry — bell peal + chorus premonition entering. Cold start.",
  },
  {
    source: "scene",
    name: "00-opening",
    start_ms: 18500,
    end_ms: 33000,
    fade_in_ms: 250,
    fade_out_ms: 500,
    note: 'The work names itself — "Alien Report. December 24, 2024. God Bless The United States Of Aliens." Spans segments 3-7 (after the chorus reverb and silence segment 2; before the "An All-Seeing" subtitle).',
  },
  {
    source: "scene",
    name: "02-chorus-first",
    start_ms: 9500,
    end_ms: 22000,
    fade_in_ms: 1000,
    fade_out_ms: 800,
    note: 'Chorus refrain — last clauses of segment 0 ("...to hard-wire loving thoughts | into our") + segment 1 ("brains.") + tail. The 1000ms fade-in masks the mid-utterance start so the listener arrives inside the line, not at "brains" alone.',
  },
  {
    source: "fragment",
    name: "beat-4-skies",
    start_ms: 200,
    end_ms: 10800,
    fade_in_ms: 250,
    fade_out_ms: 500,
    note: 'Praying alien interior — re-rendered standalone for the trailer. "Skies, like flashlights flickering on screens, are lit up by unknown and unidentified beings!" Dry close, no reverb, no signal bed. The acoustic break with the heavy-reverb chorus is the gold.',
  },
  {
    source: "scene",
    name: "11-church-leader-prayer",
    start_ms: 204500,
    end_ms: 212500,
    fade_in_ms: 250,
    fade_out_ms: 400,
    note: 'Sermon question — "Are there other kinds of sweetened gifts | that are not yet deliverable through screens?" The preacher turns the question outward.',
  },
  {
    source: "scene",
    name: "08-church-leader-amen",
    start_ms: 32500,
    end_ms: 41500,
    fade_in_ms: 250,
    fade_out_ms: 1500,
    note: "AMEN — full ensemble, six lanes summed, heavy reverb. Held, then dissolves. The teaser ends on its decay tail.",
  },
];

const PRIMARY_OUTRO_SILENCE_MS = 2000;

// ---- 30-second bumper — bell peal → chorus → AMEN ----
const BUMPER: Beat[] = [
  {
    source: "scene",
    name: "00-opening",
    start_ms: 0,
    end_ms: 7500,
    fade_in_ms: 0,
    fade_out_ms: 600,
    note: "Cathedral entry, truncated — bell peal alone, fade out before the chorus enters.",
  },
  {
    source: "scene",
    name: "02-chorus-first",
    start_ms: 9500,
    end_ms: 22000,
    fade_in_ms: 1000,
    fade_out_ms: 800,
    note: "Chorus refrain — same window as the primary teaser.",
  },
  {
    source: "scene",
    name: "08-church-leader-amen",
    start_ms: 32500,
    end_ms: 41500,
    fade_in_ms: 250,
    fade_out_ms: 1500,
    note: "AMEN — same window as the primary teaser.",
  },
];

const BUMPER_OUTRO_SILENCE_MS = 2000;

function slice(pcm: Pcm, start_ms: number, end_ms: number): Pcm {
  const sr = pcm.sample_rate;
  const start = Math.max(0, Math.floor((start_ms * sr) / 1000));
  const end = Math.min(pcm.samples.length, Math.floor((end_ms * sr) / 1000));
  if (end <= start) {
    throw new Error(
      `slice: empty or inverted range ${start_ms}..${end_ms} on a ${pcm.samples.length / sr}s source`,
    );
  }
  return { samples: pcm.samples.slice(start, end), sample_rate: sr };
}

function applyFades(pcm: Pcm, fade_in_ms: number, fade_out_ms: number): Pcm {
  const samples = new Float32Array(pcm.samples);
  const sr = pcm.sample_rate;
  const fi = Math.min(samples.length, Math.floor((fade_in_ms * sr) / 1000));
  const fo = Math.min(samples.length, Math.floor((fade_out_ms * sr) / 1000));
  for (let i = 0; i < fi; i++) {
    samples[i]! *= i / fi;
  }
  for (let i = 0; i < fo; i++) {
    samples[samples.length - 1 - i]! *= i / fo;
  }
  return { samples, sample_rate: sr };
}

function pathFor(beat: Beat): string {
  return beat.source === "fragment"
    ? join(FRAGMENT_DIR, `${beat.name}.wav`)
    : join(SCENE_DIR, `${beat.name}.wav`);
}

async function buildOne(
  beats: readonly Beat[],
  outro_silence_ms: number,
  out_path: string,
): Promise<void> {
  const cache = new Map<string, Pcm>();
  const parts: Pcm[] = [];

  for (const [idx, beat] of beats.entries()) {
    const path = pathFor(beat);
    if (!cache.has(path)) {
      cache.set(path, await readWav(path));
    }
    const fragment = slice(cache.get(path)!, beat.start_ms, beat.end_ms);
    const faded = applyFades(
      fragment,
      beat.fade_in_ms ?? DEFAULT_FADE_IN_MS,
      beat.fade_out_ms ?? DEFAULT_FADE_OUT_MS,
    );
    parts.push(faded);
    const dur_s = ((beat.end_ms - beat.start_ms) / 1000).toFixed(1);
    process.stderr.write(
      `  beat ${idx + 1}  ${beat.source.padEnd(8)} ${beat.name.padEnd(28)} ${beat.start_ms
        .toString()
        .padStart(7)}–${beat.end_ms.toString().padStart(7)} ms  (${dur_s}s)\n`,
    );
  }

  parts.push(silence(outro_silence_ms, SR));
  const merged = concat(parts);
  await writeWav(out_path, merged);

  const dur_s = (merged.samples.length / merged.sample_rate).toFixed(1);
  process.stderr.write(`build-trailer: wrote ${out_path} (${dur_s}s)\n\n`);
}

async function main(): Promise<void> {
  process.stderr.write("build-trailer: primary teaser\n");
  await buildOne(
    PRIMARY,
    PRIMARY_OUTRO_SILENCE_MS,
    join(SCENE_DIR, "trailer.wav"),
  );
  process.stderr.write("build-trailer: 30-second bumper\n");
  await buildOne(
    BUMPER,
    BUMPER_OUTRO_SILENCE_MS,
    join(SCENE_DIR, "trailer-bumper.wav"),
  );
}

main().catch((err) => {
  process.stderr.write(
    `build-trailer: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
