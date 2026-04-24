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
 * Master-length undercurrent drone — the "thin drone underneath throughout"
 * that the sound-design framework calls for. A sub-fundamental (55 Hz, A1)
 * with a perfect fifth and octave stacked as a thin triad, plus two very
 * slow LFOs so the 16-minute bed never sounds static: one modulates
 * amplitude over ~20 s, the other detunes the fundamental by ±0.8 Hz over
 * ~45 s. Long 12-second fades at both edges so the drone ghosts in under
 * the opening peal rather than cutting in, and fades out under the final
 * typewriter trail rather than stopping.
 *
 * Intended to mix into the concatenated master at low gain (see
 * MASTER_UNDERCURRENT_GAIN). Not suitable for use per-segment — the long
 * fades assume a multi-minute window.
 */
export function synthesizeUndercurrentDrone(
  duration_ms: number,
  sample_rate: number,
): Pcm {
  const n = Math.max(0, Math.floor((duration_ms / 1000) * sample_rate));
  const samples = new Float32Array(n);
  if (n === 0) return { samples, sample_rate };

  const fundamental = 55; // A1
  const partials: Array<{ ratio: number; weight: number }> = [
    { ratio: 1, weight: 0.6 },
    { ratio: 1.5, weight: 0.22 }, // perfect fifth
    { ratio: 2, weight: 0.14 }, // octave
  ];

  const amp_lfo_hz = 0.05; // 20-s period
  const detune_lfo_hz = 0.022; // 45-s period
  const base_amp = 0.18;
  const amp_lfo_depth = 0.05;
  const detune_depth_hz = 0.8;

  for (let i = 0; i < n; i++) {
    const t = i / sample_rate;
    const detune = detune_depth_hz * Math.sin(TAU * detune_lfo_hz * t);
    let v = 0;
    for (const { ratio, weight } of partials) {
      v += weight * Math.sin(TAU * (fundamental + detune) * ratio * t);
    }
    const env = base_amp + amp_lfo_depth * Math.sin(TAU * amp_lfo_hz * t);
    samples[i] = v * env;
  }

  // Long edge fades — the drone should arrive and leave like atmosphere,
  // never like a switch being flipped.
  const fade_n = Math.min(
    Math.floor(sample_rate * 12),
    Math.floor(n / 3),
  );
  for (let i = 0; i < fade_n; i++) {
    const k = i / fade_n;
    samples[i]! *= k;
    samples[n - 1 - i]! *= k;
  }

  return { samples, sample_rate };
}

/** Mix level for the undercurrent drone when layered under the master. */
export const MASTER_UNDERCURRENT_GAIN = 0.4;

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
 * Mother bell ↔ daughter bell ratio.
 *
 *   5 / 4 — major third (~+386 cents). Brighter, more celebratory. Canonical.
 *   6 / 5 — minor third (~+316 cents). Darker, more liturgical / funereal.
 *   4 / 3 — perfect fourth (~+498 cents). Martial.
 *   3 / 2 — perfect fifth (~+702 cents). Wide, almost hymnal.
 *   5 / 3 — major sixth (~+884 cents). Much wider; light, festive peal.
 *
 * Single constant so A/B swaps are a one-line edit.
 */
export const BELL_PEAL_RATIO = 5 / 4;

/**
 * Synthesize a peal of church bells — Roman / Vatican cathedral style. Three
 * to five tolls at a steady interval, alternating between a "mother bell"
 * (the requested fundamental) and a "daughter bell" tuned BELL_PEAL_RATIO
 * higher (default: major third, 5:4). Each strike happens while previous
 * tolls are still decaying, so the tails phase and form the "cloud of sound"
 * that reads as a religious introduction to mass rather than a single
 * threshold stroke.
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
  const daughter_hz = mother_hz * BELL_PEAL_RATIO;
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
 *
 * When `real_bells` is supplied (the CC-BY Vatican peal prepared by
 * `scripts/prepare-bell-sample.ts`), the recording replaces the synthesized
 * peal for authentic cathedral timbre. The synthesized organ drone still
 * enters underneath at 2.8 s. Without a sample, the synthesized peal is used
 * — deterministic, reproducible, no external asset required.
 */
export function synthesizeBellThenDrone(
  duration_ms: number,
  sample_rate: number,
  real_bells?: Pcm,
): Pcm {
  const drone = synthesizeOrganDrone(duration_ms, sample_rate);

  if (real_bells) {
    if (real_bells.sample_rate !== sample_rate) {
      throw new Error(
        `synthesizeBellThenDrone: real_bells sample rate ${real_bells.sample_rate} != target ${sample_rate}. Resample at prep time.`,
      );
    }
    // Clip the recording to the requested window — the 25 s source is longer
    // than Scene 0 needs, and anything past `duration_ms` would bleed into the
    // chorus premonition that follows.
    const max_samples = Math.floor((duration_ms / 1000) * sample_rate);
    const samples =
      real_bells.samples.length > max_samples
        ? real_bells.samples.slice(0, max_samples)
        : real_bells.samples;
    // Gain 0.9 on peaks ≈ −1 dBTP (prep loudness-normalizes there) leaves
    // headroom for the drone to add without clipping.
    return mix([
      { pcm: { samples, sample_rate }, offset_ms: 0, gain: 0.9 },
      { pcm: drone, offset_ms: 2800, gain: 0.55 },
    ]);
  }

  const peal = synthesizeBellPeal(duration_ms, sample_rate);
  return mix([
    { pcm: peal, offset_ms: 0, gain: 1 },
    { pcm: drone, offset_ms: 2800, gain: 0.75 },
  ]);
}
