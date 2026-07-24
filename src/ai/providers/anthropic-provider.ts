import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { analysisSchema, type Analysis } from "@/ai/schemas/analysis-schema";
import type { AiProvider } from "@/ai/providers/types";

const MODEL = "claude-opus-4-8";

export function createAnthropicProvider(apiKey: string): AiProvider {
  // Bound the generating stage: the SDK default timeout is ~10 minutes, which
  // would strand a scan at 85% far past the ~1-minute target. A timed-out or
  // failed call degrades gracefully to the deterministic report.
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 });

  return {
    name: "anthropic",

    async generateAnalysis({ systemPrompt, userPrompt }): Promise<Analysis> {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        output_config: {
          format: zodOutputFormat(analysisSchema),
        },
      });

      if (!response.parsed_output) {
        throw new Error(
          `Anthropic response did not parse against the analysis schema (stop_reason: ${response.stop_reason})`,
        );
      }

      // Belt-and-braces: re-validate so downstream code can trust the shape
      // regardless of provider implementation details.
      return analysisSchema.parse(response.parsed_output);
    },
  };
}
