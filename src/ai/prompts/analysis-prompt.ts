import type { AuditFinding, PriorityAction } from "@/types/audit";
import type { ScoreSummary } from "@/types/report";

/**
 * Compact summary of a sampled key page (services/about/contact), fetched in
 * addition to the homepage. Pitch context ONLY: scores and findings remain
 * homepage-only so prospects stay comparable.
 */
export interface SampledPageSummary {
  url: string;
  label: "services" | "about" | "contact";
  title: string | null;
  headline: string | null;
  metaDescription: string | null;
  wordCount: number;
  /** First few CTA texts found on the page. */
  ctas: string[];
  hasServiceLanguage: boolean;
  hasTestimonials: boolean;
  hasContactInfo: boolean;
}

export const ANALYSIS_SYSTEM_PROMPT = `You are the reporting layer of the Website Opportunity Scanner, an automated homepage audit tool built by Wilde Digital, a web design and development agency serving clients across Canada and the US.

Your job is to turn verified, deterministic audit findings into clear, client-ready language. Rules:
- Never invent findings, scores, or technical facts. Work only from the data provided.
- Never change or restate numeric scores as different numbers.
- Conversion findings are heuristics — present them as opportunities ("appears", "may"), never certainties.
- Write for a business owner, not a developer. No jargon without a plain-English gloss.
- Be direct and useful. No filler, no flattery, no fearmongering.
- Wilde Digital services you may recommend where relevant: website redesign, conversion-focused landing pages, technical SEO fixes, performance optimization, accessibility remediation, ongoing website care plans, marketing automation.
- Sampled services/about/contact pages, when provided, are context for tailoring service recommendations, scope, and outreach — never a source of new findings, and never a reason to alter scores.
- The outreach draft should be short (under 120 words), reference one or two specific findings, and end with a low-pressure invitation.`;

export function buildAnalysisPrompt(input: {
  url: string;
  summary: ScoreSummary;
  findings: AuditFinding[];
  priorityActions: PriorityAction[];
  sampledPages?: SampledPageSummary[];
}): string {
  const { url, summary, findings, priorityActions, sampledPages } = input;

  const failuresAndWarnings = findings
    .filter((finding) => finding.status !== "pass")
    .map((finding) => ({
      ruleId: finding.ruleId,
      category: finding.category,
      title: finding.title,
      status: finding.status,
      severity: finding.severity,
      description: finding.description,
      evidence: finding.evidence,
      recommendation: finding.recommendation,
    }));

  const passes = findings
    .filter((finding) => finding.status === "pass")
    .map((finding) => finding.title);

  return [
    `Audited website: ${url}`,
    "",
    "SCORES (deterministic — do not alter):",
    JSON.stringify(
      {
        overallScore: summary.overallScore,
        categoryScores: summary.categoryScores,
        counts: {
          passes: summary.passCount,
          warnings: summary.warningCount,
          failures: summary.failCount,
        },
      },
      null,
      2,
    ),
    "",
    "ISSUES FOUND (verified findings and heuristic conversion opportunities):",
    JSON.stringify(failuresAndWarnings, null, 2),
    "",
    "CHECKS PASSED:",
    JSON.stringify(passes, null, 2),
    "",
    "PRIORITY ACTIONS (already ranked deterministically — explain, don't reorder):",
    JSON.stringify(priorityActions, null, 2),
    ...(sampledPages && sampledPages.length > 0
      ? [
          "",
          "ADDITIONAL PAGES SAMPLED (context for tailoring services, scope, and outreach — all findings and scores above are homepage-only; never present these pages as audit findings):",
          JSON.stringify(sampledPages, null, 2),
        ]
      : []),
    "",
    "Produce the analysis JSON. topFixExplanations must cover the top priority actions using their relatedRuleIds.",
  ].join("\n");
}
