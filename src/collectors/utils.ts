import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function nullIfEmpty(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);

  return normalized === "" ? null : normalized;
}

export function resolveUrl(value: string | null | undefined, finalUrl: string): string {
  const trimmed = (value ?? "").trim();

  if (trimmed === "") {
    return "";
  }

  try {
    return new URL(trimmed, finalUrl).href;
  } catch {
    return trimmed;
  }
}

export function hostMatches(a: string, b: string): boolean {
  const normalizedA = a.toLowerCase();
  const normalizedB = b.toLowerCase();

  return normalizedA === normalizedB || stripWww(normalizedA) === stripWww(normalizedB);
}

export function isInternalUrl(href: string, finalUrl: string): boolean {
  try {
    const target = new URL(href, finalUrl);
    const base = new URL(finalUrl);

    return hostMatches(target.hostname, base.hostname);
  } catch {
    return false;
  }
}

export function accessibleText($: CheerioAPI, element: Element): string {
  const $element = $(element);
  const visibleText = normalizeText($element.text());

  if (visibleText !== "") {
    return visibleText;
  }

  const ariaLabel = normalizeText($element.attr("aria-label"));

  if (ariaLabel !== "") {
    return ariaLabel;
  }

  const value = normalizeText($element.attr("value"));

  if (value !== "") {
    return value;
  }

  const containedImageAlt = normalizeText($element.find("img[alt]").first().attr("alt"));

  if (containedImageAlt !== "") {
    return containedImageAlt;
  }

  return normalizeText($element.attr("alt"));
}

export function classTokens($element: Cheerio<Element>): string[] {
  return ($element.attr("class") ?? "")
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

export function hasClassToken($element: Cheerio<Element>, tokens: string[]): boolean {
  const wanted = new Set(tokens);

  return classTokens($element).some((token) => wanted.has(token));
}

export function allClassText($: CheerioAPI): string {
  const classes: string[] = [];

  $("[class]").each((_, element) => {
    classes.push($(element).attr("class") ?? "");
  });

  return classes.join(" ");
}

export function bodyTextWithoutIgnoredContent($: CheerioAPI): string {
  const $body = $("body").clone();
  $body.find("script, style, noscript").remove();

  return normalizeText($body.text());
}

function stripWww(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export type CheerioElement = Element;
export type CheerioNode = AnyNode;
