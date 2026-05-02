import { resolve, join } from "node:path";
import { readWav } from "../src/voices/wav.js";

/**
 * Inspection tool — for each scene WAV passed on argv, scans for
 * silence regions (RMS < threshold for at least min_ms) and prints
 * them. Used to derive trailer cut-points: cross-reference the printed
 * silence boundaries against the corresponding directions JSON to
 * identify which silence belongs to which segment, then use the
 * adjacent ms offsets as exact phrase boundaries in build-trailer.ts.
 *
 * Defaults: -40 dB / 250 ms. Tune via --db / --min for noisy sources
 * (Scene IX has continuous signal beds and needs much more permissive
 * thresholds, or a different approach entirely).
 */

const SCENE_DIR = resolve("public/assets/audio");

interface Region {
  start_ms: number;
  end_ms: number;
  duration_ms: number;
}

function detectSilences(
  samples: Float32Array,
  sample_rate: number,
  threshold_db: number,
  min_ms: number,
): Region[] {
  const win_size = Math.max(1, Math.floor(sample_rate * 0.02)); // 20 ms windows
  const win_ms = (win_size / sample_rate) * 1000;
  const min_silent_windows = Math.max(1, Math.ceil(min_ms / win_ms));
  const threshold = Math.pow(10, threshold_db / 20);
  const regions: Region[] = [];
  let in_silence = false;
  let start_sample = 0;
  let silent_count = 0;

  for (let w = 0; w + win_size <= samples.length; w += win_size) {
    let sum_sq = 0;
    for (let i = 0; i < win_size; i++) {
      const s = samples[w + i]!;
      sum_sq += s * s;
    }
    const rms = Math.sqrt(sum_sq / win_size);
    if (rms < threshold) {
      if (!in_silence) {
        start_sample = w;
        in_silence = true;
        silent_count = 0;
      }
      silent_count++;
    } else {
      if (in_silence && silent_count >= min_silent_windows) {
        regions.push({
          start_ms: Math.round((start_sample / sample_rate) * 1000),
          end_ms: Math.round((w / sample_rate) * 1000),
          duration_ms: Math.round(((w - start_sample) / sample_rate) * 1000),
        });
      }
      in_silence = false;
      silent_count = 0;
    }
  }
  if (in_silence && silent_count >= min_silent_windows) {
    regions.push({
      start_ms: Math.round((start_sample / sample_rate) * 1000),
      end_ms: Math.round((samples.length / sample_rate) * 1000),
      duration_ms: Math.round(
        ((samples.length - start_sample) / sample_rate) * 1000,
      ),
    });
  }
  return regions;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let threshold_db = -40;
  let min_ms = 250;
  const scenes: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--db") {
      threshold_db = Number(argv[++i]);
    } else if (a === "--min") {
      min_ms = Number(argv[++i]);
    } else {
      scenes.push(a);
    }
  }
  if (scenes.length === 0) {
    process.stderr.write(
      "usage: tsx scripts/scan-silences.ts <scene_id>... [--db N] [--min MS]\n",
    );
    process.exit(1);
  }
  for (const scene of scenes) {
    const path = scene.endsWith(".wav")
      ? resolve(scene)
      : join(SCENE_DIR, `${scene}.wav`);
    const pcm = await readWav(path);
    const total_ms = Math.round((pcm.samples.length / pcm.sample_rate) * 1000);
    const regions = detectSilences(pcm.samples, pcm.sample_rate, threshold_db, min_ms);
    process.stdout.write(
      `\n${scene}  (${total_ms} ms total, ${threshold_db} dB / ${min_ms} ms)\n`,
    );
    for (const [i, r] of regions.entries()) {
      process.stdout.write(
        `  ${String(i).padStart(2)}  ${String(r.start_ms).padStart(7)}–${String(r.end_ms).padStart(7)} ms   (${String(r.duration_ms).padStart(5)} ms)\n`,
      );
    }
  }
}

main().catch((err) => {
  process.stderr.write(
    `scan-silences: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
