import { describe, expect, it, vi } from "vitest";

import { makeInput } from "./test-helpers";
import { allAuditRules, getAuditRuleMetadata, runAudit } from "./run-audit";
import { seoRules } from "./seo/rules";

describe("runAudit", () => {
  it("runs all rules in fixed category order and skips null results", () => {
    const { findings, skippedRuleIds } = runAudit(
      makeInput({ performance: { available: false } }),
    );

    expect(findings[0]?.category).toBe("seo");
    expect(findings.at(-1)?.category).toBe("trust");
    expect(findings.some((finding) => finding.ruleId === "perf-lcp")).toBe(false);
    expect(findings.some((finding) => finding.ruleId === "perf-page-size")).toBe(true);
    expect(skippedRuleIds).toEqual([]);
  });

  it("keeps running and reports skipped rules when one rule throws", () => {
    const originalEvaluate = seoRules[0]?.evaluate;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    if (!seoRules[0] || !originalEvaluate) {
      throw new Error("Expected first SEO rule");
    }

    seoRules[0].evaluate = () => {
      throw new Error("boom");
    };

    try {
      const { findings, skippedRuleIds } = runAudit(makeInput());

      expect(findings.some((finding) => finding.ruleId === "seo-title-length")).toBe(true);
      expect(skippedRuleIds).toEqual(["seo-missing-title"]);
      expect(consoleError).toHaveBeenCalledWith("Audit rule seo-missing-title failed", expect.any(Error));
    } finally {
      seoRules[0].evaluate = originalEvaluate;
      consoleError.mockRestore();
    }
  });

  it("has unique rule IDs and emits stable kebab-case IDs", () => {
    const ids = allAuditRules.map((rule) => rule.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
    expect(ids).toHaveLength(43);
    expect(ids.every((id) => /^(seo|perf|mobile|a11y|conv|trust)-[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it("emits findings with matching rule IDs, categories, and score impact conventions", () => {
    const { findings, skippedRuleIds } = runAudit(makeInput());

    expect(findings).toHaveLength(43);
    expect(skippedRuleIds).toEqual([]);
    expect(findings.every((finding) => finding.scoreImpact === 0)).toBe(true);
    expect(findings.every((finding) => finding.ruleId.includes("-"))).toBe(true);
    expect(findings.every((finding) => finding.evidence.length > 0)).toBe(true);
  });

  it("keeps rule metadata equivalent to the old priority classification sets", () => {
    const lowEffortRuleIds = new Set([
      "seo-missing-title",
      "seo-title-length",
      "seo-missing-meta-description",
      "seo-meta-description-length",
      "seo-missing-canonical",
      "seo-missing-og-title",
      "seo-missing-og-description",
      "seo-noindex",
      "mobile-missing-viewport",
      "mobile-viewport-content",
      "seo-images-missing-alt",
      "a11y-images-alt",
      "trust-no-social",
    ]);
    const highEffortRuleIds = new Set([
      "perf-score",
      "perf-lcp",
      "perf-tbt",
      "mobile-performance",
      "conv-headline",
      "conv-no-offer-language",
      "trust-no-testimonials",
    ]);
    const blockingRuleIds = new Set([
      "seo-noindex",
      "trust-no-https",
      "mobile-missing-viewport",
    ]);

    for (const rule of allAuditRules) {
      const metadata = getAuditRuleMetadata(rule.id);

      expect(metadata.effort).toBe(
        highEffortRuleIds.has(rule.id)
          ? "high"
          : lowEffortRuleIds.has(rule.id)
            ? "low"
            : "medium",
      );
      expect(metadata.blocking).toBe(blockingRuleIds.has(rule.id));
    }

    expect(getAuditRuleMetadata("unknown-rule")).toEqual({
      effort: "medium",
      blocking: false,
    });
  });
});
