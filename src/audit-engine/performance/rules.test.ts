import { describe, expect, it } from "vitest";

import { makeInput } from "../test-helpers";
import { performanceRules } from "./rules";

function evaluate(ruleId: string, input = makeInput()) {
  const rule = performanceRules.find((item) => item.id === ruleId);

  if (!rule) {
    throw new Error(`Missing rule ${ruleId}`);
  }

  return rule.evaluate(input);
}

describe("performance rules", () => {
  it.each(performanceRules.map((rule) => rule.id))("%s passes for the healthy fixture", (ruleId) => {
    expect(evaluate(ruleId)?.status).toBe("pass");
  });

  it("applies LCP warning and failure thresholds with strict boundaries", () => {
    expect(evaluate("perf-lcp", makeInput({ performance: { lcpMs: 2500 } }))?.status).toBe("pass");
    expect(evaluate("perf-lcp", makeInput({ performance: { lcpMs: 2501 } }))?.status).toBe("warning");
    expect(evaluate("perf-lcp", makeInput({ performance: { lcpMs: 4000 } }))?.status).toBe("warning");
    expect(evaluate("perf-lcp", makeInput({ performance: { lcpMs: 4001 } }))?.status).toBe("fail");
  });

  it("applies CLS warning and failure thresholds with strict boundaries", () => {
    expect(evaluate("perf-cls", makeInput({ performance: { cls: 0.1 } }))?.status).toBe("pass");
    expect(evaluate("perf-cls", makeInput({ performance: { cls: 0.1001 } }))?.status).toBe("warning");
    expect(evaluate("perf-cls", makeInput({ performance: { cls: 0.25 } }))?.status).toBe("warning");
    expect(evaluate("perf-cls", makeInput({ performance: { cls: 0.251 } }))?.status).toBe("fail");
  });

  it("fails and warns by INP threshold and returns null when INP is unavailable", () => {
    expect(evaluate("perf-inp", makeInput({ performance: { inpMs: 201 } }))?.status).toBe("warning");
    expect(evaluate("perf-inp", makeInput({ performance: { inpMs: 501 } }))?.status).toBe("fail");
    expect(evaluate("perf-inp", makeInput({ performance: { inpMs: null } }))).toBeNull();
  });

  it("fails and warns by Lighthouse performance score", () => {
    expect(evaluate("perf-score", makeInput({ performance: { performanceScore: 89 } }))?.status).toBe("warning");
    expect(evaluate("perf-score", makeInput({ performance: { performanceScore: 49 } }))?.status).toBe("fail");
  });

  it("warns when TBT exceeds 600ms", () => {
    expect(evaluate("perf-tbt", makeInput({ performance: { tbtMs: 601 } }))?.status).toBe("warning");
  });

  it("warns for large pages and fails at the 2MB cap", () => {
    expect(evaluate("perf-page-size", makeInput({ page: { pageSizeBytes: 1_500_001 } }))?.status).toBe("warning");
    expect(evaluate("perf-page-size", makeInput({ page: { pageSizeBytes: 2_000_000 } }))?.status).toBe("fail");
  });

  it("warns when more than 40 images are present", () => {
    const images = Array.from({ length: 41 }, (_, index) => ({
      src: `/image-${index}.jpg`,
      alt: `Image ${index}`,
    }));

    expect(evaluate("perf-image-count", makeInput({ page: { images } }))?.status).toBe("warning");
  });

  it("returns null for PSI-dependent performance rules when unavailable but still evaluates page size", () => {
    const input = makeInput({
      page: { pageSizeBytes: 500_000 },
      performance: { available: false },
    });

    expect(evaluate("perf-lcp", input)).toBeNull();
    expect(evaluate("perf-cls", input)).toBeNull();
    expect(evaluate("perf-inp", input)).toBeNull();
    expect(evaluate("perf-score", input)).toBeNull();
    expect(evaluate("perf-tbt", input)).toBeNull();
    expect(evaluate("perf-image-count", input)).toBeNull();
    expect(evaluate("perf-page-size", input)?.status).toBe("pass");
  });
});
