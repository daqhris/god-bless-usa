import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { DirectorOutputSchema } from "../src/director/schema.js";
import { DEFAULT_PLAYLIST } from "../src/playlist.js";
import { kokoroAdapter } from "../src/voices/kokoro.js";

/**
 * Re-render every scene's audio from its cached director JSON — no Claude
 * calls, Kokoro-only. Use after changes to the voice adapter (new beds,
 * reverb, mix changes) to regenerate every scene WAV without paying for
 * a fresh director pass.
 */

const DIRECTIONS_DIR = resolve("dist/directions");
const AUDIO_OUT = resolve("public/assets/audio");

async function main(): Promise<void> {
  for (const [idx, scene_id] of DEFAULT_PLAYLIST.entries()) {
    const path = join(DIRECTIONS_DIR, `${scene_id}.json`);
    const raw = await readFile(path, "utf8");
    const parsed = DirectorOutputSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(
        `${path} failed schema validation: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    process.stderr.write(
      `[${idx + 1}/${DEFAULT_PLAYLIST.length}] rendering ${scene_id}…\n`,
    );
    const result = await kokoroAdapter.render(parsed.data, { out_dir: AUDIO_OUT });
    process.stderr.write(
      `  ${scene_id.padEnd(34)} ${String(result.total_duration_ms).padStart(6)} ms\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(
    `rerender-all-audio: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
