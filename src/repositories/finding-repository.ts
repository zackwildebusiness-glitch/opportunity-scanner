import "server-only";

import type {
  AuditCategory,
  AuditFinding,
  FindingSeverity,
  FindingStatus,
} from "@/types/audit";
import { getAdminClient } from "@/lib/supabase/admin";

interface FindingRow {
  rule_id: string;
  category: AuditCategory;
  title: string;
  description: string;
  status: FindingStatus;
  severity: FindingSeverity;
  evidence: string[];
  recommendation: string;
  score_impact: number;
}

export async function saveFindings(
  scanId: string,
  findings: AuditFinding[],
): Promise<void> {
  if (findings.length === 0) return;

  const rows = findings.map((finding) => ({
    scan_id: scanId,
    rule_id: finding.ruleId,
    category: finding.category,
    title: finding.title,
    description: finding.description,
    status: finding.status,
    severity: finding.severity,
    evidence: finding.evidence,
    recommendation: finding.recommendation,
    score_impact: finding.scoreImpact,
  }));

  // Upsert keyed on (scan_id, rule_id) so job retries never duplicate rows.
  const { error } = await getAdminClient()
    .from("audit_findings")
    .upsert(rows, { onConflict: "scan_id,rule_id" });

  if (error) {
    throw new Error(`Failed to save findings: ${error.message}`);
  }
}

export async function getFindingsByScanId(
  scanId: string,
): Promise<AuditFinding[]> {
  const { data, error } = await getAdminClient()
    .from("audit_findings")
    .select(
      "rule_id, category, title, description, status, severity, evidence, recommendation, score_impact",
    )
    .eq("scan_id", scanId);

  if (error) {
    throw new Error(`Failed to load findings: ${error.message}`);
  }

  return (data as FindingRow[]).map((row) => ({
    ruleId: row.rule_id,
    category: row.category,
    title: row.title,
    description: row.description,
    status: row.status,
    severity: row.severity,
    evidence: row.evidence ?? [],
    recommendation: row.recommendation,
    scoreImpact: Number(row.score_impact),
  }));
}
