import type { CheerioAPI } from "cheerio";

import type { ContactIndicators, TrustIndicators } from "@/types/collected-data";

import { allClassText, bodyTextWithoutIgnoredContent, isInternalUrl, normalizeText } from "./utils";

export interface TrustSignalCollection {
  contact: ContactIndicators;
  trust: TrustIndicators;
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;
const ADDRESS_PATTERN =
  /(?:\d{1,6}\s+[A-Za-z0-9 .'-]{2,80}\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|way|suite|ste\.?)\b[^\n]{0,100}(?:\d{5}(?:-\d{4})?|[A-Z]\d[A-Z][ -]?\d[A-Z]\d)?|(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|suite|ste\.?)[^\n]{0,100}(?:\d{5}(?:-\d{4})?|[A-Z]\d[A-Z][ -]?\d[A-Z]\d))/i;
const TESTIMONIAL_PATTERN = /\b(testimonial|review|rated|stars|trustpilot|google reviews)\b/i;
const SOCIAL_PATTERN = /\b(facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com)\b/i;
const LEGAL_ENTITY_PATTERN = /\b(inc\.?|llc|ltd\.?|limited|corp\.?|corporation|co\.)\b/i;

export function collectTrustSignals($: CheerioAPI, finalUrl: string): TrustSignalCollection {
  const bodyText = bodyTextWithoutIgnoredContent($);
  const classText = allClassText($);

  return {
    contact: {
      hasEmail: hasMailtoLink($) || EMAIL_PATTERN.test(bodyText),
      hasPhone: hasTelLink($) || PHONE_PATTERN.test(bodyText),
      hasContactLink: hasContactLink($, finalUrl),
      hasAddress: $("address").length > 0 || ADDRESS_PATTERN.test(bodyText),
    },
    trust: {
      hasPrivacyPolicyLink: hasPrivacyPolicyLink($),
      hasTestimonialIndicators: TESTIMONIAL_PATTERN.test(`${bodyText} ${classText}`),
      hasSocialLinks: hasSocialLinks($),
      hasBusinessIdentity: hasBusinessIdentity($, bodyText),
    },
  };
}

function hasMailtoLink($: CheerioAPI): boolean {
  return $("a[href]").filter((_, element) => {
    return ($(element).attr("href") ?? "").trim().toLowerCase().startsWith("mailto:");
  }).length > 0;
}

function hasTelLink($: CheerioAPI): boolean {
  return $("a[href]").filter((_, element) => {
    return ($(element).attr("href") ?? "").trim().toLowerCase().startsWith("tel:");
  }).length > 0;
}

function hasContactLink($: CheerioAPI, finalUrl: string): boolean {
  return $("a[href]").filter((_, element) => {
    const href = ($(element).attr("href") ?? "").trim();
    const text = normalizeText($(element).text()).toLowerCase();

    return isInternalUrl(href, finalUrl) && `${href} ${text}`.toLowerCase().includes("contact");
  }).length > 0;
}

function hasPrivacyPolicyLink($: CheerioAPI): boolean {
  return $("a[href]").filter((_, element) => {
    const href = ($(element).attr("href") ?? "").toLowerCase();
    const text = normalizeText($(element).text()).toLowerCase();

    return `${href} ${text}`.includes("privacy");
  }).length > 0;
}

function hasSocialLinks($: CheerioAPI): boolean {
  return $("a[href]").filter((_, element) => {
    return SOCIAL_PATTERN.test($(element).attr("href") ?? "");
  }).length > 0;
}

function hasBusinessIdentity($: CheerioAPI, bodyText: string): boolean {
  const footerText = normalizeText($("footer").text());
  const title = normalizeText($("title").first().text());
  const titleBusinessName = title.split(/[|:-]/)[0]?.trim() ?? "";
  const hasCopyrightName = /\u00a9\s*(?:\d{4}\s*)?[A-Za-z][A-Za-z0-9 &.,'-]{2,}/.test(bodyText);

  return (
    hasCopyrightName ||
    LEGAL_ENTITY_PATTERN.test(`${bodyText} ${footerText}`) ||
    ($("footer").length > 0 &&
      titleBusinessName.length >= 3 &&
      footerText.toLowerCase().includes(titleBusinessName.toLowerCase()))
  );
}
