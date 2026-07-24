import type { LinkInfo } from "@/types/collected-data";

export type KeyPageLabel = "services" | "about" | "contact";

export interface KeyPageCandidate {
  url: string;
  label: KeyPageLabel;
}

const LABEL_PRIORITY = ["services", "about", "contact"] as const satisfies readonly KeyPageLabel[];

const PATH_SEGMENTS_BY_LABEL: Record<KeyPageLabel, readonly string[]> = {
  services: [
    "services",
    "service",
    "pricing",
    "plans",
    "products",
    "product",
    "solutions",
    "solution",
    "what-we-do",
    "packages",
    "package",
    "offerings",
    "offering",
  ],
  about: ["about", "about-us", "team", "our-team", "company", "who-we-are", "story"],
  contact: [
    "contact",
    "contact-us",
    "get-in-touch",
    "book",
    "quote",
    "request-a-quote",
    "consultation",
  ],
};

const TEXT_PATTERNS_BY_LABEL: Record<KeyPageLabel, readonly string[]> = {
  services: ["services", "pricing", "plans", "products", "solutions", "what we do", "packages"],
  about: ["about", "our team", "company", "who we are"],
  contact: ["contact", "get in touch", "book a call", "get a quote", "request a quote"],
};

interface NormalizedLink {
  url: string;
  pathKey: string;
  segments: string[];
}

export function discoverKeyPages(input: {
  internalLinks: LinkInfo[];
  finalUrl: string;
  limit?: number;
}): KeyPageCandidate[] {
  const origin = parseHttpUrl(input.finalUrl);

  if (!origin) {
    return [];
  }

  const pagePathKey = normalizePathKey(origin.pathname);
  const picked = new Map<KeyPageLabel, KeyPageCandidate>();
  const seenPaths = new Set<string>();

  for (const link of input.internalLinks) {
    const normalized = normalizeLink(link.href, origin);

    if (!normalized || seenPaths.has(normalized.pathKey)) {
      continue;
    }

    seenPaths.add(normalized.pathKey);

    if (normalized.pathKey === "/" || normalized.pathKey === pagePathKey) {
      continue;
    }

    const label = classifyLink(normalized.segments, link.text);

    if (label && !picked.has(label)) {
      picked.set(label, { url: normalized.url, label });
    }
  }

  const limit = Math.max(0, Math.floor(input.limit ?? 3));

  return LABEL_PRIORITY.flatMap((label) => {
    const candidate = picked.get(label);

    return candidate ? [candidate] : [];
  }).slice(0, limit);
}

function normalizeLink(href: string, origin: URL): NormalizedLink | null {
  const url = parseHttpUrl(href, origin);

  if (!url || url.protocol !== origin.protocol || url.host !== origin.host || url.search !== "") {
    return null;
  }

  url.hash = "";
  url.pathname = normalizePathname(url.pathname);

  const pathKey = normalizePathKey(url.pathname);

  return {
    url: origin.origin + pathKey,
    pathKey,
    segments: pathKey.split("/").filter(Boolean),
  };
}

function parseHttpUrl(value: string, base?: URL): URL | null {
  try {
    const url = base ? new URL(value, base) : new URL(value);

    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function normalizePathname(pathname: string): string {
  const lowerPathname = pathname.toLowerCase();
  const withoutTrailingSlash = lowerPathname.replace(/\/+$/, "");

  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

function normalizePathKey(pathname: string): string {
  return normalizePathname(pathname);
}

function classifyLink(segments: readonly string[], text: string): KeyPageLabel | null {
  for (const label of LABEL_PRIORITY) {
    if (segments.some((segment) => PATH_SEGMENTS_BY_LABEL[label].includes(segment))) {
      return label;
    }
  }

  const normalizedText = normalizeText(text);

  for (const label of LABEL_PRIORITY) {
    if (TEXT_PATTERNS_BY_LABEL[label].some((pattern) => textMatches(normalizedText, pattern))) {
      return label;
    }
  }

  return null;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function textMatches(text: string, pattern: string): boolean {
  return new RegExp(`(^|\\b)${escapeRegExp(pattern)}(\\b|$)`, "i").test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
