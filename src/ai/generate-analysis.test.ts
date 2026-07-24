import { describe, expect, it, vi } from "vitest";

// server-only is a no-op outside the Next.js server runtime.
vi.mock("server-only", () => ({}));

const { generateAnalysis } = await import("@/ai/generate-analysis");
const { analysisSchema } = await import("@/ai/schemas/analysis-schema");

const validAnalysis = {
  executiveSummary: "The site scores 62/100 with clear opportunities.",
  interpretation: "Scores in this range usually mean quick wins exist.",
  copySuggestions: {
    headline: "Websites that win clients",
    subheadline: "Built for conversion from day one",
    primaryCta: "Book a free call",
    secondaryCta: "See our work",
  },
  serviceOpportunities: [
    { service: "Technical SEO fixes", reason: "Missing metadata across the page." },
  ],
  implementationScope: "A one-week sprint covering metadata and CTA work.",
  outreachDraft: "Hi — I ran a quick audit of your site and noticed two things...",
  topFixExplanations: [
    { ruleId: "seo-missing-title", explanation: "Search engines need a title." },
  ],
};

const baseInput = {
  url: "https://example.com/",
  summary: {
    overallScore: 62,
    categoryScores: [],
    severityCounts: { low: 0, medium: 1, high: 1, critical: 0 },
    passCount: 10,
    warningCount: 3,
    failCount: 2,
  },
  findings: [],
  priorityActions: [],
};

describe("analysisSchema", () => {
  it("accepts a complete analysis", () => {
    expect(analysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("rejects missing sections and empty strings", () => {
    expect(
      analysisSchema.safeParse({ ...validAnalysis, executiveSummary: "" })
        .success,
    ).toBe(false);

    const { copySuggestions: _drop, ...withoutCopy } = validAnalysis;
    expect(analysisSchema.safeParse(withoutCopy).success).toBe(false);
  });
});

describe("generateAnalysis", () => {
  it("returns completed with a working provider", async () => {
    const result = await generateAnalysis(baseInput, {
      name: "mock",
      generateAnalysis: async () => validAnalysis,
    });

    expect(result).toEqual({ status: "completed", analysis: validAnalysis });
  });

  it("returns skipped when no provider is configured", async () => {
    const result = await generateAnalysis(baseInput, null);

    expect(result).toEqual({ status: "skipped" });
  });

  it("returns failed when the provider throws — never propagates", async () => {
    const result = await generateAnalysis(baseInput, {
      name: "mock",
      generateAnalysis: async () => {
        throw new Error("provider exploded");
      },
    });

    expect(result).toEqual({ status: "failed" });
  });
});
