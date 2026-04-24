import type { Pcm } from "./wav.js";

/**
 * Classical Schroeder-Moorer algorithmic reverb. Four parallel IIR comb
 * filters with lowpass-damped feedback (simulating air absorption),
 * followed by two series allpass filters for diffusion. Pure TypeScript,
 * deterministic, same output on every render — museum-archivable.
 *
 * The Kokoro voice is dry close-mic by default. Reverb here gives each
 * speech segment the acoustic space the direction JSON asks for:
 *
 *   none   — pass-through. Interior monologue (PRAYING ALIEN, dry_close).
 *   light  — small room. EYEWITNESS filing stamps; close, intimate.
 *   medium — warm hall. CHURCH LEADER's pulpit address.
 *   heavy  — stone cathedral. CHORUS refrain; opening premonition.
 *
 * Each preset adds a reverb tail past the dry signal's end. Downstream
 * concat treats that tail as part of the speech segment, so it bleeds
 * naturally into the inter-segment silence — exactly how a physical room
 * would carry the voice into the next moment.
 */

export type ReverbKind = "none" | "light" | "medium" | "heavy";

interface ReverbConfig {
  /** Four comb-filter delays in milliseconds; prime-ish spacing to avoid
   *  periodic resonances. */
  comb_ms: number[];
  /** Per-comb feedback coefficient; drives the RT60. */
  comb_feedback: number;
  /** Two allpass delays for diffusion. */
  allpass_ms: number[];
  /** Allpass feedback coefficient. */
  allpass_feedback: number;
  /** Lowpass coefficient in each comb's feedback (0 = no damping, 0.5 =
   *  strong). Higher values make the tail warmer — less high-frequency
   *  energy survives successive passes around the comb. */
  lp_coefficient: number;
  /** Wet/dry mix: output = (1 - wet) * dry + wet * reverb. */
  wet: number;
  /** Reverb tail appended past the dry signal in milliseconds. */
  tail_ms: number;
}

// Prime-ish spacing for the comb delays (Schroeder's originals, slightly
// adjusted). Same across presets — it's the feedback + damping that shifts
// the character.
const COMB_MS = [29.7, 37.1, 41.1, 43.7];
const ALLPASS_MS = [5.0, 1.7];

const CONFIGS: Record<Exclude<ReverbKind, "none">, ReverbConfig> = {
  light: {
    comb_ms: COMB_MS,
    comb_feedback: 0.72,
    allpass_ms: ALLPASS_MS,
    allpass_feedback: 0.68,
    lp_coefficient: 0.3,
    wet: 0.22,
    tail_ms: 900,
  },
  medium: {
    comb_ms: COMB_MS,
    comb_feedback: 0.84,
    allpass_ms: ALLPASS_MS,
    allpass_feedback: 0.7,
    lp_coefficient: 0.25,
    wet: 0.32,
    tail_ms: 1800,
  },
  heavy: {
    comb_ms: COMB_MS,
    comb_feedback: 0.91,
    allpass_ms: ALLPASS_MS,
    allpass_feedback: 0.75,
    lp_coefficient: 0.2,
    wet: 0.45,
    tail_ms: 2800,
  },
};

class CombFilter {
  private buf: Float32Array;
  private pos = 0;
  private lp_state = 0;

  constructor(
    delay_samples: number,
    private readonly feedback: number,
    private readonly lp: number,
  ) {
    this.buf = new Float32Array(Math.max(1, delay_samples));
  }

  process(input: number): number {
    const delayed = this.buf[this.pos]!;
    // Lowpass the feedback signal — simulates air absorption, warms the tail.
    this.lp_state = this.lp * this.lp_state + (1 - this.lp) * delayed;
    this.buf[this.pos] = input + this.feedback * this.lp_state;
    this.pos = (this.pos + 1) % this.buf.length;
    return delayed;
  }
}

class AllpassFilter {
  private buf: Float32Array;
  private pos = 0;

  constructor(delay_samples: number, private readonly feedback: number) {
    this.buf = new Float32Array(Math.max(1, delay_samples));
  }

  process(input: number): number {
    const delayed = this.buf[this.pos]!;
    const out = -input + delayed;
    this.buf[this.pos] = input + this.feedback * delayed;
    this.pos = (this.pos + 1) % this.buf.length;
    return out;
  }
}

export function applyReverb(pcm: Pcm, kind: ReverbKind): Pcm {
  if (kind === "none") return pcm;
  const cfg = CONFIGS[kind];
  const sr = pcm.sample_rate;

  const toSamples = (ms: number) => Math.floor((ms / 1000) * sr);
  const tail_n = toSamples(cfg.tail_ms);
  const out_n = pcm.samples.length + tail_n;
  const out = new Float32Array(out_n);

  const combs = cfg.comb_ms.map(
    (ms) => new CombFilter(toSamples(ms), cfg.comb_feedback, cfg.lp_coefficient),
  );
  const allpasses = cfg.allpass_ms.map(
    (ms) => new AllpassFilter(toSamples(ms), cfg.allpass_feedback),
  );
  const comb_scale = 1 / combs.length;

  for (let i = 0; i < out_n; i++) {
    const dry = i < pcm.samples.length ? pcm.samples[i]! : 0;
    let wet = 0;
    for (const c of combs) {
      wet += c.process(dry) * comb_scale;
    }
    for (const ap of allpasses) {
      wet = ap.process(wet);
    }
    let v = dry * (1 - cfg.wet) + wet * cfg.wet;
    if (v > 1) v = 1;
    else if (v < -1) v = -1;
    out[i] = v;
  }

  return { samples: out, sample_rate: sr };
}
