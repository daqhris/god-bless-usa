import type { DirectorOutput, Segment } from "../director/schema.js";

export interface RenderedSegment {
  segment: Segment;
  audio_path: string;
  duration_ms: number;
}

export interface RenderedScene {
  scene_id: string;
  segments: RenderedSegment[];
  total_duration_ms: number;
}

export interface VoiceAdapter {
  readonly id: string;
  readonly licence: string;
  render(
    direction: DirectorOutput,
    opts: { out_dir: string },
  ): Promise<RenderedScene>;
}
