export interface ScanHistoryRow {
  id: string;
  normalizedUrl: string;
  status: string;
  createdAt: string;
  overallScore: number | null;
}

export function computeScoreDeltas(rows: ScanHistoryRow[]): Map<string, number | null> {
  const deltas = new Map<string, number | null>();
  const previousScoresByUrl = new Map<string, number>();
  const sortedRows = [...rows].sort(compareRows);

  for (const row of sortedRows) {
    if (row.status !== "completed" || row.overallScore === null) {
      deltas.set(row.id, null);
      continue;
    }

    const previousScore = previousScoresByUrl.get(row.normalizedUrl);

    deltas.set(row.id, previousScore === undefined ? null : row.overallScore - previousScore);
    previousScoresByUrl.set(row.normalizedUrl, row.overallScore);
  }

  return deltas;
}

function compareRows(a: ScanHistoryRow, b: ScanHistoryRow): number {
  const createdAtComparison = compareCreatedAt(a.createdAt, b.createdAt);

  return createdAtComparison === 0 ? a.id.localeCompare(b.id) : createdAtComparison;
}

function compareCreatedAt(a: string, b: string): number {
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);

  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return aTime - bTime;
  }

  return a.localeCompare(b);
}
