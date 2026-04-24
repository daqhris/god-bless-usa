import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

// Mono, speech + low-amplitude ambient. 32 kbps Opus is transparent for this
// kind of content; AAC at 64 kbps mono is the reliable fallback for iOS Safari
// (which only added OGG/Opus in iOS 17 — older devices still need AAC/MP3).
const OPUS_BITRATE = "32k";
const AAC_BITRATE = "64k";

// Encoding the full master can take ~20–30 s; ffmpeg writes progress to stderr
// and we ignore it. Bump maxBuffer so large stderr dumps don't crash the call.
const EXEC_OPTS = { maxBuffer: 32 * 1024 * 1024 };

async function encodeOne(wav_path: string): Promise<void> {
  const dir = resolve(wav_path, "..");
  const stem = basename(wav_path, ".wav");
  const opus_out = join(dir, `${stem}.opus.ogg`);
  const aac_out = join(dir, `${stem}.m4a`);

  await exec(
    ffmpegPath!,
    [
      "-y",
      "-i", wav_path,
      "-c:a", "libopus",
      "-b:a", OPUS_BITRATE,
      "-ac", "1",
      "-application", "audio",
      "-vbr", "on",
      opus_out,
    ],
    EXEC_OPTS,
  );

  await exec(
    ffmpegPath!,
    [
      "-y",
      "-i", wav_path,
      "-c:a", "aac",
      "-b:a", AAC_BITRATE,
      "-ac", "1",
      "-movflags", "+faststart",
      aac_out,
    ],
    EXEC_OPTS,
  );

  const [w, o, a] = await Promise.all([stat(wav_path), stat(opus_out), stat(aac_out)]);
  const mb = (n: number) => (n / 1024 / 1024).toFixed(2);
  process.stderr.write(
    `  ${stem.padEnd(28)}  wav ${mb(w.size).padStart(6)} MB  →  opus ${mb(o.size).padStart(5)} MB   aac ${mb(a.size).padStart(5)} MB\n`,
  );
}

async function main(): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not resolve a binary for this platform");
  }

  const argv = process.argv.slice(2);
  const target = argv[0] ? resolve(argv[0]) : resolve("public/assets/audio");

  const st = await stat(target);
  let wavs: string[];
  if (st.isDirectory()) {
    const entries = await readdir(target);
    wavs = entries.filter((f) => f.endsWith(".wav")).sort().map((f) => join(target, f));
  } else {
    wavs = [target];
  }
  if (wavs.length === 0) {
    throw new Error(`no .wav files at ${target}`);
  }

  process.stderr.write(`encode-audio: ${wavs.length} file(s) → Opus (${OPUS_BITRATE}) + AAC (${AAC_BITRATE})\n`);
  for (const w of wavs) {
    await encodeOne(w);
  }
}

main().catch((err) => {
  process.stderr.write(
    `encode-audio: error — ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
