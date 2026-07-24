import { describe, expect, it } from "vitest";

import { makeInput } from "../test-helpers";
import { mobileRules } from "./rules";

function evaluate(ruleId: string, input = makeInput()) {
  const rule = mobileRules.find((item) => item.id === ruleId);

  if (!rule) {
    throw new Error(`Missing rule ${ruleId}`);
  }

  return rule.evaluate(input);
}

describe("mobile rules", () => {
  it.each(mobileRules.map((rule) => rule.id))("%s passes for the healthy fixture", (ruleId) => {
    expect(evaluate(ruleId)?.status).toBe("pass");
  });

  it("fails when viewport meta is missing", () => {
    expect(evaluate("mobile-missing-viewport", makeInput({ page: { viewportMeta: null } }))?.status).toBe("fail");
  });

  it("warns when viewport meta omits device width", () => {
    expect(evaluate("mobile-viewport-content", makeInput({ page: { viewportMeta: "initial-scale=1" } }))?.status).toBe("warning");
  });

  it("fails and warns by mobile performance score", () => {
    expect(evaluate("mobile-performance", makeInput({ performance: { performanceScore: 69 } }))?.status).toBe("warning");
    expect(evaluate("mobile-performance", makeInput({ performance: { performanceScore: 49 } }))?.status).toBe("fail");
  });

  it("returns null for mobile performance when PSI data is unavailable", () => {
    expect(evaluate("mobile-performance", makeInput({ performance: { available: false } }))).toBeNull();
  });

  it("warns when mobile page weight exceeds 1MB", () => {
    expect(evaluate("mobile-page-weight", makeInput({ page: { pageSizeBytes: 1_000_001 } }))?.status).toBe("warning");
  });
});
