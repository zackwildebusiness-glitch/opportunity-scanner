import type { CheerioAPI } from "cheerio";

import type { HeadingInfo } from "@/types/collected-data";

import { normalizeText } from "./utils";

export interface HeadingCollection {
  headings: HeadingInfo[];
  h1Count: number;
}

export function collectHeadings($: CheerioAPI): HeadingCollection {
  const headings: HeadingInfo[] = [];

  $("h1, h2, h3, h4, h5, h6").each((_, element) => {
    const tagName = element.tagName.toLowerCase();
    const level = Number(tagName.slice(1)) as HeadingInfo["level"];

    headings.push({
      level,
      text: normalizeText($(element).text()),
    });
  });

  return {
    headings,
    h1Count: headings.filter((heading) => heading.level === 1).length,
  };
}
