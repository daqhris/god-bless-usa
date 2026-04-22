import type { VoiceName } from "../director/voices.js";

export const KOKORO_VOICE_MAP: Record<VoiceName, string> = {
  eyewitness: "af_heart",
  church_leader: "bm_george",
  chorus: "bf_emma",
  praying_alien: "am_puck",
};

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const KOKORO_SAMPLE_RATE = 24000;
