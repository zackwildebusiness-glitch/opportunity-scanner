import type { AuditCategory, AuditFinding } from "@/types/audit";
import type { AuditInput } from "@/types/collected-data";

export type AuditRuleEffort = "low" | "medium" | "high";

export interface AuditRule {
  id: string;
  category: AuditCategory;
  /** Typical fix cost: "low" = quick config-level change, "high" = substantial
   *  build or content work. Defaults to "medium". Drives priority ordering. */
  effort?: AuditRuleEffort;
  /** A failing blocking rule gates other improvements — e.g. fixing SEO copy
   *  is pointless while the page is noindexed; trust work is undermined
   *  without HTTPS; nothing mobile matters without a viewport tag. Blockers
   *  jump to the top of the priority list. Defaults to false. */
  blocking?: boolean;
  evaluate(input: AuditInput): AuditFinding | null;
}
