import { lookup } from "node:dns/promises";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, UrlValidationError } from "@/lib/errors";
import {
  assertPublicHostname,
  isBlockedIp,
  normalizeSubmittedUrl,
  safeFetchPage,
} from "@/lib/url-security";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

type LookupResult = Array<{ address: string; family: 4 | 6 }>;
type MockLookup = typeof lookup & {
  mockRejectedValue(value: unknown): void;
  mockReset(): void;
  mockResolvedValue(value: LookupResult): void;
};

const mockedLookup = lookup as MockLookup;
const originalFetch = globalThis.fetch;

function mockPublicDns(address = "93.184.216.34"): void {
  const family: 4 | 6 = address.includes(":") ? 6 : 4;

  mockedLookup.mockResolvedValue([{ address, family }]);
}

function mockFetch(...responses: Response[]): void {
  globalThis.fetch = vi.fn(async () => {
    const response = responses.shift();

    if (!response) {
      throw new Error("Unexpected fetch call");
    }

    return response;
  });
}

describe("normalizeSubmittedUrl", () => {
  it("trims input and adds https when no protocol is present", () => {
    expect(normalizeSubmittedUrl("  Example.COM/path?q=1#fragment  ")).toBe(
      "https://example.com/path?q=1",
    );
  });

  it.each(["ftp://example.com", "file:///etc/passwd", "data:text/html,hi", "javascript:alert(1)"])(
    "rejects unsupported protocol %s",
    (url) => {
      expect(() => normalizeSubmittedUrl(url)).toThrow(UrlValidationError);
    },
  );

  it("rejects embedded credentials", () => {
    expect(() => normalizeSubmittedUrl("https://user:pass@example.com")).toThrow(
      UrlValidationError,
    );
  });

  it.each(["not a url", "http://"])("rejects garbage input %s", (url) => {
    expect(() => normalizeSubmittedUrl(url)).toThrow(UrlValidationError);
  });

  it("lowercases the host, strips fragments, and preserves query strings", () => {
    expect(normalizeSubmittedUrl("HTTP://EXAMPLE.COM/Path?A=1#top")).toBe(
      "http://example.com/Path?A=1",
    );
  });
});

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.0",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.10.20",
    "0.1.2.3",
    "100.64.0.1",
    "100.127.255.255",
    "192.0.0.8",
    "198.18.0.1",
    "198.19.255.255",
    "224.0.0.1",
    "239.255.255.255",
    "240.0.0.1",
    "255.255.255.255",
  ])("blocks listed IPv4 range address %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "172.15.255.255",
    "172.32.0.0",
    "100.128.0.0",
    "198.20.0.0",
    "223.255.255.255",
  ])("allows public IPv4 address %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });

  it.each(["::1", "::", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "64:ff9b::7f00:1"])(
    "blocks listed IPv6 address %s",
    (ip) => {
      expect(isBlockedIp(ip)).toBe(true);
    },
  );

  it.each(["2001:4860:4860::8888", "::ffff:8.8.8.8"])(
    "allows public IPv6 address %s",
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    },
  );
});

