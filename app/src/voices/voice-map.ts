import type { VoiceName } from "../director/voices.js";

export const KOKORO_VOICE_MAP: Record<VoiceName, string> = {
  eyewitness: "af_heart",
  church_leader: "bm_george",
  chorus: "bf_emma", // used as fallback / solo voice; ensemble below produces the choral texture
  praying_alien: "af_nicole", // 🎧 intimate-headphone voice — fits an interior monologue that doesn't know it's being overheard
  full_ensemble: "bm_george", // fallback only; the adapter renders this through FULL_ENSEMBLE below
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

/**
 * FULL ENSEMBLE — every voice together. Used for the two collective utterances
 * in the piece: AMEN at the end of the leader's exhortation, HUGS at the
 * moment of warmth in the prayer. Six lanes:
 *   - The Church Leader (foreground, slightly louder)
 *   - The four Chorus voices (background congregation)
 *   - The Praying Alien (joining audibly — they have rejoined the room)
 *
 * Per-lane gains chosen so the leader stays just-perceptible-as-leader, the
 * chorus carries the collective body, and the alien is present rather than
 * dominant. Sums above 1.0 in worst case but mix.ts clamps to [-1, 1].
 */
export const FULL_ENSEMBLE: Array<{
  voice_id: string;
  offset_ms: number;
  gain: number;
}> = [
  { voice_id: "bm_george", offset_ms: 0, gain: 0.32 }, // Church Leader, anchor
  { voice_id: "bf_emma", offset_ms: 6, gain: 0.18 },
  { voice_id: "af_bella", offset_ms: -4, gain: 0.18 },
  { voice_id: "af_sarah", offset_ms: 9, gain: 0.18 },
  { voice_id: "am_michael", offset_ms: -7, gain: 0.18 },
  { voice_id: "af_nicole", offset_ms: 12, gain: 0.22 }, // Praying Alien, just behind the leader
];

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const KOKORO_SAMPLE_RATE = 24000;
