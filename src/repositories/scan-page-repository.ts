import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export interface ScanPageInput {
  scanId: string;
  url: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  pageSizeBytes: number | null;
  /** Structured data extracted by collectors — never raw HTML. */
  rawMetadata: Record<string, unknown>;
}

export async function saveScanPage(input: ScanPageInput): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("scan_pages")
    .insert({
      scan_id: input.scanId,
      url: input.url,
      http_status: input.httpStatus,
      response_time_ms: input.responseTimeMs,
      page_size_bytes: input.pageSizeBytes,
      raw_metadata: input.rawMetadata,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save scan page: ${error.message}`);
  }

  return (data as { id: string }).id;
}

export async function getScanPage(
  scanId: string,
): Promise<(ScanPageInput & { id: string }) | null> {
  // A scan stores the homepage row first, then up to 3 sampled key pages.
  // Ascending order keeps this returning the homepage.
  const { data, error } = await getAdminClient()
    .from("scan_pages")
    .select()
    .eq("scan_id", scanId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load scan page: ${error.message}`);
  }

  if (!data) return null;

  const row = data as {
    id: string;
    scan_id: string;
    url: string;
    http_status: number | null;
    response_time_ms: number | null;
    page_size_bytes: number | null;
    raw_metadata: Record<string, unknown>;
  };

  return {
    id: row.id,
    scanId: row.scan_id,
    url: row.url,
    httpStatus: row.http_status,
    responseTimeMs: row.response_time_ms,
    pageSizeBytes: row.page_size_bytes,
    rawMetadata: row.raw_metadata,
  };
}