describe("assertPublicHostname", () => {
  beforeEach(() => {
    mockedLookup.mockReset();
  });

  it.each(["localhost", "app.localhost", "printer.local", "api.internal"])(
    "rejects private hostname %s",
    async (hostname) => {
      await expect(assertPublicHostname(hostname)).rejects.toBeInstanceOf(UrlValidationError);
      expect(mockedLookup).not.toHaveBeenCalled();
    },
  );

  it("rejects metadata.google.internal", async () => {
    await expect(assertPublicHostname("metadata.google.internal")).rejects.toBeInstanceOf(
      UrlValidationError,
    );
  });

  it("rejects blocked IP literals", async () => {
    await expect(assertPublicHostname("[::1]")).rejects.toBeInstanceOf(UrlValidationError);
    await expect(assertPublicHostname("127.0.0.1")).rejects.toBeInstanceOf(UrlValidationError);
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it("rejects DNS returning a private IP", async () => {
    mockedLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);

    await expect(assertPublicHostname("example.com")).rejects.toBeInstanceOf(UrlValidationError);
  });

  it("rejects DNS returning a mix of public and private IPs", async () => {
    mockedLookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "192.168.1.20", family: 4 },
    ]);

    await expect(assertPublicHostname("example.com")).rejects.toBeInstanceOf(UrlValidationError);
  });

  it("rejects DNS failures", async () => {
    mockedLookup.mockRejectedValue(new Error("ENOTFOUND"));

    await expect(assertPublicHostname("example.com")).rejects.toBeInstanceOf(UrlValidationError);
  });

  it("passes public DNS resolution", async () => {
    mockedLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);

    await expect(assertPublicHostname("example.com")).resolves.toEqual(["93.184.216.34"]);
  });
});

describe("safeFetchPage", () => {
  beforeEach(() => {
    mockedLookup.mockReset();
    mockPublicDns();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    mockedLookup.mockReset();
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches a 200 HTML page", async () => {
    mockFetch(
      new Response("<html>Hello</html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    const result = await safeFetchPage("https://example.com");

    expect(result).toMatchObject({
      finalUrl: "https://example.com/",
      status: 200,
      html: "<html>Hello</html>",
      redirectChain: [],
      pageSizeBytes: 18,
      contentType: "text/html; charset=utf-8",
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.com/",
      expect.objectContaining({
        redirect: "manual",
        headers: { "User-Agent": "OpportunityScannerBot/1.0 (+https://wildedigital.ca)" },
      }),
    );
  });

  it("follows redirects with per-hop revalidation", async () => {
    mockFetch(
      new Response(null, {
        status: 302,
        headers: { location: "/next" },
      }),
      new Response("<html>Next</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await safeFetchPage("https://example.com/start");

    expect(result.finalUrl).toBe("https://example.com/next");
    expect(result.redirectChain).toEqual(["https://example.com/next"]);
    expect(mockedLookup).toHaveBeenCalledTimes(2);
  });

  it("rejects redirects to private IP targets", async () => {
    mockFetch(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      }),
    );

    await expect(safeFetchPage("https://example.com")).rejects.toBeInstanceOf(
      UrlValidationError,
    );
  });

  it("rejects too many redirects", async () => {
    mockFetch(
      new Response(null, { status: 302, headers: { location: "/one" } }),
      new Response(null, { status: 302, headers: { location: "/two" } }),
    );

    await expect(
      safeFetchPage("https://example.com", { maxRedirects: 1 }),
    ).rejects.toMatchObject({ code: "url_too_many_redirects" });
  });

  it("rejects non-HTML content types", async () => {
    mockFetch(
      new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(safeFetchPage("https://example.com")).rejects.toMatchObject({
      code: "fetch_content_type",
    });
  });

  it("wraps timeout aborts", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const assertion = expect(
      safeFetchPage("https://example.com", { timeoutMs: 50 }),
    ).rejects.toMatchObject({
      code: "fetch_timeout",
      userMessage: "The page took too long to respond. Please try again later.",
    });

    await vi.advanceTimersByTimeAsync(51);
    await assertion;
  });

  it("truncates responses over the size cap without throwing", async () => {
    mockFetch(
      new Response("<html>0123456789</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await safeFetchPage("https://example.com", { maxBytes: 12 });

    expect(result.html).toBe("<html>012345");
    expect(result.pageSizeBytes).toBe(12);
  });

  it("wraps raw fetch errors", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("network down");
    });

    const assertion = expect(safeFetchPage("https://example.com")).rejects;

    await assertion.toBeInstanceOf(AppError);
    await assertion.toMatchObject({
      code: "fetch_failed",
      userMessage: "We could not fetch that page. Please try another URL.",
    });
  });
});
