import type { AuditCategory, AuditFinding } from "@/types/audit";

/**
 * Category score = 100 minus the summed scoreImpact of every non-pass
 * finding in that category, floored at 0. Deterministic by construction:
 * same findings in, same score out.
 */
export function calculateCategoryScore(
  category: AuditCategory,
  findings: AuditFinding[],
): number {
  const penalty = findings
    .filter((finding) => finding.category === category)
    .filter((finding) => finding.status !== "pass")
    .reduce((sum, finding) => sum + Math.max(0, finding.scoreImpact), 0);

  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
