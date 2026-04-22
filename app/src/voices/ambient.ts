import type { Pcm } from "./wav.js";

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
