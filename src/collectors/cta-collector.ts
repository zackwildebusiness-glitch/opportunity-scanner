import type { CheerioAPI } from "cheerio";

import type { CtaInfo } from "@/types/collected-data";

import { accessibleText } from "./utils";

const CTA_TEXT_PATTERN =
  /\b(get started|contact|book|call|quote|buy|sign up|subscribe|learn more|start|try|demo|download|order|shop|hire|work with|free)\b/i;

export function collectCtas($: CheerioAPI): CtaInfo[] {
  const ctas: CtaInfo[] = [];

  $("a, button").each((domIndex, element) => {
    const tagName = element.tagName.toLowerCase();
    const text = accessibleText($, element);
    const className = ($(element).attr("class") ?? "").toLowerCase();
    const isProminentLink =
      tagName === "a" &&
      (className.includes("btn") || className.includes("button") || className.includes("cta"));

    if (CTA_TEXT_PATTERN.test(text) || isProminentLink) {
      ctas.push({
        text,
        element: tagName === "button" ? "button" : "a",
        domIndex,
      });
    }
  });

  return ctas;
}
