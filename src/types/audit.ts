/** Result state for an individual audit rule finding. */
export type FindingStatus = "pass" | "warning" | "fail";

/** Business and technical severity assigned to an audit finding. */
export type FindingSeverity = "low" | "medium" | "high" | "critical";

/** Supported audit areas used by findings, scoring, and reports. */
export type AuditCategory =
  | "seo"
  | "performance"
  | "mobile"
  | "accessibility"
  | "conversion"
  | "trust";

/** A single rule result produced by the audit engine. */
export interface AuditFinding {
  ruleId: string;
  category: AuditCategory;
  title: string;
  description: string;
  status: FindingStatus;
  severity: FindingSeverity;
  evidence: string[];
  recommendation: string;
  scoreImpact: number;
}

/** A prioritized recommendation surfaced in the final report. */
export interface PriorityAction {
  id: string;
  title: string;
  category: AuditCategory;
  reason: string;
  severity: FindingSeverity;
  estimatedEffort: "low" | "medium" | "high";
  estimatedImpact: "low" | "medium" | "high";
  recommendedOrder: number;
  relatedRuleIds: string[];
}

/** Relative contribution of each audit category to the overall score. */
export const CATEGORY_WEIGHTS: Record<AuditCategory, number> = {
  conversion: 0.30,
  seo: 0.20,
  performance: 0.20,
  mobile: 0.15,
  trust: 0.10,
  accessibility: 0.05,
};
