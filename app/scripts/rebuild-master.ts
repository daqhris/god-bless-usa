import { resolve, join } from "node:path";
import { DEFAULT_PLAYLIST } from "../src/playlist.js";
import { KOKORO_SAMPLE_RATE } from "../src/voices/voice-map.js";
import { concat, readWav, silence, writeWav, type Pcm } from "../src/voices/wav.js";

/**
 * Concatenate already-rendered per-scene WAVs into the master track. Use
 * after `render:audio` on individual scenes when re-running the full pipeline
 * (which calls Claude) would be wasteful. Inter-scene gap matches the default
 * used by `render:all-scenes` so the pacing is identical.
 */
const INTER_SCENE_GAP_MS = 3000;
const SCENE_DIR = resolve("public/assets/audio");
const MASTER_OUT = resolve("public/assets/audio/god-bless-usa.wav");

async function main(): Promise<void> {
  const parts: Pcm[] = [];
  for (const [idx, scene_id] of DEFAULT_PLAYLIST.entries()) {
    const path = join(SCENE_DIR, `${scene_id}.wav`);
    const pcm = await readWav(path);
    parts.push(pcm);
    const ms = Math.round((pcm.samples.length / pcm.sample_rate) * 1000);
    process.stderr.write(`  ${scene_id.padEnd(34)} ${String(ms).padStart(6)} ms\n`);
    if (idx < DEFAULT_PLAYLIST.length - 1) {
      parts.push(silence(INTER_SCENE_GAP_MS, KOKORO_SAMPLE_RATE));
    }
  }
  const master = concat(parts);
  await writeWav(MASTER_OUT, master);
  const total_s = Math.round((master.samples.length / master.sample_rate));
  process.stderr.write(
    `rebuild-master: wrote ${MASTER_OUT} (${total_s}s).\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `rebuild-master: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
