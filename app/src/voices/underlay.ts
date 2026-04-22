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

function ms(sample_rate: number, duration_ms: number): number {
  return Math.floor((duration_ms / 1000) * sample_rate);
}

function mixIn(
  out: Float32Array,
  source: Float32Array,
  cursor: number,
  gain: number,
): void {
  const n = Math.min(source.length, out.length - cursor);
  for (let i = 0; i < n; i++) {
    out[cursor + i]! += (source[i] ?? 0) * gain;
  }
}

/**
 * One keystroke. Sharper than the v1 version: shorter overall envelope,
 * lighter low-pass so the transient retains some high-frequency snap. Reads
 * as "Underwood thud" rather than "muffled tap."
 */
function keystroke(rng: () => number, sample_rate: number): Float32Array {
  const duration_ms = 25 + Math.floor(rng() * 12); // 25–37 ms
  const n = ms(sample_rate, duration_ms);
  const out = new Float32Array(n);
  const decay = 14 + rng() * 6;
  let lp_prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.exp(-decay * t);
    const noise = rng() * 2 - 1;
    // Lighter LP than v1 (0.55→0.35 retention) — preserves the click's
    // high-frequency snap so it cuts through the voice.
    lp_prev = 0.35 * lp_prev + 0.65 * noise;
    out[i] = lp_prev * env;
  }
  return out;
}

/**
 * Carriage return: clunk → scrape → ting. Three layered sounds covering
 * ~360 ms total. Replaces the v1 standalone bell, which read too clean.
 */
function carriageReturn(rng: () => number, sample_rate: number): Float32Array {
  const total_ms = 360;
  const n = ms(sample_rate, total_ms);
  const out = new Float32Array(n);

  // Clunk — first 60 ms — quick low-mid noise burst.
  const clunk_n = ms(sample_rate, 60);
  let lp_clunk = 0;
  for (let i = 0; i < clunk_n; i++) {
    const t = i / sample_rate;
    const env = Math.exp(-22 * t);
    const noise = rng() * 2 - 1;
    lp_clunk = 0.6 * lp_clunk + 0.4 * noise;
    out[i] = lp_clunk * env * 0.55;
  }

  // Scrape — 70–260 ms — slightly modulated mid-band noise simulating the
  // carriage sliding back along its rails.
  const scrape_start = ms(sample_rate, 70);
  const scrape_end = ms(sample_rate, 260);
  let lp_scrape = 0;
  for (let i = scrape_start; i < scrape_end; i++) {
    const t = (i - scrape_start) / sample_rate;
    const ramp = Math.min(t * 12, 1);
    const env = ramp * Math.exp(-1.8 * t);
    const noise = rng() * 2 - 1;
    lp_scrape = 0.45 * lp_scrape + 0.55 * noise;
    const tremolo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 22 * t);
    out[i]! += lp_scrape * env * tremolo * 0.32;
  }

  // Ting — 260–360 ms — a bell tone marking the line break.
  const ting_start = ms(sample_rate, 260);
  const f = 1700 + rng() * 120;
  for (let i = ting_start; i < n; i++) {
    const t = (i - ting_start) / sample_rate;
    const env = Math.exp(-12 * t);
    out[i]! += Math.sin(2 * Math.PI * f * t) * env * 0.45;
  }

  return out;
}

/**
 * Synthesize a "reporter at the keyboard" bed of the requested duration.
 * v2 cadence: keystrokes cluster into word-bursts of 4–8 strokes at 80–150
 * ms intervals, with 400–900 ms pauses between words and an occasional
 * 1.5–2 s thinking pause. Carriage returns fire after roughly every 60–80
 * keystrokes. This reads as human typing, not a metronome.
 *
 * Low amplitude by design — intended to sit under EYEWITNESS speech at
 * ~0.25 gain in the adapter, not as a foreground element.
 */
export function synthesizeTypewriterBed(
  duration_ms: number,
  sample_rate: number,
  seed = 0xa1ce,
): Pcm {
  const total_n = Math.max(0, ms(sample_rate, duration_ms));
  const out = new Float32Array(total_n);
  if (total_n === 0) return { samples: out, sample_rate };

  const rng = mulberry32(seed);
  let cursor = 0;
  let chars_since_carriage = 0;

  while (cursor < total_n) {
    // Occasional thinking pause — finger off the keys, blank stare.
    if (rng() < 0.06) {
      cursor += ms(sample_rate, 1500 + Math.floor(rng() * 600));
      continue;
    }

    // Carriage return after roughly 60–80 chars on a line.
    if (chars_since_carriage >= 60 + Math.floor(rng() * 20)) {
      const cr = carriageReturn(rng, sample_rate);
      mixIn(out, cr, cursor, 0.55);
      cursor += cr.length;
      cursor += ms(sample_rate, 250 + rng() * 200); // breath after the return
      chars_since_carriage = 0;
      continue;
    }

    // Word burst — 4 to 8 keystrokes at tight intervals.
    const burst_size = 4 + Math.floor(rng() * 5);
    for (let k = 0; k < burst_size; k++) {
      const ks = keystroke(rng, sample_rate);
      const stroke_gain = 0.7 + rng() * 0.3;
      mixIn(out, ks, cursor, stroke_gain);
      // 80–150 ms within a word.
      cursor += ms(sample_rate, 80 + Math.floor(rng() * 70));
      chars_since_carriage += 1;
      if (cursor >= total_n) break;
    }

    // Inter-word pause: 400–900 ms. Sometimes a touch longer.
    const pause = rng() < 0.15 ? 700 + rng() * 600 : 400 + rng() * 500;
    cursor += ms(sample_rate, pause);
  }

  // Fade in/out so the bed doesn't click at segment boundaries.
  const fade_n = Math.min(ms(sample_rate, 120), Math.floor(total_n / 4));
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
