import type { Pcm } from "./wav.js";

/**
 * Deterministic PRNG so renders are reproducible across machines.
 * Seed-per-call keeps each synthesis independent of wall-clock time.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function keystroke(rng: () => number, sample_rate: number): Float32Array {
  // One keystroke: a brief filtered-noise burst with a sharp-ish attack and an
  // exponential decay. Roughly 45–60 ms. Reads as a single percussive click.
  const duration_ms = 45 + Math.floor(rng() * 15);
  const n = Math.floor((duration_ms / 1000) * sample_rate);
  const out = new Float32Array(n);
  const decay = 9 + rng() * 3;
  let lp_prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.exp(-decay * t);
    const noise = rng() * 2 - 1;
    // Very light one-pole low-pass — takes the edge off pure white noise so
    // it reads as "mechanism" rather than "static."
    lp_prev = 0.55 * lp_prev + 0.45 * noise;
    out[i] = lp_prev * env;
  }
  return out;
}

function bellTing(rng: () => number, sample_rate: number): Float32Array {
  // Line-end bell: a short decaying sine around 1800 Hz with a faint partial.
  // Not a real typewriter ting, but evokes the idea in context.
  const duration_ms = 180;
  const n = Math.floor((duration_ms / 1000) * sample_rate);
  const out = new Float32Array(n);
  const f1 = 1800 + rng() * 120;
  const f2 = f1 * 2.07;
  const TAU = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = i / sample_rate;
    const env = Math.exp(-t * 8);
    out[i] =
      env *
      (0.75 * Math.sin(TAU * f1 * t) + 0.18 * Math.sin(TAU * f2 * t));
  }
  return out;
}

/**
 * Synthesize a "reporter at the keyboard" bed the length the caller asks for.
 * Low amplitude by design — intended to sit under EYEWITNESS speech at ~0.25
 * gain, not to be a foreground element.
 */
export function synthesizeTypewriterBed(
  duration_ms: number,
  sample_rate: number,
  seed = 0xa1ce,
): Pcm {
  const total_n = Math.max(0, Math.floor((duration_ms / 1000) * sample_rate));
  const out = new Float32Array(total_n);
  if (total_n === 0) return { samples: out, sample_rate };

  const rng = mulberry32(seed);
  let cursor = 0;
  let keystrokes_since_ting = 0;

  while (cursor < total_n) {
    const is_ting =
      keystrokes_since_ting >= 22 + Math.floor(rng() * 8) && rng() < 0.3;
    const ks = is_ting ? bellTing(rng, sample_rate) : keystroke(rng, sample_rate);
    // Slight loudness variation per stroke — closer to human cadence than a
    // perfect metronome.
    const stroke_gain = is_ting ? 0.55 : 0.75 + rng() * 0.25;
    for (let i = 0; i < ks.length && cursor + i < total_n; i++) {
      out[cursor + i]! += (ks[i] ?? 0) * stroke_gain;
    }
    if (is_ting) keystrokes_since_ting = 0;
    else keystrokes_since_ting += 1;

    // Typing cadence: 170–360 ms between keystrokes, with the occasional
    // longer pause (finger hunt / thought).
    const pause = rng() < 0.08 ? 500 + rng() * 700 : 170 + rng() * 190;
    cursor += Math.floor((pause / 1000) * sample_rate);
  }

  // Fade in/out to avoid clicking at segment boundaries.
  const fade_n = Math.min(Math.floor(sample_rate * 0.12), Math.floor(total_n / 4));
  for (let i = 0; i < fade_n; i++) {
    const k = i / fade_n;
    out[i]! *= k;
    out[total_n - 1 - i]! *= k;
  }

  return { samples: out, sample_rate };
}

/** Typewriter bed gain when mixed under EYEWITNESS speech. */
export const EYEWITNESS_UNDERLAY_GAIN = 0.25;

/** Trailing tail past the last word (ms) so the bed bridges into the next scene. */
export const EYEWITNESS_UNDERLAY_TAIL_MS = 1100;
