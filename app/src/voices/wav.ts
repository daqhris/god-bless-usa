import { readFile, writeFile } from "node:fs/promises";

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

/**
 * Read a 16-bit PCM mono WAV file into a Pcm. Scans chunks rather than
 * assuming data begins at byte 44, so files produced by ffmpeg (which may
 * include "LIST" or "bext" metadata chunks before "data") are handled.
 */
export async function readWav(path: string): Promise<Pcm> {
  const buf = await readFile(path);
  if (
    buf.toString("ascii", 0, 4) !== "RIFF" ||
    buf.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error(`readWav: ${path} is not a RIFF/WAVE file`);
  }
  let sample_rate = 0;
  let channels = 0;
  let bits_per_sample = 0;
  let data_offset = 0;
  let data_size = 0;

  let cursor = 12;
  while (cursor < buf.length - 8) {
    const id = buf.toString("ascii", cursor, cursor + 4);
    const size = buf.readUInt32LE(cursor + 4);
    const payload = cursor + 8;
    if (id === "fmt ") {
      channels = buf.readUInt16LE(payload + 2);
      sample_rate = buf.readUInt32LE(payload + 4);
      bits_per_sample = buf.readUInt16LE(payload + 14);
    } else if (id === "data") {
      data_offset = payload;
      data_size = size;
      break;
    }
    // RIFF chunks are word-aligned; odd sizes carry a single pad byte.
    cursor = payload + size + (size & 1);
  }
  if (bits_per_sample !== 16) {
    throw new Error(
      `readWav: ${path} — expected 16-bit PCM, got ${bits_per_sample}-bit`,
    );
  }
  if (channels !== 1) {
    throw new Error(
      `readWav: ${path} — expected mono, got ${channels} channels`,
    );
  }
  if (data_offset === 0) {
    throw new Error(`readWav: ${path} — no "data" chunk found`);
  }
  const n = data_size / 2;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    samples[i] = buf.readInt16LE(data_offset + i * 2) / 32767;
  }
  return { samples, sample_rate };
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
