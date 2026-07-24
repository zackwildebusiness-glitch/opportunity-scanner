import type { CheerioAPI } from "cheerio";

import type { TextStats } from "@/types/collected-data";

import { bodyTextWithoutIgnoredContent, normalizeText } from "./utils";

const SERVICE_LANGUAGE_PATTERN =
  /\b(?:we (?:build|offer|provide|help|design|create)|our (?:services|products|work|clients)|pricing|packages|plans|book (?:a|your)|get a quote|free (?:consultation|estimate|quote))\b/i;

export function collectTextStats($: CheerioAPI): TextStats {
  const bodyText = bodyTextWithoutIgnoredContent($);
  const headlineText =
    normalizeText($("h1").first().text()) ||
    normalizeText($("h1, h2, h3, h4, h5, h6").first().text()) ||
    null;

  return {
    wordCount: bodyText.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0,
    headlineText,
    hasServiceLanguage: SERVICE_LANGUAGE_PATTERN.test(bodyText),
  };
}
