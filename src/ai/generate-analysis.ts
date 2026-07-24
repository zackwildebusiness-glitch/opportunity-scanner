import "server-only";

import { createAnthropicProvider } from "@/ai/providers/anthropic-provider";
import type { AiProvider } from "@/ai/providers/types";
import type { Analysis } from "@/ai/schemas/analysis-schema";
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisPrompt,
  type SampledPageSummary,
} from "@/ai/prompts/analysis-prompt";
import { getEnv } from "@/lib/env";
import type { AuditFinding, PriorityAction } from "@/types/audit";
import type { ScoreSummary } from "@/types/report";

export type AnalysisResult =
  | { status: "completed"; analysis: Analysis }
  | { status: "skipped" }
  | { status: "failed" };

function resolveProvider(): AiProvider | null {
  const env = getEnv();

  if (env.ANTHROPIC_API_KEY) {
    return createAnthropicProvider(env.ANTHROPIC_API_KEY);
  }

  return null;
}

/**
 * Generates the AI interpretation layer for a completed audit.
 * Never throws: the report must remain fully usable without AI content,
 * so failures collapse to { status: "failed" } and a missing API key to
 * { status: "skipped" }.
 */
export async function generateAnalysis(
  input: {
    url: string;
    summary: ScoreSummary;
    findings: AuditFinding[];
    priorityActions: PriorityAction[];
    sampledPages?: SampledPageSummary[];
  },
  provider: AiProvider | null = resolveProvider(),
): Promise<AnalysisResult> {
  if (!provider) {
    return { status: "skipped" };
  }

  try {
    const analysis = await provider.generateAnalysis({
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      userPrompt: buildAnalysisPrompt(input),
    });

    return { status: "completed", analysis };
  } catch (error) {
    console.error(`AI analysis failed (provider: ${provider.name}):`, error);

    return { status: "failed" };
  }
}
