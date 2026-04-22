import type { VoiceName } from "../director/voices.js";

export const KOKORO_VOICE_MAP: Record<VoiceName, string> = {
  eyewitness: "af_heart",
  church_leader: "bm_george",
  chorus: "bf_emma", // used as fallback / solo voice; ensemble below produces the choral texture
  praying_alien: "am_puck",
};

/**
 * CHORUS is "the congregation fused into a single voice." Rather than attempt
 * phase-vocoder pitch shifting in pure JS, we render the same SSML through
 * three female voices of different natural pitches, apply small timing
 * offsets, and sum — the result reads as choral texture, not unison. Offsets
 * in milliseconds — one voice starts on time, one a hair late, one a hair
 * early relative to the reference. Keep them small (< 50 ms) or the diction
 * blurs.
 */
export const CHORUS_ENSEMBLE: Array<{ voice_id: string; offset_ms: number }> = [
  { voice_id: "bf_emma", offset_ms: 0 },
  { voice_id: "af_bella", offset_ms: 25 },
  { voice_id: "af_nicole", offset_ms: -15 },
];

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const KOKORO_SAMPLE_RATE = 24000;
