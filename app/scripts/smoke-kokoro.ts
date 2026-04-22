// Apply the kokoro-js __dirname shim by importing the adapter module first.
// The shim runs at module load and sets globalThis.__dirname before we call
// kokoro-js ourselves.
import "../src/voices/kokoro.js";
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained(
  "onnx-community/Kokoro-82M-v1.0-ONNX",
  { dtype: "q8", device: "cpu" },
);
process.stderr.write("loaded; calling generate…\n");
try {
  const audio = await tts.generate("Hello world.", { voice: "af_heart", speed: 1 });
  process.stderr.write(
    `ok — samples=${audio.audio.length} rate=${audio.sampling_rate}\n`,
  );
  await audio.save("dist/smoke.wav");
  process.stderr.write("saved dist/smoke.wav\n");
} catch (err) {
  process.stderr.write(
    `FAIL — ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
}
