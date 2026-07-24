import type { CheerioAPI } from "cheerio";

import type { ImageInfo } from "@/types/collected-data";

import { resolveUrl } from "./utils";

export function collectImages($: CheerioAPI, finalUrl: string): ImageInfo[] {
  const images: ImageInfo[] = [];

  $("img").each((_, element) => {
    const $image = $(element);

    images.push({
      src: resolveUrl($image.attr("src"), finalUrl),
      alt: $image.attr("alt") ?? null,
    });
  });

  return images;
}
