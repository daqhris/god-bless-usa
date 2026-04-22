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
 * Bell tolls; organ drone enters as the bell decays; both occupy the
 * requested window. The bell gets the first ~2.5 seconds, the drone
 * crossfades in around 1 second in and continues to the end. Used for
 * the opening invocation (Scene 0) and any scene that needs a "we are
 * formally entering this section" announcement.
 */
export function synthesizeBellThenDrone(
  duration_ms: number,
  sample_rate: number,
): Pcm {
  // The bell allocation: enough for the perceptible decay, but capped so it
  // doesn't crowd longer ambient cues.
  const bell_window_ms = Math.min(3500, duration_ms);
  const bell = synthesizeBellToll(bell_window_ms, sample_rate);
  const drone = synthesizeOrganDrone(duration_ms, sample_rate);
  // Drone enters ~1.1s into the bell so the bell is heard cleanly first.
  return mix([
    { pcm: bell, offset_ms: 0, gain: 1 },
    { pcm: drone, offset_ms: 1100, gain: 0.85 },
  ]);
}
