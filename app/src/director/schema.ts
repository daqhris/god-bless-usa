// The Anthropic SDK's `zodOutputFormat` helper (in @anthropic-ai/sdk ≥ 0.88)
// runs schemas through Zod v4's JSON-schema converter, which reads `.def` on
// each node. Zod's root "zod" export is still v3 (which uses `._def`), so
// importing from there produces a schema that crashes the helper with
// "Cannot read properties of undefined (reading 'def')". The zod package
// (3.25.x) ships both APIs; pulling `z` from "zod/v4" gives v4-shaped nodes.
import { z } from "zod/v4";
import { VOICE_NAMES } from "./voices.js";

const PostProcessingSchema = z.object({
  reverb: z.enum(["none", "light", "medium", "heavy"]),
  pitch_shift_semitones: z.number(),
  dry_close: z.boolean(),
});

const SpeechSegmentSchema = z.object({
  type: z.literal("speech"),
  voice: z.enum(VOICE_NAMES),
  ssml: z.string(),
  // Base speech rate for this segment. 1.0 is Kokoro's default neutral
  // delivery. Typical range 0.85–1.15. Use slower values (0.85–0.92) for
  // reverent / pastoral weight; faster values (1.05–1.12) for accelerating
  // passages like the Praying Alien's signals. <emphasis> tags inside the
  // SSML further slow specific phrases within a segment — they compose
  // multiplicatively with this base speed in the adapter.
  speed: z.number(),
  post_processing: PostProcessingSchema,
  director_note: z.string(),
});

const SilenceSegmentSchema = z.object({
  type: z.literal("silence"),
  duration_ms: z.number(),
  director_note: z.string(),
});

const AmbientSegmentSchema = z.object({
  type: z.literal("ambient"),
  cue: z.string(),
  duration_ms: z.number(),
  director_note: z.string(),
});

export const SegmentSchema = z.discriminatedUnion("type", [
  SpeechSegmentSchema,
  SilenceSegmentSchema,
  AmbientSegmentSchema,
]);

export const DirectorOutputSchema = z.object({
  scene_id: z.string(),
  title: z.string(),
  segments: z.array(SegmentSchema),
  overall_notes: z.string(),
});

export type DirectorOutput = z.infer<typeof DirectorOutputSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
