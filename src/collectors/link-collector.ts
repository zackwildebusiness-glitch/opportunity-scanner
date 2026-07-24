import type { CheerioAPI } from "cheerio";

import type { LinkInfo } from "@/types/collected-data";

import { isInternalUrl, normalizeText, resolveUrl } from "./utils";

export interface LinkCollection {
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
}

export function collectLinks($: CheerioAPI, finalUrl: string): LinkCollection {
  const internalLinks: LinkInfo[] = [];
  const externalLinks: LinkInfo[] = [];

  $("a[href]").each((_, element) => {
    const rawHref = ($(element).attr("href") ?? "").trim();

    if (shouldSkipHref(rawHref)) {
      return;
    }

    const href = resolveUrl(rawHref, finalUrl);
    const text = normalizeText($(element).text()) || normalizeText($(element).attr("aria-label"));
    const link: LinkInfo = {
      href,
      text,
      isInternal: isInternalUrl(href, finalUrl),
    };

    if (link.isInternal) {
      internalLinks.push(link);
    } else {
      externalLinks.push(link);
    }
  });

  return {
    internalLinks,
    externalLinks,
  };
}

function shouldSkipHref(href: string): boolean {
  const normalized = href.toLowerCase();

  return (
    normalized === "#" ||
    normalized.startsWith("javascript:") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("tel:")
  );
}
