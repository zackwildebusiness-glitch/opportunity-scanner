import { describe, expect, it } from "vitest";

import { makeInput } from "../test-helpers";
import { trustRules } from "./rules";

function evaluate(ruleId: string, input = makeInput()) {
  const rule = trustRules.find((item) => item.id === ruleId);

  if (!rule) {
    throw new Error(`Missing rule ${ruleId}`);
  }

  return rule.evaluate(input);
}

describe("trust rules", () => {
  it.each(trustRules.map((rule) => rule.id))("%s passes for the healthy fixture", (ruleId) => {
    expect(evaluate(ruleId)?.status).toBe("pass");
  });

  it("fails when contact information is missing", () => {
    const input = makeInput({
      page: {
        contact: {
          hasEmail: false,
          hasPhone: false,
          hasAddress: false,
        },
      },
    });

    expect(evaluate("trust-no-contact-info", input)?.status).toBe("fail");
  });

  it("warns when privacy policy link is missing", () => {
    expect(evaluate("trust-no-privacy-policy", makeInput({ page: { trust: { hasPrivacyPolicyLink: false } } }))?.status).toBe(
      "warning",
    );
  });

  it("warns when business identity is missing", () => {
    expect(evaluate("trust-no-identity", makeInput({ page: { trust: { hasBusinessIdentity: false } } }))?.status).toBe("warning");
  });

  it("warns when testimonials are missing", () => {
    expect(evaluate("trust-no-testimonials", makeInput({ page: { trust: { hasTestimonialIndicators: false } } }))?.status).toBe(
      "warning",
    );
  });

  it("fails when HTTPS is not enabled", () => {
    expect(evaluate("trust-no-https", makeInput({ page: { url: "http://example.com", isHttps: false } }))?.status).toBe("fail");
  });

  it("warns when social links are missing", () => {
    expect(evaluate("trust-no-social", makeInput({ page: { trust: { hasSocialLinks: false } } }))?.status).toBe("warning");
  });
});
