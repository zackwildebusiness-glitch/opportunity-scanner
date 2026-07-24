import {
  CATEGORY_WEIGHTS,
  type AuditFinding,
  type FindingSeverity,
  type PriorityAction,
} from "@/types/audit";

import { getAuditRuleMetadata } from "@/audit-engine/run-audit";

type Level = "low" | "medium" | "high";

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function estimateEffort(finding: AuditFinding): Level {
  return getAuditRuleMetadata(finding.ruleId).effort;
}

function estimateImpact(finding: AuditFinding): Level {
  const severity = SEVERITY_RANK[finding.severity];
  const weight = CATEGORY_WEIGHTS[finding.category];

  // High-weight categories amplify impact one step.
  if (severity >= 3) return "high";
  if (severity === 2) return weight >= 0.2 ? "high" : "medium";
  return weight >= 0.2 ? "medium" : "low";
}

function priorityScore(finding: AuditFinding): number {
  const severity = SEVERITY_RANK[finding.severity];
  const weight = CATEGORY_WEIGHTS[finding.category];
  const blocking = getAuditRuleMetadata(finding.ruleId).blocking ? 100 : 0;
  const effortBonus = { low: 6, medium: 3, high: 0 }[estimateEffort(finding)];

  return (
    blocking +
    severity * 10 +
    finding.scoreImpact +
    weight * 40 +
    effortBonus
  );
}

/**
 * Deterministic prioritization of non-pass findings into an ordered action
 * list. Priority favors: blockers first, then severity, score impact,
 * category business weight, and quick wins as a tiebreaker.
 */
export function prioritizeFindings(
  findings: AuditFinding[],
  limit = 8,
): PriorityAction[] {
  const actionable = findings
    .filter((finding) => finding.status !== "pass")
    .sort((a, b) => {
      const diff = priorityScore(b) - priorityScore(a);
      // Stable, deterministic tiebreak on ruleId.
      return diff !== 0 ? diff : a.ruleId.localeCompare(b.ruleId);
    })
    .slice(0, limit);

  return actionable.map((finding, index) => ({
    id: `action-${finding.ruleId}`,
    title: finding.title,
    category: finding.category,
    reason: getAuditRuleMetadata(finding.ruleId).blocking
      ? `${finding.description} Fixing this unblocks other improvements.`
      : finding.description,
    severity: finding.severity,
    estimatedEffort: estimateEffort(finding),
    estimatedImpact: estimateImpact(finding),
    recommendedOrder: index + 1,
    relatedRuleIds: [finding.ruleId],
  }));
}
