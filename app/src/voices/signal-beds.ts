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
 * Signal one — Train of (distracting) Thoughts, as brain electricity.
 * Metaphor: neural firing, not locomotion. Non-rhythmic: sparse high-band
 * synaptic pops at irregular intervals plus a quiet 1.2 kHz "nervous hum"
 * with rapid amplitude flickering (think a fluorescent about to fail, but
 * subtler). Density rises slightly across the bed — the thoughts don't
 * speed up on a tempo grid, they just get more frequent. No BPM pulse
 * anywhere; acceleration lives in Signal 2 instead.
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
  const total_s = duration_ms / 1000;

  // Nervous hum — a mid-band tone with fast, irregular amplitude flicker.
  // Two slightly detuned components prevent the flicker from sounding like
  // a pure AM tone; the result reads as diffuse neural static.
  let flicker_lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sample_rate;
    const raw_flicker = rng() * 2 - 1;
    // Smooth flicker over ~8 ms so it modulates amplitude rather than
    // sounding like shot noise.
    flicker_lp = 0.94 * flicker_lp + 0.06 * raw_flicker;
    const env = 0.5 + 0.5 * flicker_lp;
    const tone =
      0.022 * Math.sin(TAU * 1200 * t) + 0.014 * Math.sin(TAU * 1830 * t);
    samples[i] = env * tone;
  }

  // Synaptic pops — very short (6–18 ms) bursts of high-frequency noise,
  // shaped by a fast exponential envelope. Intervals drawn from an
  // exponential distribution (Poisson process) so the rhythm is unpredictable.
  // Mean interval shrinks from 240 ms → 110 ms across the bed's duration
  // so the mind gets busier without ever pulsing.
  let t_s = 0;
  while (t_s < total_s) {
    const progress = t_s / total_s;
    const mean_interval_s = 0.24 + (0.11 - 0.24) * progress;
    // Exponential: -ln(1 - u) * mean, clamped against u = 1 edge case.
    const u = Math.max(1e-4, rng());
    t_s += -Math.log(1 - (1 - 1e-4) * u) * mean_interval_s;
    if (t_s >= total_s) break;

    const pop_start = Math.floor(t_s * sample_rate);
    const pop_ms = 6 + Math.floor(rng() * 12);
    const pop_len = ms(sample_rate, pop_ms);
    // Band-pass-ish by high-passing white noise (subtract a running LP).
    let lp = 0;
    const decay = 180 + rng() * 80;
    const gain = 0.16 + rng() * 0.1;
    for (let i = 0; i < pop_len && pop_start + i < n; i++) {
      const local_t = i / sample_rate;
      const env = Math.exp(-decay * local_t);
      const noise = rng() * 2 - 1;
      lp = 0.7 * lp + 0.3 * noise;
      const hp = noise - lp; // rough high-pass
      samples[pop_start + i]! += hp * env * gain;
    }
  }

  applyEdgeFades(samples, sample_rate);
  return { samples, sample_rate };
}

/**
 * Signal two — Drumbeating Heart Pulse, with an accelerating body-motion
 * layer beneath. Metaphor: an alien heart under distress, the body
 * agitated with it. Two stacked rhythms:
 *   1. Cardiac — low "lub-dub" sine pulse at ~88 → 108 BPM. S1 ("lub")
 *      lower and louder than S2 ("dub"), classical cardiac envelope.
 *   2. Body-motion rail-chuff — one short filtered-noise burst per beat,
 *      tempo tracking the heart (so it phases with it, not against it),
 *      at a quieter layer below the cardiac. Moved here from Signal 1:
 *      the accelerating-motion texture belongs under the heartbeat, not
 *      over the distracted thoughts.
 */
export function synthesizeHeartBed(
  duration_ms: number,
  sample_rate: number,
  seed = 0xbea7,
): Pcm {
  const n = ms(sample_rate, duration_ms);
  const samples = new Float32Array(n);
  if (n === 0) return { samples, sample_rate };

  const rng = mulberry32(seed);

  const start_bpm = 88;
  const end_bpm = 108;
  const total_s = duration_ms / 1000;
  let beat_t = 0;

  const writeBeat = (start_i: number, dur_ms: number, freq: number, gain: number) => {
    const len = ms(sample_rate, dur_ms);
    for (let i = 0; i < len && start_i + i < n; i++) {
      const t = i / sample_rate;
      const attack_n = Math.floor((4 / 1000) * sample_rate);
      const attack = i < attack_n ? i / Math.max(1, attack_n) : 1;
      const env = attack * Math.exp(-18 * t);
      samples[start_i + i]! += gain * env * Math.sin(TAU * freq * t);
    }
  };

  const writeChuff = (start_i: number, dur_ms: number, gain: number) => {
    const len = ms(sample_rate, dur_ms);
    let lp = 0;
    for (let i = 0; i < len && start_i + i < n; i++) {
      const local_t = i / sample_rate;
      const env = Math.exp(-18 * local_t);
      const noise = rng() * 2 - 1;
      lp = 0.5 * lp + 0.5 * noise;
      samples[start_i + i]! += lp * env * gain;
    }
  };

  while (beat_t < total_s) {
    const progress = beat_t / total_s;
    const bpm = start_bpm + (end_bpm - start_bpm) * progress;
    const base_i = Math.floor(beat_t * sample_rate);

    // Cardiac "lub" — louder, slightly lower pitch, ~140 ms.
    writeBeat(base_i, 140, 58, 0.22);
    // Cardiac "dub" — softer, slightly higher, ~90 ms, 180 ms after lub.
    writeBeat(base_i + ms(sample_rate, 180), 90, 72, 0.14);
    // Body-motion chuff under the lub — quieter than the cardiac, adds
    // agitation without competing with the heartbeat's shape.
    writeChuff(base_i, 120, 0.08);

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
