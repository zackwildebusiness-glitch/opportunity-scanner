import { z } from "zod";

/**
 * Contract for AI-generated report content. Everything here is presentation
 * copy derived from verified findings — the AI never invents scores or
 * technical facts, and the report renders fine if this entire layer fails.
 */
export const analysisSchema = z.object({
  executiveSummary: z
    .string()
    .min(1)
    .describe(
      "2-3 paragraph plain-English summary of the audit for a business owner",
    ),
  interpretation: z
    .string()
    .min(1)
    .describe("Plain-English interpretation of what the scores mean"),
  copySuggestions: z.object({
    headline: z.string().min(1).describe("Suggested homepage headline"),
    subheadline: z.string().min(1).describe("Suggested supporting subheadline"),
    primaryCta: z.string().min(1).describe("Suggested primary call to action"),
    secondaryCta: z
      .string()
      .min(1)
      .describe("Suggested secondary call to action"),
  }),
  serviceOpportunities: z
    .array(
      z.object({
        service: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .min(1)
    .max(6)
    .describe("Wilde Digital services that address the findings"),
  implementationScope: z
    .string()
    .min(1)
    .describe("Suggested scope of an implementation engagement"),
  outreachDraft: z
    .string()
    .min(1)
    .describe("Short prospect outreach email draft referencing key findings"),
  topFixExplanations: z
    .array(
      z.object({
        ruleId: z.string().min(1),
        explanation: z
          .string()
          .min(1)
          .describe("Why this fix matters in business terms"),
      }),
    )
    .min(1)
    .max(8),
});

export type Analysis = z.infer<typeof analysisSchema>;
