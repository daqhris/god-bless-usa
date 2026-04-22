import { writeFile } from "node:fs/promises";

export interface Pcm {
  samples: Float32Array;
  sample_rate: number;
}

export function silence(ms: number, sample_rate: number): Pcm {
  const n = Math.max(0, Math.floor((ms / 1000) * sample_rate));
  return { samples: new Float32Array(n), sample_rate };
}

export function concat(parts: Pcm[]): Pcm {
  if (parts.length === 0) {
    return { samples: new Float32Array(0), sample_rate: 24000 };
  }
  const sample_rate = parts[0]!.sample_rate;
  for (const p of parts) {
    if (p.sample_rate !== sample_rate) {
      throw new Error(
        `concat: sample rate mismatch (${p.sample_rate} vs ${sample_rate}). Resample first.`,
      );
    }
  }
  const total = parts.reduce((acc, p) => acc + p.samples.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p.samples, offset);
    offset += p.samples.length;
  }
  return { samples: out, sample_rate };
}

export async function writeWav(path: string, pcm: Pcm): Promise<void> {
  const { samples, sample_rate } = pcm;
  const num_samples = samples.length;
  const byte_rate = sample_rate * 2;
  const block_align = 2;
  const data_size = num_samples * 2;
  const buffer = Buffer.alloc(44 + data_size);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + data_size, 4);
  buffer.write("WAVE", 8);

  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sample_rate, 24);
  buffer.writeUInt32LE(byte_rate, 28);
  buffer.writeUInt16LE(block_align, 32);
  buffer.writeUInt16LE(16, 34);

  buffer.write("data", 36);
  buffer.writeUInt32LE(data_size, 40);

  for (let i = 0; i < num_samples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  await writeFile(path, buffer);
}
