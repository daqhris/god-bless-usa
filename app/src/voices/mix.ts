import type { Pcm } from "./wav.js";

export interface Lane {
  pcm: Pcm;
  offset_ms: number;
  gain?: number;
}

/**
 * Mix multiple lanes into a single PCM. `offset_ms` is relative — the most
 * negative offset anchors t=0, and all other lanes are padded with leading
 * silence so their alignment is preserved. Output length is the longest
 * padded lane. All lanes must share the same sample rate.
 *
 * Default gain is 1/N per lane (equal mix, headroom). Output is clamped to
 * [-1, 1] to avoid clipping if lanes sum constructively at peak moments.
 */
export function mix(lanes: Lane[]): Pcm {
  if (lanes.length === 0) {
    return { samples: new Float32Array(0), sample_rate: 24000 };
  }
  const sample_rate = lanes[0]!.pcm.sample_rate;
  for (const l of lanes) {
    if (l.pcm.sample_rate !== sample_rate) {
      throw new Error(
        `mix: sample-rate mismatch (${l.pcm.sample_rate} vs ${sample_rate}).`,
      );
    }
  }

  const min_offset_ms = Math.min(...lanes.map((l) => l.offset_ms));
  const padded = lanes.map((l) => {
    const pad_ms = l.offset_ms - min_offset_ms;
    const pad_n = Math.floor((pad_ms / 1000) * sample_rate);
    const padded_len = pad_n + l.pcm.samples.length;
    const padded_samples = new Float32Array(padded_len);
    padded_samples.set(l.pcm.samples, pad_n);
    return { samples: padded_samples, gain: l.gain ?? 1 / lanes.length };
  });

  const out_len = Math.max(...padded.map((p) => p.samples.length));
  const out = new Float32Array(out_len);

  for (const p of padded) {
    for (let i = 0; i < p.samples.length; i++) {
      out[i]! += (p.samples[i] ?? 0) * p.gain;
    }
  }
  for (let i = 0; i < out.length; i++) {
    const v = out[i]!;
    if (v > 1) out[i] = 1;
    else if (v < -1) out[i] = -1;
  }

  return { samples: out, sample_rate };
}
