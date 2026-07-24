import type { CheerioAPI } from "cheerio";

import type { OpenGraphInfo } from "@/types/collected-data";

import { nullIfEmpty, resolveUrl } from "./utils";

export interface MetadataCollection {
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  viewportMeta: string | null;
  openGraph: OpenGraphInfo;
}

export function collectMetadata($: CheerioAPI, finalUrl: string): MetadataCollection {
  const canonicalHref = $("link")
    .filter((_, element) =>
      (($(element).attr("rel") ?? "").toLowerCase().split(/\s+/)).includes("canonical"),
    )
    .first()
    .attr("href");

  return {
    title: nullIfEmpty($("title").first().text()),
    metaDescription: nullIfEmpty(metaContent($, "name", "description")),
    canonicalUrl: nullIfEmpty(resolveUrl(canonicalHref, finalUrl)),
    robotsMeta: nullIfEmpty(metaContent($, "name", "robots")?.toLowerCase()),
    viewportMeta: nullIfEmpty(metaContent($, "name", "viewport")),
    openGraph: {
      title: nullIfEmpty(metaContent($, "property", "og:title")),
      description: nullIfEmpty(metaContent($, "property", "og:description")),
      image: nullIfEmpty(resolveUrl(metaContent($, "property", "og:image"), finalUrl)),
    },
  };
}

function metaContent(
  $: CheerioAPI,
  attribute: "name" | "property",
  expectedValue: string,
): string | undefined {
  return $("meta")
    .filter((_, element) => ($(element).attr(attribute) ?? "").toLowerCase() === expectedValue)
    .first()
    .attr("content");
}
