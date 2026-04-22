import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";
import { DirectorOutputSchema, type DirectorOutput } from "./schema.js";
import { DIRECTOR_SYSTEM_PROMPT } from "./prompts.js";

// @anthropic-ai/sdk 0.88–0.90 types zodOutputFormat against Zod v3's ZodType,
// but the helper's *runtime* calls Zod v4's toJSONSchema. Our schema is built
// with the zod/v4 API (see schema.ts) so the runtime path is correct; only
// the TypeScript signature lags the implementation. The cast below makes the
// lag explicit rather than silencing it with `any`. Revisit when the SDK
// updates its helper types to v4.
const directorSchemaForSdk = DirectorOutputSchema as unknown as ZodType<
  DirectorOutput
>;

export interface DirectSceneInput {
  scene_id: string;
  scene_text: string;
}

export interface DirectSceneResult {
  output: DirectorOutput;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
}

export async function directScene(
  client: Anthropic,
  input: DirectSceneInput,
): Promise<DirectSceneResult> {
  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: DIRECTOR_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      effort: "high",
      format: zodOutputFormat(directorSchemaForSdk),
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Scene id: ${input.scene_id}\n\nScene (director's score):\n\n${input.scene_text}`,
          },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Director returned no parsed_output. stop_reason=${response.stop_reason}`,
    );
  }

  return {
    output: response.parsed_output,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens:
        response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
