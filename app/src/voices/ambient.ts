import type { Pcm } from "./wav.js";
import { mix } from "./mix.js";

const TAU = Math.PI * 2;

/**
 * Synthesize a simple organ-like drone for ambient cues.
 * Not a real organ — an additive sum of sine partials (fundamental, octave,
 * fifth, octave-of-fifth) with slow amplitude modulation and fade in/out at
 * the edges. Low amplitude so it reads as "church ambience" rather than a
 * musical line. Sufficient for the PRELUDE, AMEN decay tail, and closing
 * ambience cues in the score.
 *
 * Fundamental defaults to A2 (110 Hz). Bump it down to A1 (55 Hz) for a
 * heavier close; bump up to A3 (220 Hz) for a thinner, higher presence.
 */
export function synthesizeOrganDrone(
  duration_ms: number,
  sample_rate: number,
  fundamental_hz = 110,
): Pcm {
  const n = Math.max(0, Math.floor((duration_ms / 1000) * sample_rate));
  const samples = new Float32Array(n);
  if (n === 0) return { samples, sample_rate };

  const partials: Array<{ ratio: number; weight: number }> = [
    { ratio: 1, weight: 0.55 }, // fundamental
    { ratio: 2, weight: 0.25 }, // octave
    { ratio: 1.5, weight: 0.14 }, // perfect fifth
    { ratio: 3, weight: 0.06 }, // octave + fifth
  ];

  const lfo_hz = 0.22;
  const base_amp = 0.14;
  const lfo_depth = 0.04;

  for (let i = 0; i < n; i++) {
    const t = i / sample_rate;
    let v = 0;
    for (const { ratio, weight } of partials) {
      v += weight * Math.sin(TAU * fundamental_hz * ratio * t);
    }
    const env = base_amp + lfo_depth * Math.sin(TAU * lfo_hz * t);
    samples[i] = v * env;
  }

  const fade_n = Math.min(Math.floor(sample_rate * 0.75), Math.floor(n / 3));
  for (let i = 0; i < fade_n; i++) {
    const k = i / fade_n;
    samples[i]! *= k;
    samples[n - 1 - i]! *= k;
  }

  return { samples, sample_rate };
}

/**
 * Synthesize a single church bell toll. Inharmonic partials approximating a
 * real bell (1, 2, 2.5, 3 ratios with independent decay times), sharp attack,
 * long exponential decay. Default fundamental ~65 Hz puts the bell low and
 * "deep," which fits a stone-room cathedral better than a higher pitch.
 *
 * The toll naturally decays to silence well before `duration_ms` is reached
 * if `duration_ms` is generous — pad with silence at the buffer's end. This
 * is by design so callers can specify a generous window without truncating
 * the natural decay.
 */
export function synthesizeBellToll(
  duration_ms: number,
  sample_rate: number,
  fundamental_hz = 65,
): Pcm {
  const n = Math.max(0, Math.floor((duration_ms / 1000) * sample_rate));
  const samples = new Float32Array(n);
  if (n === 0) return { samples, sample_rate };

  // Inharmonic partials roughly tracking a real bell. The 2.5 ratio is the
  // "tierce" that gives a bell its slightly minor coloring.
  const partials: Array<{ ratio: number; weight: number; decay: number }> = [
    { ratio: 1.0, weight: 0.55, decay: 1.4 }, // hum tone — longest sustain
    { ratio: 2.0, weight: 0.32, decay: 2.6 }, // prime
    { ratio: 2.5, weight: 0.22, decay: 4.2 }, // tierce (minor third over the prime)
    { ratio: 3.0, weight: 0.15, decay: 5.5 }, // quint
    { ratio: 4.5, weight: 0.08, decay: 8.0 }, // upper bell metal — fades fast
  ];

  // Sharp attack — first ~6 ms ramps from 0 to 1.
  const attack_n = Math.floor((6 / 1000) * sample_rate);

  for (let i = 0; i < n; i++) {
    const t = i / sample_rate;
    let v = 0;
    for (const p of partials) {
      v += p.weight * Math.sin(TAU * fundamental_hz * p.ratio * t) * Math.exp(-p.decay * t);
    }
    const attack_env = i < attack_n ? i / Math.max(1, attack_n) : 1;
    samples[i] = v * attack_env * 0.32; // moderate overall amplitude
  }

  return { samples, sample_rate };
}

/**
 * Synthesize a peal of church bells — Roman / Vatican cathedral style. Three
 * to five tolls at a steady interval, alternating between a "mother bell"
 * (the requested fundamental) and a "daughter bell" tuned a minor-third
 * higher (6:5 ratio). Each strike happens while previous tolls are still
 * decaying, so the tails phase and form the "cloud of sound" that reads as
 * a religious introduction to mass rather than a single threshold stroke.
 *
 * Defaults to 4 tolls at 1100ms spacing — fits comfortably in ~4.4 seconds
 * of strikes with decays extending to ~7s. Adjust toll_count and
 * inter_toll_ms if a particular scene wants a shorter or longer peal.
 */
export function synthesizeBellPeal(
  duration_ms: number,
  sample_rate: number,
  toll_count = 4,
  inter_toll_ms = 1100,
  mother_hz = 65,
): Pcm {
  const daughter_hz = mother_hz * (6 / 5); // minor third above the mother bell
  const pitches = [mother_hz, daughter_hz];

  const lanes: Array<{ pcm: Pcm; offset_ms: number; gain: number }> = [];
  for (let i = 0; i < toll_count; i++) {
    const fundamental = pitches[i % 2]!;
    // Each toll gets the remaining window so its decay isn't clipped. Floor at
    // 400 ms so a very short tail still sounds like a strike rather than a click.
    const window_ms = Math.max(400, duration_ms - i * inter_toll_ms);
    const toll = synthesizeBellToll(window_ms, sample_rate, fundamental);
    // Mother bell slightly louder to anchor the peal; daughter is the reply.
    const gain = i % 2 === 0 ? 0.55 : 0.45;
    lanes.push({ pcm: toll, offset_ms: i * inter_toll_ms, gain });
  }

  return mix(lanes);
}

/**
 * Bells peal; organ drone enters underneath as the peal is still ringing; both
 * occupy the requested window. Used for the opening invocation (Scene 0) and
 * any scene that needs a "we are formally entering this section" announcement.
 * The drone comes in during the peal (not after) so the transition feels like
 * the bells summoning the organ, not a hand-off.
 */
export function synthesizeBellThenDrone(
  duration_ms: number,
  sample_rate: number,
): Pcm {
  const peal = synthesizeBellPeal(duration_ms, sample_rate);
  const drone = synthesizeOrganDrone(duration_ms, sample_rate);
  // Drone enters ~2.8s in — after three of the four tolls have struck, so the
  // peal establishes itself before the organ joins.
  return mix([
    { pcm: peal, offset_ms: 0, gain: 1 },
    { pcm: drone, offset_ms: 2800, gain: 0.75 },
  ]);
}
