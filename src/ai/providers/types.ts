import type { Analysis } from "@/ai/schemas/analysis-schema";

/**
 * Provider abstraction for the AI interpretation layer. Implementations
 * receive fully rendered prompts and must return output that already
 * validates against the analysis schema (throw on failure — the caller
 * handles fallback).
 */
export interface AiProvider {
  readonly name: string;
  generateAnalysis(input: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<Analysis>;
}
