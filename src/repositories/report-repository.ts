import "server-only";

import type { AuditCategory, PriorityAction } from "@/types/audit";
import type { CategoryScore, Report } from "@/types/report";
import { getAdminClient } from "@/lib/supabase/admin";

export async function saveCategoryScores(
  scanId: string,
  scores: CategoryScore[],
): Promise<void> {
  const rows = scores.map((score) => ({
    scan_id: scanId,
    category: score.category,
    score: score.score,
    weight: score.weight,
  }));

  const { error } = await getAdminClient()
    .from("category_scores")
    .upsert(rows, { onConflict: "scan_id,category" });

  if (error) {
    throw new Error(`Failed to save category scores: ${error.message}`);
  }
}

export async function getCategoryScores(
  scanId: string,
): Promise<CategoryScore[]> {
  const { data, error } = await getAdminClient()
    .from("category_scores")
    .select("category, score, weight")
    .eq("scan_id", scanId);

  if (error) {
    throw new Error(`Failed to load category scores: ${error.message}`);
  }

  return (data as { category: AuditCategory; score: number; weight: number }[]).map(
    (row) => ({
      category: row.category,
      score: row.score,
      weight: Number(row.weight),
    }),
  );
}

interface ReportRow {
  id: string;
  scan_id: string;
  overall_score: number;
  executive_summary: string | null;
  priority_actions: PriorityAction[];
  copy_suggestions: unknown | null;
  service_opportunities: unknown | null;
  ai_status: Report["aiStatus"];
  created_at: string;
  updated_at: string;
}

function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    scanId: row.scan_id,
    overallScore: row.overall_score,
    executiveSummary: row.executive_summary,
    priorityActions: row.priority_actions ?? [],
    copySuggestions: row.copy_suggestions,
    serviceOpportunities: row.service_opportunities,
    aiStatus: row.ai_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertReport(input: {
  scanId: string;
  overallScore: number;
  executiveSummary?: string | null;
  priorityActions: PriorityAction[];
  copySuggestions?: unknown | null;
  serviceOpportunities?: unknown | null;
  aiStatus: Report["aiStatus"];
}): Promise<Report> {
  const { data, error } = await getAdminClient()
    .from("reports")
    .upsert(
      {
        scan_id: input.scanId,
        overall_score: input.overallScore,
        executive_summary: input.executiveSummary ?? null,
        priority_actions: input.priorityActions,
        copy_suggestions: input.copySuggestions ?? null,
        service_opportunities: input.serviceOpportunities ?? null,
        ai_status: input.aiStatus,
      },
      { onConflict: "scan_id" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`);
  }

  return toReport(data as ReportRow);
}

export async function getReportByScanId(scanId: string): Promise<Report | null> {
  const { data, error } = await getAdminClient()
    .from("reports")
    .select()
    .eq("scan_id", scanId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load report: ${error.message}`);
  }

  return data ? toReport(data as ReportRow) : null;
}
