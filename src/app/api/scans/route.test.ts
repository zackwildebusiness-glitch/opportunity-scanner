import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Scan } from "@/types/scan";

const { afterCallbacks, afterMock } = vi.hoisted(() => {
  const callbacks: Array<() => unknown> = [];

  return {
    afterCallbacks: callbacks,
    afterMock: vi.fn((callback: () => unknown) => {
      callbacks.push(callback);
    }),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();

  return {
    ...actual,
    after: afterMock,
  };
});

vi.mock("@/repositories/scan-repository", () => ({
  createScan: vi.fn(),
  logScanEvent: vi.fn(),
}));

vi.mock("@/jobs/run-scan-job", () => ({
  runScanJob: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/url-security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/url-security")>();

  return {
    ...actual,
    assertPublicHostname: vi.fn(),
  };
});

const { UrlValidationError } = await import("@/lib/errors");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { assertPublicHostname } = await import("@/lib/url-security");
const { runScanJob } = await import("@/jobs/run-scan-job");
const { createScan, logScanEvent } = await import("@/repositories/scan-repository");
const { POST } = await import("./route");

const scan: Scan = {
  id: "11111111-1111-4111-8111-111111111111",
  submittedUrl: "example.com/sales#top",
  normalizedUrl: "https://example.com/sales",
  resolvedUrl: null,
  status: "pending",
  progress: 0,
  currentStage: "queued",
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function jsonRequest(body: unknown, ip = "203.0.113.10"): Request {
  return new Request("https://app.test/api/scans", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;

    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 0,
    });
    vi.mocked(assertPublicHostname).mockResolvedValue(["93.184.216.34"]);
    vi.mocked(createScan).mockResolvedValue(scan);
    vi.mocked(logScanEvent).mockResolvedValue();
    vi.mocked(runScanJob).mockResolvedValue();
  });

  it("creates a scan for a valid public URL and schedules the scan job", async () => {
    const response = await POST(jsonRequest({ url: " example.COM/sales#top " }));

    await expect(response.json()).resolves.toEqual({ id: scan.id });
    expect(response.status).toBe(201);
    expect(checkRateLimit).toHaveBeenCalledWith("scan:203.0.113.10");
    expect(assertPublicHostname).toHaveBeenCalledWith("example.com");
    expect(createScan).toHaveBeenCalledWith({
      submittedUrl: "example.COM/sales#top",
      normalizedUrl: "https://example.com/sales",
    });
    expect(logScanEvent).toHaveBeenCalledWith(
      scan.id,
      "queued",
      "Scan created and queued.",
    );
    expect(afterMock).toHaveBeenCalledTimes(1);

    const scheduledJob = afterCallbacks[0];
    expect(scheduledJob).toBeDefined();
    await scheduledJob?.();

    expect(runScanJob).toHaveBeenCalledWith(scan.id);
  });

  it("returns a safe 422 error for localhost/private URLs", async () => {
    vi.mocked(assertPublicHostname).mockRejectedValue(
      new UrlValidationError(
        "url_private_hostname",
        "Blocked private hostname: localhost",
      ),
    );

    const response = await POST(jsonRequest({ url: "localhost:3000" }));

    await expect(response.json()).resolves.toEqual({
      error: "Please enter a valid public website URL.",
    });
    expect(response.status).toBe(422);
    expect(createScan).not.toHaveBeenCalled();
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const response = await POST(
      new Request("https://app.test/api/scans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.11",
        },
        body: "{not-json",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Invalid request body.",
    });
    expect(response.status).toBe(400);
    expect(createScan).not.toHaveBeenCalled();
  });

  it("returns 400 when url is missing", async () => {
    const response = await POST(jsonRequest({}));

    await expect(response.json()).resolves.toEqual({
      error: expect.any(String),
    });
    expect(response.status).toBe(400);
    expect(createScan).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
    });

    const response = await POST(jsonRequest({ url: "example.com" }));

    await expect(response.json()).resolves.toEqual({
      error: "Too many scans. Try again in 2 minute(s).",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(createScan).not.toHaveBeenCalled();
  });
});
