import * as cheerio from "cheerio";

import type { CollectedPageData } from "@/types/collected-data";

import { collectButtons } from "./button-collector";
import { collectCtas } from "./cta-collector";
import { collectForms } from "./form-collector";
import { collectHeadings } from "./heading-collector";
import { collectImages } from "./image-collector";
import { collectLinks } from "./link-collector";
import { collectMetadata } from "./metadata-collector";
import { collectStructuredData } from "./structured-data-collector";
import { collectTextStats } from "./text-stats-collector";
import { collectTrustSignals } from "./trust-signal-collector";

export interface CollectPageDataInput {
  html: string;
  finalUrl: string;
  httpStatus: number;
  responseTimeMs: number;
  pageSizeBytes: number;
  redirectChain: string[];
}

export function collectPageData(input: CollectPageDataInput): CollectedPageData {
  const $ = cheerio.load(input.html);
  const metadata = collectMetadata($, input.finalUrl);
  const headingCollection = collectHeadings($);
  const linkCollection = collectLinks($, input.finalUrl);
  const trustSignalCollection = collectTrustSignals($, input.finalUrl);

  return {
    url: input.finalUrl,
    isHttps: isHttpsUrl(input.finalUrl),
    httpStatus: input.httpStatus,
    responseTimeMs: input.responseTimeMs,
    pageSizeBytes: input.pageSizeBytes,
    redirectChain: input.redirectChain,
    title: metadata.title,
    metaDescription: metadata.metaDescription,
    canonicalUrl: metadata.canonicalUrl,
    robotsMeta: metadata.robotsMeta,
    viewportMeta: metadata.viewportMeta,
    headings: headingCollection.headings,
    h1Count: headingCollection.h1Count,
    images: collectImages($, input.finalUrl),
    internalLinks: linkCollection.internalLinks,
    externalLinks: linkCollection.externalLinks,
    buttons: collectButtons($),
    forms: collectForms($),
    ctas: collectCtas($),
    openGraph: metadata.openGraph,
    structuredData: collectStructuredData($),
    contact: trustSignalCollection.contact,
    trust: trustSignalCollection.trust,
    textStats: collectTextStats($),
  };
}

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
