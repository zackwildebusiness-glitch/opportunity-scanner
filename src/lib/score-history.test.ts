import { describe, expect, it } from "vitest";

import { computeScoreDeltas, type ScanHistoryRow } from "./score-history";

function row(input: Partial<ScanHistoryRow> & Pick<ScanHistoryRow, "id">): ScanHistoryRow {
  return {
    normalizedUrl: "https://example.com",
    status: "completed",
    createdAt: "2026-01-01T00:00:00.000Z",
    overallScore: 50,
    ...input,
  };
}

describe("computeScoreDeltas", () => {
  it("computes deltas independently for interleaved URLs", () => {
    const deltas = computeScoreDeltas([
      row({
        id: "b-2",
        normalizedUrl: "https://b.example",
        createdAt: "2026-01-02T00:00:00.000Z",
        overallScore: 72,
      }),
      row({
        id: "a-2",
        normalizedUrl: "https://a.example",
        createdAt: "2026-01-03T00:00:00.000Z",
        overallScore: 63,
      }),
      row({
        id: "a-1",
        normalizedUrl: "https://a.example",
        createdAt: "2026-01-01T00:00:00.000Z",
        overallScore: 55,
      }),
      row({
        id: "b-1",
        normalizedUrl: "https://b.example",
        createdAt: "2026-01-01T12:00:00.000Z",
        overallScore: 80,
      }),
    ]);

    expect(deltas.get("a-1")).toBeNull();
    expect(deltas.get("a-2")).toBe(8);
    expect(deltas.get("b-1")).toBeNull();
    expect(deltas.get("b-2")).toBe(-8);
  });

  it("returns null for the first completed scored scan of a site", () => {
    expect(
      computeScoreDeltas([
        row({ id: "first", createdAt: "2026-01-01T00:00:00.000Z", overallScore: 91 }),
      ]).get("first"),
    ).toBeNull();
  });

  it("skips failed and pending scans in the predecessor chain", () => {
    const deltas = computeScoreDeltas([
      row({ id: "baseline", createdAt: "2026-01-01T00:00:00.000Z", overallScore: 70 }),
      row({
        id: "failed",
        status: "failed",
        createdAt: "2026-01-02T00:00:00.000Z",
        overallScore: 10,
      }),
      row({
        id: "pending",
        status: "pending",
        createdAt: "2026-01-03T00:00:00.000Z",
        overallScore: 20,
      }),
      row({ id: "latest", createdAt: "2026-01-04T00:00:00.000Z", overallScore: 75 }),
    ]);

    expect(deltas.get("baseline")).toBeNull();
    expect(deltas.get("failed")).toBeNull();
    expect(deltas.get("pending")).toBeNull();
    expect(deltas.get("latest")).toBe(5);
  });

  it("returns null for null-score rows and does not use them as predecessors", () => {
    const deltas = computeScoreDeltas([
      row({ id: "baseline", createdAt: "2026-01-01T00:00:00.000Z", overallScore: 70 }),
      row({ id: "null-score", createdAt: "2026-01-02T00:00:00.000Z", overallScore: null }),
      row({ id: "latest", createdAt: "2026-01-03T00:00:00.000Z", overallScore: 68 }),
    ]);

    expect(deltas.get("null-score")).toBeNull();
    expect(deltas.get("latest")).toBe(-2);
  });

  it("uses id as a deterministic tiebreaker for identical timestamps", () => {
    const deltas = computeScoreDeltas([
      row({ id: "scan-b", createdAt: "2026-01-01T00:00:00.000Z", overallScore: 45 }),
      row({ id: "scan-a", createdAt: "2026-01-01T00:00:00.000Z", overallScore: 40 }),
      row({ id: "scan-c", createdAt: "2026-01-02T00:00:00.000Z", overallScore: 50 }),
    ]);

    expect(deltas.get("scan-a")).toBeNull();
    expect(deltas.get("scan-b")).toBe(5);
    expect(deltas.get("scan-c")).toBe(5);
  });

  it("does not mutate the input rows", () => {
    const rows = [
      row({ id: "second", createdAt: "2026-01-02T00:00:00.000Z", overallScore: 60 }),
      row({ id: "first", createdAt: "2026-01-01T00:00:00.000Z", overallScore: 50 }),
    ];
    const before = rows.map((scan) => ({ ...scan }));

    computeScoreDeltas(rows);

    expect(rows).toEqual(before);
    expect(rows.map((scan) => scan.id)).toEqual(["second", "first"]);
  });

  it("returns an empty map for empty input", () => {
    expect(computeScoreDeltas([])).toEqual(new Map());
  });
});
