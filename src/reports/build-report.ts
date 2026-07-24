import "server-only";

import type { AuditFinding } from "@/types/audit";
import type { Report, ScoreSummary } from "@/types/report";
import { calculateScoreSummary } from "@/scoring/calculate-overall-score";
import { prioritizeFindings } from "@/scoring/prioritize-findings";
import {
  saveCategoryScores,
  upsertReport,
} from "@/repositories/report-repository";

/**
 * Deterministic report assembly: scores + priorities from verified findings.
 * AI content (summary, copy suggestions) is layered on afterwards and the
 * report stays fully usable when that layer fails or is skipped.
 */
export async function buildReport(
  scanId: string,
  findings: AuditFinding[],
): Promise<{ report: Report; summary: ScoreSummary }> {
  const summary = calculateScoreSummary(findings);
  const priorityActions = prioritizeFindings(findings);

  await saveCategoryScores(scanId, summary.categoryScores);

  const report = await upsertReport({
    scanId,
    overallScore: summary.overallScore,
    priorityActions,
    aiStatus: "pending",
  });

  return { report, summary };
}
