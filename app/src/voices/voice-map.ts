import type { VoiceName } from "../director/voices.js";

export const KOKORO_VOICE_MAP: Record<VoiceName, string> = {
  eyewitness: "af_heart",
  church_leader: "bm_george",
  chorus: "bf_emma", // used as fallback / solo voice; ensemble below produces the choral texture
  praying_alien: "af_nicole", // 🎧 intimate-headphone voice — fits an interior monologue that doesn't know it's being overheard
};

/**
 * CHORUS is "the congregation fused into a single voice." We render the same
 * SSML through a four-voice ensemble and sum with small timing offsets. Notes:
 *
 *   - Three female + one male voice — gives diversity of pitch/timbre the way
 *     a real congregation reads "diverse voices in the church saying amen."
 *   - Offsets are deliberately tight (≤ 10 ms) so the congregation feels
 *     near-synchronous, not scattered. Chorus in this piece is collective
 *     validation, not a round.
 *   - `af_nicole` was previously in the chorus; she's now the PRAYING ALIEN,
 *     so we dropped her here and added `af_sarah` + `am_michael` in her place.
 */
export const CHORUS_ENSEMBLE: Array<{ voice_id: string; offset_ms: number }> = [
  { voice_id: "bf_emma", offset_ms: 0 },
  { voice_id: "af_bella", offset_ms: 6 },
  { voice_id: "af_sarah", offset_ms: -5 },
  { voice_id: "am_michael", offset_ms: 9 },
];

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const KOKORO_SAMPLE_RATE = 24000;
