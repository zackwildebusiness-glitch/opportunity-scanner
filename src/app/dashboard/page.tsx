import type { Metadata } from "next";
import Link from "next/link";

import { RescanButton } from "@/components/dashboard/rescan-button";
import { getAdminClient } from "@/lib/supabase/admin";
import { computeScoreDeltas, type ScanHistoryRow } from "@/lib/score-history";
import type { ScanStatus } from "@/types/scan";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface ScanListRow {
  id: string;
  normalized_url: string;
  status: ScanStatus;
  created_at: string;
  completed_at: string | null;
  reports: { overall_score: number }[] | null;
}

const STATUS_STYLES: Record<ScanStatus, string> = {
  pending: "bg-tint text-muted",
  running: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger",
};

async function loadScans(search: string, status: string): Promise<ScanListRow[]> {
  let query = getAdminClient()
    .from("scans")
    .select("id, normalized_url, status, created_at, completed_at, reports(overall_score)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) {
    query = query.ilike("normalized_url", `%${search}%`);
  }

  if (status === "pending" || status === "running" || status === "completed" || status === "failed") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load scans: ${error.message}`);
  }

  return data as ScanListRow[];
}

/**
 * Deltas are computed over recent history WITHOUT the user's search/status
 * filters, so a filtered view still compares against the true previous scan
 * of each site.
 */
async function loadScoreDeltas(): Promise<Map<string, number | null>> {
  const { data, error } = await getAdminClient()
    .from("scans")
    .select("id, normalized_url, status, created_at, reports(overall_score)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Failed to load scan history: ${error.message}`);
  }

  const rows: ScanHistoryRow[] = (data as ScanListRow[]).map((row) => ({
    id: row.id,
    normalizedUrl: row.normalized_url,
    status: row.status,
    createdAt: row.created_at,
    overallScore: row.reports?.[0]?.overall_score ?? null,
  }));

  return computeScoreDeltas(rows);
}

function formatDelta(delta: number | null | undefined): {
  text: string;
  className: string;
} {
  if (delta === null || delta === undefined) {
    return { text: "—", className: "text-muted" };
  }
  if (delta > 0) return { text: `+${delta}`, className: "text-success" };
  if (delta < 0) return { text: `${delta}`, className: "text-danger" };
  return { text: "±0", className: "text-muted" };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const [scans, deltas] = await Promise.all([
    loadScans(q, status),
    loadScoreDeltas(),
  ]);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">
              Scan dashboard
            </h1>
            <p className="mt-1 text-sm text-muted">Scan history</p>
          </div>
        </div>

        {/* Filters */}
        <form method="GET" className="mt-8 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted">
              Search URL
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="example.com"
              className="h-10 w-64 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-muted">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg border border-line-strong bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink/85"
          >
            Filter
          </button>
        </form>

        {/* Scans table */}
        <section aria-labelledby="scans-heading" className="mt-6">
          <h2 id="scans-heading" className="sr-only">
            Recent scans
          </h2>
          {scans.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-10 text-center text-muted">
              No scans match. Try clearing the filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-3">Website</th>
                    <th scope="col" className="px-4 py-3">Score</th>
                    <th scope="col" className="px-4 py-3">
                      <abbr title="Change vs previous scan of the same site" className="no-underline">
                        Δ
                      </abbr>
                    </th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Created</th>
                    <th scope="col" className="px-4 py-3">Completed</th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Report</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-b border-line last:border-0">
                      <td className="max-w-xs truncate px-4 py-3 font-medium text-ink">
                        {scan.normalized_url}
                      </td>
                      <td className="px-4 py-3 font-display text-base text-ink">
                        {scan.reports?.[0]?.overall_score ?? "—"}
                      </td>
                      {(() => {
                        const delta = formatDelta(deltas.get(scan.id));
                        return (
                          <td className={`px-4 py-3 text-sm font-semibold ${delta.className}`}>
                            {delta.text}
                          </td>
                        );
                      })()}
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[scan.status]}`}
                        >
                          {scan.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {formatDate(scan.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {formatDate(scan.completed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-4">
                          {scan.status === "completed" ? (
                            <Link
                              href={`/report/${scan.id}`}
                              className="font-medium text-accent-deep underline-offset-4 hover:underline"
                            >
                              Report →
                            </Link>
                          ) : (
                            <Link
                              href={`/scan/${scan.id}`}
                              className="font-medium text-muted underline-offset-4 hover:underline"
                            >
                              Status →
                            </Link>
                          )}
                          {scan.status === "completed" || scan.status === "failed" ? (
                            <RescanButton url={scan.normalized_url} />
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
