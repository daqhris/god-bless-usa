import type { Pcm } from "./wav.js";

/**
 * Thin ambient beds for Scene IX's three signals under THE PRAYING ALIEN's
 * interior monologue. Each bed is dramaturgically mapped to one signal —
 * Train of Thoughts / Heart Pulse / Gut Feeling — and layered at a low gain
 * so the mind's acoustic texture is *felt* rather than heard. Reading them
 * as foreground would turn an interior monologue into a radio play; that
 * is not what the score asks for.
 *
 * All beds are deterministic (seeded PRNG), pure-TypeScript arithmetic,
 * match the Kokoro 24 kHz mono rate, and fade in / out so they don't click
 * at segment boundaries.
 */

const TAU = Math.PI * 2;

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

function ms(sample_rate: number, duration_ms: number): number {
  return Math.max(0, Math.floor((duration_ms / 1000) * sample_rate));
}

function applyEdgeFades(
  out: Float32Array,
  sample_rate: number,
  fade_ms = 400,
): void {
  const fade_n = Math.min(ms(sample_rate, fade_ms), Math.floor(out.length / 3));
  for (let i = 0; i < fade_n; i++) {
    const k = i / fade_n;
    out[i]! *= k;
    out[out.length - 1 - i]! *= k;
  }
}

/**
 * Signal one — Train of Thoughts.
 * Metaphor: a mind accelerating along tracks. A soft rail-pulse "chuff"
 * ramps from ~70 to ~110 BPM across the bed's duration, layered with a
 * quiet sustained hum at ~220 Hz (wires vibrating from the motion). Neither
 * element is realistic; together they register as "forward movement."
 */
export function synthesizeTrainBed(
  duration_ms: number,
  sample_rate: number,
  seed = 0x7241,
): Pcm {
  const n = ms(sample_rate, duration_ms);
  const samples = new Float32Array(n);
  if (n === 0) return { samples, sample_rate };

  const rng = mulberry32(seed);

  // Tonal hum — quiet sustained 220 Hz with octave, slow LFO.
  for (let i = 0; i < n; i++) {
    const t = i / sample_rate;
    const lfo = 0.7 + 0.3 * Math.sin(TAU * 0.18 * t);
    samples[i] =
      lfo *
      (0.032 * Math.sin(TAU * 220 * t) + 0.016 * Math.sin(TAU * 440 * t));
  }

  // Rail-pulse chuffs — one short filtered-noise burst per beat, tempo
  // accelerating linearly from 70 → 110 BPM.
  const start_bpm = 70;
  const end_bpm = 110;
  let beat_t = 0; // seconds
  const total_s = duration_ms / 1000;
  while (beat_t < total_s) {
    const progress = beat_t / total_s;
    const bpm = start_bpm + (end_bpm - start_bpm) * progress;
    const chuff_start = Math.floor(beat_t * sample_rate);
    const chuff_len = ms(sample_rate, 120);
    let lp = 0;
    for (let i = 0; i < chuff_len && chuff_start + i < n; i++) {
      const local_t = i / sample_rate;
      const env = Math.exp(-18 * local_t);
      const noise = rng() * 2 - 1;
      lp = 0.5 * lp + 0.5 * noise;
      samples[chuff_start + i]! += lp * env * 0.18;
    }
    beat_t += 60 / bpm;
  }

  applyEdgeFades(samples, sample_rate);
  return { samples, sample_rate };
}

/**
 * Signal two — Drumbeating Heart Pulse.
 * Metaphor: an alien heart under distress. A low "lub-dub" sine pulse at
 * ~88 BPM initially, accelerating to ~108 BPM across the bed. The first
 * beat (S1, lub) is longer and louder than the second (S2, dub), matching
 * the classical cardiac envelope. Fundamentals sit in the 55–80 Hz range
 * so the pulse is felt as much as heard.
 */
export function synthesizeHeartBed(
  duration_ms: number,
  sample_rate: number,
  seed = 0xbea7,
): Pcm {
  const n = ms(sample_rate, duration_ms);
  const samples = new Float32Array(n);
  if (n === 0) return { samples, sample_rate };

  const _rng = mulberry32(seed); // reserved — kept for future texturing

  const start_bpm = 88;
  const end_bpm = 108;
  const total_s = duration_ms / 1000;
  let beat_t = 0;

  const writeBeat = (start_i: number, dur_ms: number, freq: number, gain: number) => {
    const len = ms(sample_rate, dur_ms);
    for (let i = 0; i < len && start_i + i < n; i++) {
      const t = i / sample_rate;
      // Fast attack (4 ms), exponential decay.
      const attack_n = Math.floor((4 / 1000) * sample_rate);
      const attack = i < attack_n ? i / Math.max(1, attack_n) : 1;
      const env = attack * Math.exp(-18 * t);
      samples[start_i + i]! += gain * env * Math.sin(TAU * freq * t);
    }
  };

  while (beat_t < total_s) {
    const progress = beat_t / total_s;
    const bpm = start_bpm + (end_bpm - start_bpm) * progress;
    const base_i = Math.floor(beat_t * sample_rate);

    // S1 "lub" — louder, slightly lower pitch, ~140 ms.
    writeBeat(base_i, 140, 58, 0.22);
    // S2 "dub" — softer, slightly higher, ~90 ms, 180 ms after S1.
    writeBeat(base_i + ms(sample_rate, 180), 90, 72, 0.14);

    beat_t += 60 / bpm;
  }

  applyEdgeFades(samples, sample_rate);
  return { samples, sample_rate };
}

/**
 * Signal three — Drumbeating Gut Feeling.
 * Metaphor: deeper than thought, pre-rational. Non-rhythmic; a sub-audio
 * sine at ~42 Hz with a very slow amplitude modulation (~0.12 Hz LFO),
 * plus a thin layer of filtered noise suggesting peristalsis. Barely
 * present in the mix — more felt than heard.
 */
export function synthesizeGutBed(
  duration_ms: number,
  sample_rate: number,
  seed = 0x6077,
): Pcm {
  const n = ms(sample_rate, duration_ms);
  const samples = new Float32Array(n);
  if (n === 0) return { samples, sample_rate };

  const rng = mulberry32(seed);
  let lp = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sample_rate;
    // Two very slow LFOs overlaid — a breathing amplitude and a subtle
    // detune on the fundamental.
    const amp_lfo = 0.55 + 0.45 * Math.sin(TAU * 0.12 * t);
    const detune = 42 + 2 * Math.sin(TAU * 0.07 * t);
    const sub = 0.18 * Math.sin(TAU * detune * t);

    // Heavy-LP noise — reads as distant rumbling, not hiss.
    const noise = rng() * 2 - 1;
    lp = 0.92 * lp + 0.08 * noise;
    const bed_noise = lp * 0.06;

    samples[i] = amp_lfo * (sub + bed_noise);
  }

  applyEdgeFades(samples, sample_rate, 600);
  return { samples, sample_rate };
}

/** Gain applied when layering a signal bed under praying-alien speech. */
export const SIGNAL_BED_GAIN = 0.35;

/** Tail past the last word so the bed fades under the next silence. */
export const SIGNAL_BED_TAIL_MS = 700;
