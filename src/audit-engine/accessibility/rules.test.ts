import { describe, expect, it } from "vitest";

import { makeInput } from "../test-helpers";
import { accessibilityRules } from "./rules";

function evaluate(ruleId: string, input = makeInput()) {
  const rule = accessibilityRules.find((item) => item.id === ruleId);

  if (!rule) {
    throw new Error(`Missing rule ${ruleId}`);
  }

  return rule.evaluate(input);
}

describe("accessibility rules", () => {
  it.each(accessibilityRules.map((rule) => rule.id))("%s passes for the healthy fixture", (ruleId) => {
    expect(evaluate(ruleId)?.status).toBe("pass");
  });

  it("warns for any missing image alt and fails when more than 20 percent are missing with at least two images", () => {
    const warningInput = makeInput({
      page: {
        images: [
          { src: "/one.jpg", alt: null },
          { src: "/two.jpg", alt: "Two" },
          { src: "/three.jpg", alt: "Three" },
          { src: "/four.jpg", alt: "Four" },
          { src: "/five.jpg", alt: "Five" },
        ],
      },
    });
    const failInput = makeInput({
      page: {
        images: [
          { src: "/one.jpg", alt: null },
          { src: "/two.jpg", alt: null },
          { src: "/three.jpg", alt: "Three" },
          { src: "/four.jpg", alt: "Four" },
        ],
      },
    });

    expect(evaluate("a11y-images-alt", warningInput)?.status).toBe("warning");
    expect(evaluate("a11y-images-alt", failInput)?.status).toBe("fail");
  });

  it("fails when forms contain unlabeled inputs", () => {
    expect(
      evaluate("a11y-form-labels", makeInput({ page: { forms: [{ inputCount: 2, unlabeledInputCount: 1, hasSubmit: true }] } }))
        ?.status,
    ).toBe("fail");
  });

  it("fails when a button lacks an accessible name", () => {
    expect(evaluate("a11y-button-names", makeInput({ page: { buttons: [{ accessibleName: "", element: "button" }] } }))?.status).toBe(
      "fail",
    );
  });

  it("fails and warns by Lighthouse accessibility score", () => {
    expect(evaluate("a11y-score", makeInput({ performance: { accessibilityScore: 89 } }))?.status).toBe("warning");
    expect(evaluate("a11y-score", makeInput({ performance: { accessibilityScore: 69 } }))?.status).toBe("fail");
  });

  it("returns null for accessibility score when PSI data is unavailable", () => {
    expect(evaluate("a11y-score", makeInput({ performance: { available: false } }))).toBeNull();
  });

  it("warns when heading structure skips a level", () => {
    const input = makeInput({
      page: {
        headings: [
          { level: 1, text: "Main" },
          { level: 2, text: "Section" },
          { level: 4, text: "Skipped" },
        ],
      },
    });

    expect(evaluate("a11y-heading-structure", input)?.status).toBe("warning");
  });
});
