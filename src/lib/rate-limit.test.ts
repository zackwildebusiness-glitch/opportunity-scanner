import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadLimiter() {
  vi.resetModules();

  return import("@/lib/rate-limit");
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("allows requests under the limit", async () => {
    const { checkRateLimit } = await loadLimiter();

    expect(checkRateLimit("a", { limit: 3, windowMs: 60_000 })).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterSeconds: 0,
    });
    expect(checkRateLimit("a", { limit: 3, windowMs: 60_000 })).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    });
  });

  it("blocks requests over the limit", async () => {
    const { checkRateLimit } = await loadLimiter();

    checkRateLimit("a", { limit: 2, windowMs: 60_000 });
    checkRateLimit("a", { limit: 2, windowMs: 60_000 });

    expect(checkRateLimit("a", { limit: 2, windowMs: 60_000 })).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    });
  });

  it("slides the window as old requests expire", async () => {
    const { checkRateLimit } = await loadLimiter();

    checkRateLimit("a", { limit: 2, windowMs: 60_000 });
    vi.advanceTimersByTime(30_000);
    checkRateLimit("a", { limit: 2, windowMs: 60_000 });
    expect(checkRateLimit("a", { limit: 2, windowMs: 60_000 }).allowed).toBe(false);

    vi.advanceTimersByTime(30_001);

    expect(checkRateLimit("a", { limit: 2, windowMs: 60_000 })).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
  });

  it("tracks keys independently", async () => {
    const { checkRateLimit } = await loadLimiter();

    checkRateLimit("a", { limit: 1, windowMs: 60_000 });

    expect(checkRateLimit("a", { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
    expect(checkRateLimit("b", { limit: 1, windowMs: 60_000 })).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    });
  });
});
