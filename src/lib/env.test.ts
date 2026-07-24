import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  Object.assign(process.env, originalEnv);
}

function setRequiredEnv(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
}

describe("getEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
  });

  afterAll(() => {
    restoreEnv();
  });

  it("returns validated environment values with defaults", async () => {
    setRequiredEnv();
    delete process.env.APP_URL;

    const { getEnv } = await import("@/lib/env");

    expect(getEnv()).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      APP_URL: "http://localhost:3000",
    });
  });

  it("throws a readable error listing invalid or missing variables", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { getEnv } = await import("@/lib/env");

    expect(() => getEnv()).toThrow(/Invalid environment configuration/);
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => getEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("parses process.env once and returns the cached value", async () => {
    setRequiredEnv();

    const { getEnv } = await import("@/lib/env");
    const firstEnv = getEnv();

    process.env.APP_URL = "https://changed.example";

    expect(getEnv()).toBe(firstEnv);
    expect(getEnv().APP_URL).toBe("http://localhost:3000");
  });
});
