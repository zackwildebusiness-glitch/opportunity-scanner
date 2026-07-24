import {
  CATEGORY_WEIGHTS,
  type AuditCategory,
  type AuditFinding,
  type FindingSeverity,
} from "@/types/audit";
import type { CategoryScore, ScoreSummary } from "@/types/report";

import { calculateCategoryScore } from "./calculate-category-score";

const ALL_CATEGORIES = Object.keys(CATEGORY_WEIGHTS) as AuditCategory[];

const ALL_SEVERITIES: FindingSeverity[] = ["low", "medium", "high", "critical"];

/**
 * Overall score is the weight-blended category score, 0–100.
 * Weights are the fixed product decision in CATEGORY_WEIGHTS
 * (conversion 30, seo 20, performance 20, mobile 15, trust 10, a11y 5).
 */
export function calculateScoreSummary(findings: AuditFinding[]): ScoreSummary {
  const categoryScores: CategoryScore[] = ALL_CATEGORIES.map((category) => ({
    category,
    score: calculateCategoryScore(category, findings),
    weight: CATEGORY_WEIGHTS[category],
  }));

  const overall = categoryScores.reduce(
    (sum, entry) => sum + entry.score * entry.weight,
    0,
  );

  const severityCounts = Object.fromEntries(
    ALL_SEVERITIES.map((severity) => [
      severity,
      findings.filter(
        (finding) => finding.status !== "pass" && finding.severity === severity,
      ).length,
    ]),
  ) as Record<FindingSeverity, number>;

  return {
    overallScore: Math.max(0, Math.min(100, Math.round(overall))),
    categoryScores,
    severityCounts,
    passCount: findings.filter((finding) => finding.status === "pass").length,
    warningCount: findings.filter((finding) => finding.status === "warning")
      .length,
    failCount: findings.filter((finding) => finding.status === "fail").length,
  };
}
