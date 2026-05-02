import "dotenv/config";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import type { DirectorOutput } from "../src/director/schema.js";
import { kokoroAdapter } from "../src/voices/kokoro.js";

/**
 * Render the trailer-only Kokoro fragments that can't be cleanly sliced
 * from the existing scene WAVs. Currently one fragment:
 *
 *   beat-4-skies.wav — the praying-alien line "Skies, like flashlights
 *     flickering on screens, are lit up by unknown and unidentified
 *     beings!" Lives mid-segment in Scene IX's long Train-of-Thoughts
 *     SSML block, where slicing the existing 09-praying-alien.wav can't
 *     find clean phrase boundaries (continuous signal beds mask silence
 *     detection). Re-rendering the line in isolation produces a clean,
 *     dry praying-alien fragment with no bed — fitting for a teaser
 *     that already changes acoustic register on every beat.
 *
 * Output goes to dist/trailer-fragments/. build-trailer.ts reads from
 * here and splices into the trailer alongside the WAV slices.
 */

const OUT_DIR = resolve("dist/trailer-fragments");

// Each fragment is rendered as a one-segment scene through the same
// kokoroAdapter the master uses. Voice / speed / reverb match the
// corresponding source segment exactly so the rendering character is
// preserved.
const FRAGMENTS: DirectorOutput[] = [
  {
    scene_id: "beat-4-skies",
    title: "Trailer beat 4 — Praying alien skies fragment",
    segments: [
      {
        type: "speech",
        voice: "praying_alien",
        ssml: '<speak>Skies, like flashlights flickering on screens, <break time="600ms"/> are lit up by <emphasis level="moderate">unknown and unidentified beings</emphasis>!</speak>',
        speed: 0.95,
        post_processing: {
          reverb: "none",
          pitch_shift_semitones: 0,
          dry_close: true,
        },
        director_note:
          "Trailer-only re-render of one phrase from Scene IX segment 6. Dry, close, no reverb — preserves the intimate interior register the master uses for praying alien.",
      },
    ],
    overall_notes:
      "Standalone fragment for the promotional trailer. Not part of the canonical performance.",
  },
];

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  for (const fragment of FRAGMENTS) {
    const result = await kokoroAdapter.render(fragment, { out_dir: OUT_DIR });
    process.stderr.write(
      `render-trailer-fragments: ${fragment.scene_id} → ${result.total_duration_ms}ms\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(
    `render-trailer-fragments: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
