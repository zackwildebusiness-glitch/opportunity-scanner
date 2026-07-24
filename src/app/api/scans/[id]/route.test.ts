import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Scan } from "@/types/scan";

vi.mock("server-only", () => ({}));

vi.mock("@/repositories/scan-repository", () => ({
  getScanById: vi.fn(),
}));

const { getScanById } = await import("@/repositories/scan-repository");
const { GET } = await import("./route");

const scanId = "11111111-1111-4111-8111-111111111111";

const scan: Scan = {
  id: scanId,
  submittedUrl: "example.com",
  normalizedUrl: "https://example.com/",
  resolvedUrl: "https://www.example.com/",
  status: "running",
  progress: 50,
  currentStage: "auditing",
  errorCode: null,
  errorMessage: null,
  startedAt: "2026-01-01T00:01:00.000Z",
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:02:00.000Z",
};

function request(): Request {
  return new Request(`https://app.test/api/scans/${scanId}`);
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/scans/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getScanById).mockResolvedValue(scan);
  });

  it("returns an existing scan with only user-safe fields", async () => {
    const response = await GET(request(), context(scanId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: scan.id,
      submittedUrl: scan.submittedUrl,
      normalizedUrl: scan.normalizedUrl,
      status: scan.status,
      progress: scan.progress,
      currentStage: scan.currentStage,
      errorCode: scan.errorCode,
      errorMessage: scan.errorMessage,
      createdAt: scan.createdAt,
      completedAt: scan.completedAt,
    });
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("user_id");
    expect(body).not.toHaveProperty("startedAt");
    expect(body).not.toHaveProperty("updatedAt");
  });

  it("returns 404 when the scan does not exist", async () => {
    vi.mocked(getScanById).mockResolvedValue(null);

    const response = await GET(request(), context(scanId));

    await expect(response.json()).resolves.toEqual({ error: "Scan not found." });
    expect(response.status).toBe(404);
  });

  it("returns 404 for non-UUID ids without hitting the repository", async () => {
    const response = await GET(request(), context("not-a-uuid"));

    await expect(response.json()).resolves.toEqual({ error: "Scan not found." });
    expect(response.status).toBe(404);
    expect(getScanById).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when the repository throws", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(getScanById).mockRejectedValue(new Error("database unavailable"));

    try {
      const response = await GET(request(), context(scanId));

      await expect(response.json()).resolves.toEqual({
        error: "Something went wrong loading this scan.",
      });
      expect(response.status).toBe(500);
    } finally {
      consoleError.mockRestore();
    }
  });
});
