import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

// Freesound 197458 — "Rome Vatican Changing.wav" by everythingsounds, CC-BY 4.0.
// Seconds 15–40 contain the cleanest sustained peal with no speaking-voice
// bleed and no traffic noise. 25 s gives us enough material to cross-fade or
// layer under the synthesized organ drone in the opening-invocation mix.
const TRIM_START = 15;
const TRIM_DURATION = 25;

// A short fade on both edges kills any click from cutting mid-waveform. 150 ms
// is gentle enough to be inaudible against a bell's natural attack / decay.
const FADE_MS = 150;

const DEFAULT_OUT = resolve(
  "public/assets/audio/source/rome-vatican-bells-25s.wav",
);

async function main(): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not resolve a binary for this platform");
  }

  const argv = process.argv.slice(2);
  const input = argv[0];
  const output = argv[1] ? resolve(argv[1]) : DEFAULT_OUT;

  if (!input) {
    throw new Error(
      "usage: tsx scripts/prepare-bell-sample.ts <input.wav> [output.wav]\n\n" +
        "download the CC-BY source from\n" +
        "  https://freesound.org/people/everythingsounds/sounds/197458/\n" +
        "and pass its local path as the first argument.",
    );
  }

  const input_abs = resolve(input);
  await stat(input_abs);

  await mkdir(dirname(output), { recursive: true });

  const fade_s = FADE_MS / 1000;
  const fade_out_start = (TRIM_DURATION - fade_s).toFixed(3);
  const filters = [
    `afade=t=in:st=0:d=${fade_s}`,
    `afade=t=out:st=${fade_out_start}:d=${fade_s}`,
    // Normalize peaks to −1 dBFS so the sample sits predictably in the mix.
    "loudnorm=I=-18:TP=-1.0:LRA=11",
  ].join(",");

  await exec(
    ffmpegPath,
    [
      "-y",
      "-ss", String(TRIM_START),
      "-t", String(TRIM_DURATION),
      "-i", input_abs,
      "-af", filters,
      "-ac", "1",
      "-ar", "24000",
      "-c:a", "pcm_s16le",
      output,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );

  const s = await stat(output);
  process.stderr.write(
    `prepare-bell-sample: ${input_abs}\n  → ${output} (${(s.size / 1024).toFixed(1)} KB, ${TRIM_DURATION}s, 24 kHz mono)\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `prepare-bell-sample: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
