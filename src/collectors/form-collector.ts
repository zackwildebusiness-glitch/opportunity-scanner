import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

import type { FormInfo } from "@/types/collected-data";

export function collectForms($: CheerioAPI): FormInfo[] {
  const forms: FormInfo[] = [];

  $("form").each((_, form) => {
    let inputCount = 0;
    let unlabeledInputCount = 0;
    const $form = $(form);

    $form.find("input, textarea, select").each((__, control) => {
      if (isExcludedControl($, control)) {
        return;
      }

      inputCount += 1;

      if (!hasAccessibleLabel($, control)) {
        unlabeledInputCount += 1;
      }
    });

    forms.push({
      inputCount,
      unlabeledInputCount,
      hasSubmit:
        $form.find("input[type='submit' i], button[type='submit' i]").length > 0 ||
        $form.find("button").filter((__, button) => $(button).attr("type") === undefined).length >
          0,
    });
  });

  return forms;
}

function isExcludedControl($: CheerioAPI, control: Element): boolean {
  const $control = $(control);

  if ($control[0]?.tagName.toLowerCase() !== "input") {
    return false;
  }

  const type = ($control.attr("type") ?? "text").toLowerCase();

  return type === "hidden" || type === "submit" || type === "button";
}

function hasAccessibleLabel($: CheerioAPI, control: Element): boolean {
  const $control = $(control);
  const id = $control.attr("id");

  if (id && $(`label[for="${cssEscape(id)}"]`).length > 0) {
    return true;
  }

  if ($control.parents("label").length > 0) {
    return true;
  }

  return Boolean($control.attr("aria-label") || $control.attr("aria-labelledby"));
}

function cssEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
