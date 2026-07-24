import type { CheerioAPI } from "cheerio";

import type { ButtonInfo } from "@/types/collected-data";

import { accessibleText, hasClassToken } from "./utils";

export function collectButtons($: CheerioAPI): ButtonInfo[] {
  const buttons: ButtonInfo[] = [];

  $("button, a, input").each((_, element) => {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "button") {
      buttons.push({
        accessibleName: accessibleText($, element),
        element: "button",
      });
      return;
    }

    if (tagName === "a") {
      const $link = $(element);
      const role = ($link.attr("role") ?? "").toLowerCase();

      if (role === "button" || hasClassToken($link, ["btn", "button"])) {
        buttons.push({
          accessibleName: accessibleText($, element),
          element: "a",
        });
      }

      return;
    }

    const type = ($(element).attr("type") ?? "").toLowerCase();

    if (type === "submit" || type === "button") {
      buttons.push({
        accessibleName: accessibleText($, element),
        element: "input",
      });
    }
  });

  return buttons;
}
