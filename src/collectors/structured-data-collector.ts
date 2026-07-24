import type { CheerioAPI } from "cheerio";

import type { StructuredDataInfo } from "@/types/collected-data";

export function collectStructuredData($: CheerioAPI): StructuredDataInfo {
  const types: string[] = [];
  let blockCount = 0;
  let invalidBlockCount = 0;

  $("script").each((_, element) => {
    const type = ($(element).attr("type") ?? "").toLowerCase().split(";")[0]?.trim();

    if (type !== "application/ld+json") {
      return;
    }

    blockCount += 1;

    try {
      collectTypes(JSON.parse($(element).text()), types);
    } catch {
      invalidBlockCount += 1;
    }
  });

  return {
    types,
    blockCount,
    invalidBlockCount,
  };
}

function collectTypes(value: unknown, types: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTypes(item, types);
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const type = value["@type"];

  if (typeof type === "string") {
    pushUnique(types, type);
  } else if (Array.isArray(type)) {
    for (const item of type) {
      if (typeof item === "string") {
        pushUnique(types, item);
      }
    }
  }

  collectTypes(value["@graph"], types);
}

function pushUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
