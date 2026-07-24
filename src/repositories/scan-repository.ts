import "server-only";

import type { Scan, ScanStage, ScanStatus } from "@/types/scan";
import { getAdminClient } from "@/lib/supabase/admin";

interface ScanRow {
  id: string;
  submitted_url: string;
  normalized_url: string;
  resolved_url: string | null;
  status: ScanStatus;
  progress: number;
  current_stage: ScanStage;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toScan(row: ScanRow): Scan {
  return {
    id: row.id,
    submittedUrl: row.submitted_url,
    normalizedUrl: row.normalized_url,
    resolvedUrl: row.resolved_url,
    status: row.status,
    progress: row.progress,
    currentStage: row.current_stage,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createScan(input: {
  submittedUrl: string;
  normalizedUrl: string;
}): Promise<Scan> {
  const { data, error } = await getAdminClient()
    .from("scans")
    .insert({
      submitted_url: input.submittedUrl,
      normalized_url: input.normalizedUrl,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create scan: ${error.message}`);
  }

  return toScan(data as ScanRow);
}

export async function getScanById(id: string): Promise<Scan | null> {
  const { data, error } = await getAdminClient()
    .from("scans")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load scan: ${error.message}`);
  }

  return data ? toScan(data as ScanRow) : null;
}

export async function updateScanProgress(
  id: string,
  update: {
    stage: ScanStage;
    progress: number;
    status?: ScanStatus;
    resolvedUrl?: string;
    startedAt?: string;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {
    current_stage: update.stage,
    progress: update.progress,
  };

  if (update.status) patch.status = update.status;
  if (update.resolvedUrl) patch.resolved_url = update.resolvedUrl;
  if (update.startedAt) patch.started_at = update.startedAt;

  const { error } = await getAdminClient()
    .from("scans")
    .update(patch)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update scan progress: ${error.message}`);
  }
}

export async function markScanCompleted(id: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("scans")
    .update({
      status: "completed",
      current_stage: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to mark scan completed: ${error.message}`);
  }
}

export async function markScanFailed(
  id: string,
  failure: { errorCode: string; errorMessage: string },
): Promise<void> {
  const { error } = await getAdminClient()
    .from("scans")
    .update({
      status: "failed",
      current_stage: "failed",
      error_code: failure.errorCode,
      error_message: failure.errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to mark scan failed: ${error.message}`);
  }
}

export async function logScanEvent(
  scanId: string,
  stage: string,
  message: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await getAdminClient().from("scan_events").insert({
    scan_id: scanId,
    stage,
    message,
    metadata,
  });

  // Event logging must never break the scan pipeline.
  if (error) {
    console.error(`scan_events insert failed for scan ${scanId}:`, error.message);
  }
}

export async function listRecentScans(limit = 50): Promise<Scan[]> {
  const { data, error } = await getAdminClient()
    .from("scans")
    .select()
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list scans: ${error.message}`);
  }

  return (data as ScanRow[]).map(toScan);
}
