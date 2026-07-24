import { describe, expect, it } from "vitest";

import { makeInput } from "../test-helpers";
import { conversionRules } from "./rules";

function evaluate(ruleId: string, input = makeInput()) {
  const rule = conversionRules.find((item) => item.id === ruleId);

  if (!rule) {
    throw new Error(`Missing rule ${ruleId}`);
  }

  return rule.evaluate(input);
}

describe("conversion rules", () => {
  it.each(conversionRules.map((rule) => rule.id))("%s passes for the healthy fixture", (ruleId) => {
    const result = evaluate(ruleId);

    expect(result?.status).toBe("pass");
    expect(result?.description.toLowerCase()).toMatch(/appears|may/);
  });

  it("fails when no CTA is detected", () => {
    expect(evaluate("conv-no-cta", makeInput({ page: { ctas: [] } }))?.status).toBe("fail");
  });

  it("warns when there are more than eight distinct CTA texts", () => {
    const ctas = Array.from({ length: 9 }, (_, index) => ({
      text: `Action ${index}`,
      element: "a" as const,
      domIndex: index,
    }));

    expect(evaluate("conv-too-many-ctas", makeInput({ page: { ctas } }))?.status).toBe("warning");
  });

  it("fails when no contact path is detected", () => {
    const input = makeInput({
      page: {
        contact: {
          hasContactLink: false,
          hasEmail: false,
          hasPhone: false,
        },
      },
    });

    expect(evaluate("conv-no-contact-path", input)?.status).toBe("fail");
  });

  it("warns when no form is detected", () => {
    expect(evaluate("conv-no-form", makeInput({ page: { forms: [] } }))?.status).toBe("warning");
  });

  it("warns when every CTA is generic", () => {
    const input = makeInput({
      page: {
        ctas: [
          { text: "Learn more", element: "a", domIndex: 1 },
          { text: "Submit", element: "button", domIndex: 2 },
        ],
      },
    });

    expect(evaluate("conv-generic-cta", input)?.status).toBe("warning");
  });

  it("warns when no benefit-focused headline is detectable", () => {
    expect(evaluate("conv-headline", makeInput({ page: { textStats: { headlineText: "Welcome" } } }))?.status).toBe("warning");
    expect(evaluate("conv-headline", makeInput({ page: { textStats: { headlineText: null } } }))?.status).toBe("warning");
  });

  it("warns when no offer language is detected", () => {
    expect(evaluate("conv-no-offer-language", makeInput({ page: { textStats: { hasServiceLanguage: false } } }))?.status).toBe(
      "warning",
    );
  });

  it("warns when no early CTA is detected", () => {
    expect(evaluate("conv-above-fold", makeInput({ page: { ctas: [{ text: "Book now", element: "a", domIndex: 4 }] } }))?.status).toBe(
      "warning",
    );
  });
});
