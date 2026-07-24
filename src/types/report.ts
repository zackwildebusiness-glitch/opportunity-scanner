import type {
  AuditCategory,
  FindingSeverity,
  PriorityAction,
} from "./audit";

/** Weighted score for a single audit category. */
export interface CategoryScore {
  category: AuditCategory;
  score: number;
  weight: number;
}

/** Aggregated score and finding counts for a completed audit. */
export interface ScoreSummary {
  overallScore: number;
  categoryScores: CategoryScore[];
  severityCounts: Record<FindingSeverity, number>;
  passCount: number;
  warningCount: number;
  failCount: number;
}

/** Persisted report generated from a completed website scan. */
export interface Report {
  id: string;
  scanId: string;
  overallScore: number;
  executiveSummary: string | null;
  priorityActions: PriorityAction[];
  copySuggestions: unknown | null;
  serviceOpportunities: unknown | null;
  aiStatus: "pending" | "completed" | "failed" | "skipped";
  createdAt: string;
  updatedAt: string;
}
