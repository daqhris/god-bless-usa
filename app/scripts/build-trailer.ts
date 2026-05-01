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
 * approximate timestamps, apply small fades to soften edges, hard-cut on
 * acoustic shifts (heavy-reverb chorus → dry praying alien), close on a
 * couple of seconds of true silence so the loop boundary on Meta /
 * Instagram lands clean.
 *
 * Timestamps are tunable. Audition the output, nudge a constant by 100-300
 * ms, re-run. No re-render needed; this script reads PCM, slices, fades,
 * concatenates, writes. Runs in seconds.
 */

const SCENE_DIR = resolve("public/assets/audio");
const SR = 24000;

// Default 200ms fades on the leading/trailing edge of each fragment to
// avoid sample-boundary clicks. Per-beat overrides below.
const DEFAULT_FADE_IN_MS = 200;
const DEFAULT_FADE_OUT_MS = 200;

interface Beat {
  scene: string;
  start_ms: number;
  end_ms: number;
  fade_in_ms?: number;
  fade_out_ms?: number;
  /** One-line note, kept here so the cut-list reads as a score. */
  note: string;
}

// ---- Primary teaser — six-beat narrative arc ----
//
// Traverses the four voices and the three frames of the alien (cosmic /
// legal / technological), in the same order the master traverses them but
// at ~18:1 compression. Hard cuts on acoustic shifts; small fades on edges.
const PRIMARY: Beat[] = [
  {
    scene: "00-opening",
    start_ms: 0,
    end_ms: 11000,
    fade_in_ms: 0,
    fade_out_ms: 600,
    note: "Cathedral entry — bell peal + chorus premonition. Cold start, no fade-in; the first sound is the first toll.",
  },
  {
    scene: "00-opening",
    start_ms: 13000,
    end_ms: 24500,
    fade_out_ms: 400,
    note: 'The work names itself — "Alien Report. December 24, 2024. God Bless The United States Of Aliens." with typewriter underlay.',
  },
  {
    scene: "02-chorus-first",
    start_ms: 15500,
    end_ms: 23500,
    fade_out_ms: 800,
    note: 'Chorus refrain — "...will be chosen | to hard-wire loving thoughts | into our brains." Heavy cathedral reverb, four-voice ensemble.',
  },
  {
    scene: "09-praying-alien",
    start_ms: 21000,
    end_ms: 28500,
    fade_out_ms: 400,
    note: 'Praying alien interior — "Skies, like flashlights flickering on screens, are lit up by unknown and unidentified beings!" Dry close, no reverb. The acoustic break with the chorus is the gold.',
  },
  {
    scene: "11-church-leader-prayer",
    start_ms: 196000,
    end_ms: 204000,
    fade_out_ms: 400,
    note: 'Sermon question — "Are there other kinds of sweetened gifts | that are not yet deliverable through screens?" The preacher turns the question outward.',
  },
  {
    scene: "08-church-leader-amen",
    start_ms: 34000,
    end_ms: 43500,
    fade_out_ms: 1500,
    note: "AMEN — full ensemble, six lanes summed, heavy reverb. Held, then dissolves. The teaser ends on its decay tail.",
  },
];

// Outro silence. Helps when Meta / Instagram loop the audio: the loop
// boundary lands inside silence rather than mid-decay, and the listener
// gets a held breath before the next replay begins.
const PRIMARY_OUTRO_SILENCE_MS = 2500;

// ---- 30-second bumper — same source, three beats ----
//
// The most compressed version of the arc: bell peal (cosmic) → chorus
// refrain (liturgical/communal) → AMEN (collective landing). Three
// textures, three voice colors, the entire emotional arc inside an
// attention budget that fits a Story or a Reels cover.
const BUMPER: Beat[] = [
  {
    scene: "00-opening",
    start_ms: 0,
    end_ms: 7000,
    fade_in_ms: 0,
    fade_out_ms: 600,
    note: "Cathedral entry, truncated — just the bell peal and the first whispered fragment of chorus.",
  },
  {
    scene: "02-chorus-first",
    start_ms: 15500,
    end_ms: 23500,
    fade_out_ms: 800,
    note: "Chorus refrain — same window as the primary teaser.",
  },
  {
    scene: "08-church-leader-amen",
    start_ms: 34000,
    end_ms: 43500,
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
  // Linear in/out is enough for these short, low-amplitude edges; the
  // fragments come pre-mixed with reverb tails so the perceptual envelope
  // is already curved.
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

async function buildOne(
  beats: readonly Beat[],
  outro_silence_ms: number,
  out_path: string,
): Promise<void> {
  const cache = new Map<string, Pcm>();
  const parts: Pcm[] = [];

  for (const [idx, beat] of beats.entries()) {
    if (!cache.has(beat.scene)) {
      cache.set(
        beat.scene,
        await readWav(join(SCENE_DIR, `${beat.scene}.wav`)),
      );
    }
    const fragment = slice(cache.get(beat.scene)!, beat.start_ms, beat.end_ms);
    const faded = applyFades(
      fragment,
      beat.fade_in_ms ?? DEFAULT_FADE_IN_MS,
      beat.fade_out_ms ?? DEFAULT_FADE_OUT_MS,
    );
    parts.push(faded);
    const dur_s = (
      (beat.end_ms - beat.start_ms) / 1000
    ).toFixed(1);
    process.stderr.write(
      `  beat ${idx + 1}  ${beat.scene.padEnd(28)} ${beat.start_ms
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
