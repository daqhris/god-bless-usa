import { z } from "zod";
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
