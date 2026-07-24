import { lookup } from "node:dns/promises";

import { AppError, UrlValidationError } from "@/lib/errors";

type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

type SafeFetchResult = {
  finalUrl: string;
  status: number;
  html: string;
  redirectChain: string[];
  responseTimeMs: number;
  pageSizeBytes: number;
  contentType: string | null;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 2_000_000;
const DEFAULT_MAX_REDIRECTS = 5;
const USER_AGENT = "OpportunityScannerBot/1.0 (+https://wildedigital.ca)";

const URL_USER_MESSAGE = "Please enter a valid public website URL.";
const FETCH_USER_MESSAGE = "We could not fetch that page. Please try another URL.";

function parseIpv4Address(ip: string): number | null {
  const parts = ip.split(".");

  if (parts.length !== 4) {
    return null;
  }

  let result = 0;

  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }

    const octet = Number(part);

    if (octet < 0 || octet > 255) {
      return null;
    }

    result = result * 256 + octet;
  }

  return result >>> 0;
}

function stripIpBrackets(ip: string): string {
  const trimmed = ip.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseIpv6Address(ip: string): number[] | null {
  let address = stripIpBrackets(ip).toLowerCase();

  if (!address.includes(":") || address.includes("%")) {
    return null;
  }

  if (address.includes(".")) {
    const lastColonIndex = address.lastIndexOf(":");

    if (lastColonIndex === -1) {
      return null;
    }

    const ipv4 = parseIpv4Address(address.slice(lastColonIndex + 1));

    if (ipv4 === null) {
      return null;
    }

    const high = ((ipv4 >>> 16) & 0xffff).toString(16);
    const low = (ipv4 & 0xffff).toString(16);
    address = `${address.slice(0, lastColonIndex)}:${high}:${low}`;
  }

  if ((address.match(/::/g) ?? []).length > 1) {
    return null;
  }

  const parseParts = (value: string): number[] | null => {
    if (value === "") {
      return [];
    }

    const parts = value.split(":");
    const parsedParts: number[] = [];

    for (const part of parts) {
      if (!/^[0-9a-f]{1,4}$/.test(part)) {
        return null;
      }

      parsedParts.push(Number.parseInt(part, 16));
    }

    return parsedParts;
  };

  if (address.includes("::")) {
    const [leftRaw = "", rightRaw = ""] = address.split("::");
    const left = parseParts(leftRaw);
    const right = parseParts(rightRaw);

    if (left === null || right === null) {
      return null;
    }

    const missingParts = 8 - left.length - right.length;

    if (missingParts < 1) {
      return null;
    }

    return [...left, ...Array.from({ length: missingParts }, () => 0), ...right];
  }

  const parts = parseParts(address);

  if (parts === null || parts.length !== 8) {
    return null;
  }

  return parts;
}

function ipv4FromIpv6Words(words: number[]): string {
  const value = ((words[6] ?? 0) << 16) + (words[7] ?? 0);

  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join(".");
}

function isAllZero(words: number[]): boolean {
  return words.every((word) => word === 0);
}

function isIpv4MappedIpv6(words: number[]): boolean {
  return (
    words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff
  );
}

function isNat64WellKnownPrefix(words: number[]): boolean {
  return (
    words[0] === 0x0064 &&
    words[1] === 0xff9b &&
    words.slice(2, 6).every((word) => word === 0)
  );
}

function isIpLiteral(value: string): boolean {
  const unbracketed = stripIpBrackets(value);

  return parseIpv4Address(unbracketed) !== null || parseIpv6Address(unbracketed) !== null;
}

export function normalizeSubmittedUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;

  try {
    parsed = new URL(withProtocol);
  } catch (error) {
    throw new UrlValidationError(
      "url_malformed",
      `Malformed URL: ${error instanceof Error ? error.message : "unknown error"}`,
      URL_USER_MESSAGE,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlValidationError(
      "url_protocol",
      `Unsupported URL protocol: ${parsed.protocol}`,
      URL_USER_MESSAGE,
    );
  }

  if (parsed.username || parsed.password) {
    throw new UrlValidationError(
      "url_credentials",
      "URL contains embedded credentials",
      URL_USER_MESSAGE,
    );
  }

  if (!parsed.hostname || /\s/.test(parsed.hostname)) {
    throw new UrlValidationError(
      "url_hostname",
      "URL hostname is empty or invalid",
      URL_USER_MESSAGE,
    );
  }

  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";

  return parsed.href;
}

export function isBlockedIp(ip: string): boolean {
  const unbracketed = stripIpBrackets(ip);
  const ipv4 = parseIpv4Address(unbracketed);

  if (ipv4 !== null) {
    const inRange = (base: string, prefixLength: number): boolean => {
      const parsedBase = parseIpv4Address(base);

      if (parsedBase === null) {
        return false;
      }

      const mask =
        prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;

      return (ipv4 & mask) === (parsedBase & mask);
    };

    return (
      inRange("127.0.0.0", 8) ||
      inRange("10.0.0.0", 8) ||
      inRange("172.16.0.0", 12) ||
      inRange("192.168.0.0", 16) ||
      inRange("169.254.0.0", 16) ||
      inRange("0.0.0.0", 8) ||
      inRange("100.64.0.0", 10) ||
      inRange("192.0.0.0", 24) ||
      inRange("198.18.0.0", 15) ||
      inRange("224.0.0.0", 4) ||
      inRange("240.0.0.0", 4) ||
      ipv4 === 0xffffffff
    );
  }

  const ipv6 = parseIpv6Address(unbracketed);

  if (ipv6 === null) {
    return false;
  }

  if (
    isAllZero(ipv6) ||
    (ipv6.slice(0, 7).every((word) => word === 0) && ipv6[7] === 1) ||
    ((ipv6[0] ?? 0) & 0xffc0) === 0xfe80 ||
    ((ipv6[0] ?? 0) & 0xfe00) === 0xfc00
  ) {
    return true;
  }

  if (isIpv4MappedIpv6(ipv6) || isNat64WellKnownPrefix(ipv6)) {
    return isBlockedIp(ipv4FromIpv6Words(ipv6));
  }

  return false;
}

export async function assertPublicHostname(hostname: string): Promise<string[]> {
  const normalizedHostname = stripIpBrackets(hostname).toLowerCase().replace(/\.$/, "");

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local") ||
    normalizedHostname.endsWith(".internal") ||
    normalizedHostname === "metadata.google.internal"
  ) {
    throw new UrlValidationError(
      "url_private_hostname",
      `Blocked private hostname: ${hostname}`,
      URL_USER_MESSAGE,
    );
  }

  if (isIpLiteral(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new UrlValidationError(
        "url_private_ip",
        `Blocked private IP address: ${hostname}`,
        URL_USER_MESSAGE,
      );
    }

    return [normalizedHostname];
  }

  let addresses: string[];

  try {
    const resolved = await lookup(normalizedHostname, {
      all: true,
      verbatim: true,
    });

    addresses = resolved.map((entry) => entry.address);
  } catch (error) {
    throw new UrlValidationError(
      "url_dns",
      `DNS lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
      URL_USER_MESSAGE,
    );
  }

  if (addresses.length === 0) {
    throw new UrlValidationError(
      "url_dns",
      "DNS lookup returned no addresses",
      URL_USER_MESSAGE,
    );
  }

  if (addresses.some((address) => isBlockedIp(address))) {
    throw new UrlValidationError(
      "url_private_ip",
      `DNS resolved to a blocked address: ${addresses.join(", ")}`,
      URL_USER_MESSAGE,
    );
  }

  return addresses;
}

async function readResponseBody(
  response: Response,
  maxBytes: number,
): Promise<{ html: string; pageSizeBytes: number }> {
  if (!response.body) {
    return { html: "", pageSizeBytes: 0 };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let pageSizeBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      const remainingBytes = maxBytes - pageSizeBytes;

      if (remainingBytes <= 0) {
        await reader.cancel();
        break;
      }

      const chunk = value.byteLength > remainingBytes ? value.slice(0, remainingBytes) : value;

      chunks.push(decoder.decode(chunk, { stream: true }));
      pageSizeBytes += chunk.byteLength;

      if (value.byteLength > remainingBytes) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    chunks.push(decoder.decode());
  }

  return {
    html: chunks.join(""),
    pageSizeBytes,
  };
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function wrapFetchError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (
    error instanceof DOMException ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return new AppError(
      "fetch_timeout",
      error instanceof Error ? error.message : "Fetch timed out",
      "The page took too long to respond. Please try again later.",
    );
  }

  return new AppError(
    "fetch_failed",
    error instanceof Error ? error.message : "Unknown fetch error",
    FETCH_USER_MESSAGE,
  );
}

export async function safeFetchPage(
  url: string,
  opts: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const redirectChain: string[] = [];

  try {
    let currentUrl = normalizeSubmittedUrl(url);

    for (let redirectCount = 0; ; redirectCount += 1) {
      const parsedUrl = new URL(currentUrl);

      // DNS is validated before fetch, so a DNS-rebinding TOCTOU window remains.
      // Revalidating every redirect hop mitigates redirect-based SSRF.
      await assertPublicHostname(parsedUrl.hostname);

      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
        },
      });

      if (isRedirectStatus(response.status)) {
        if (redirectCount >= maxRedirects) {
          throw new UrlValidationError(
            "url_too_many_redirects",
            `Exceeded maximum redirects: ${maxRedirects}`,
            URL_USER_MESSAGE,
          );
        }

        const location = response.headers.get("location");

        if (!location) {
          throw new AppError(
            "fetch_redirect",
            "Redirect response did not include a Location header",
            FETCH_USER_MESSAGE,
          );
        }

        currentUrl = normalizeSubmittedUrl(new URL(location, currentUrl).href);
        redirectChain.push(currentUrl);
        continue;
      }

      const contentType = response.headers.get("content-type");

      if (contentType && !contentType.toLowerCase().includes("text/html")) {
        throw new AppError(
          "fetch_content_type",
          `Unsupported content type: ${contentType}`,
          "That URL did not return an HTML page.",
        );
      }

      const { html, pageSizeBytes } = await readResponseBody(response, maxBytes);

      return {
        finalUrl: currentUrl,
        status: response.status,
        html,
        redirectChain,
        responseTimeMs: Date.now() - startedAt,
        pageSizeBytes,
        contentType,
      };
    }
  } catch (error) {
    throw wrapFetchError(error);
  } finally {
    clearTimeout(timeout);
  }
}
