import { describe, expect, it } from "vitest";

import type { AuditFinding } from "@/types/audit";

import { calculateCategoryScore } from "./calculate-category-score";
import { calculateScoreSummary } from "./calculate-overall-score";
import { prioritizeFindings } from "./prioritize-findings";

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    ruleId: "seo-missing-title",
    category: "seo",
    title: "Missing page title",
    description: "The page has no title tag.",
    status: "fail",
    severity: "high",
    evidence: [],
    recommendation: "Add a descriptive title tag.",
    scoreImpact: 14,
    ...overrides,
  };
}

describe("calculateCategoryScore", () => {
  it("returns 100 with no findings", () => {
    expect(calculateCategoryScore("seo", [])).toBe(100);
  });

  it("ignores pass findings and other categories", () => {
    const findings = [
      makeFinding({ status: "pass", scoreImpact: 0 }),
      makeFinding({ category: "trust", scoreImpact: 50 }),
    ];

    expect(calculateCategoryScore("seo", findings)).toBe(100);
  });

  it("subtracts score impact of warnings and failures", () => {
    const findings = [
      makeFinding({ ruleId: "a", scoreImpact: 14 }),
      makeFinding({ ruleId: "b", status: "warning", scoreImpact: 8 }),
    ];

    expect(calculateCategoryScore("seo", findings)).toBe(78);
  });

  it("floors at zero", () => {
    const findings = Array.from({ length: 10 }, (_, index) =>
      makeFinding({ ruleId: `rule-${index}`, scoreImpact: 20 }),
    );

    expect(calculateCategoryScore("seo", findings)).toBe(0);
  });

  it("ignores negative score impact", () => {
    expect(
      calculateCategoryScore("seo", [makeFinding({ scoreImpact: -50 })]),
    ).toBe(100);
  });
});

describe("calculateScoreSummary", () => {
  it("returns 100 overall for a clean site", () => {
    const summary = calculateScoreSummary([]);

    expect(summary.overallScore).toBe(100);
    expect(summary.categoryScores).toHaveLength(6);
    expect(summary.failCount).toBe(0);
  });

  it("weights categories per product decision", () => {
    // Tank conversion (weight 0.30) to 0: overall drops by exactly 30.
    const findings = Array.from({ length: 10 }, (_, index) =>
      makeFinding({
        ruleId: `conv-${index}`,
        category: "conversion",
        scoreImpact: 20,
      }),
    );

    const summary = calculateScoreSummary(findings);

    expect(
      summary.categoryScores.find((s) => s.category === "conversion")?.score,
    ).toBe(0);
    expect(summary.overallScore).toBe(70);
  });

  it("counts severities and statuses of non-pass findings", () => {
    const findings = [
      makeFinding({ ruleId: "a", severity: "critical" }),
      makeFinding({ ruleId: "b", severity: "high", status: "warning" }),
      makeFinding({ ruleId: "c", status: "pass", severity: "low" }),
    ];

    const summary = calculateScoreSummary(findings);

    expect(summary.severityCounts.critical).toBe(1);
    expect(summary.severityCounts.high).toBe(1);
    expect(summary.severityCounts.low).toBe(0);
    expect(summary.passCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.failCount).toBe(1);
  });

  it("is deterministic for identical input", () => {
    const findings = [makeFinding(), makeFinding({ ruleId: "x" })];

    expect(calculateScoreSummary(findings)).toEqual(
      calculateScoreSummary(findings),
    );
  });
});

describe("prioritizeFindings", () => {
  it("excludes pass findings", () => {
    const actions = prioritizeFindings([
      makeFinding({ status: "pass", scoreImpact: 0 }),
    ]);

    expect(actions).toHaveLength(0);
  });

  it("puts blockers first regardless of severity math", () => {
    const findings = [
      makeFinding({
        ruleId: "conv-no-cta",
        category: "conversion",
        severity: "high",
        scoreImpact: 14,
      }),
      makeFinding({
        ruleId: "seo-noindex",
        category: "seo",
        severity: "critical",
        scoreImpact: 20,
      }),
      makeFinding({
        ruleId: "trust-no-https",
        category: "trust",
        severity: "critical",
        scoreImpact: 20,
      }),
    ];

    const actions = prioritizeFindings(findings);

    expect(actions[0]?.relatedRuleIds[0]).toMatch(/seo-noindex|trust-no-https/);
    expect(actions[1]?.relatedRuleIds[0]).toMatch(/seo-noindex|trust-no-https/);
    expect(actions[2]?.relatedRuleIds[0]).toBe("conv-no-cta");
  });

  it("assigns sequential recommendedOrder starting at 1", () => {
    const findings = [
      makeFinding({ ruleId: "a" }),
      makeFinding({ ruleId: "b", severity: "low", scoreImpact: 4 }),
    ];

    const actions = prioritizeFindings(findings);

    expect(actions.map((a) => a.recommendedOrder)).toEqual([1, 2]);
  });

  it("respects the limit", () => {
    const findings = Array.from({ length: 20 }, (_, index) =>
      makeFinding({ ruleId: `rule-${index}` }),
    );

    expect(prioritizeFindings(findings, 5)).toHaveLength(5);
  });

  it("estimates low effort for meta-level fixes and high for rebuild-level work", () => {
    const actions = prioritizeFindings([
      makeFinding({ ruleId: "seo-missing-title" }),
      makeFinding({ ruleId: "perf-score", category: "performance" }),
    ]);

    const metaFix = actions.find((a) => a.relatedRuleIds[0] === "seo-missing-title");
    const perfFix = actions.find((a) => a.relatedRuleIds[0] === "perf-score");

    expect(metaFix?.estimatedEffort).toBe("low");
    expect(perfFix?.estimatedEffort).toBe("high");
  });

  it("is deterministic — equal-priority findings tiebreak on ruleId", () => {
    const findings = [
      makeFinding({ ruleId: "seo-zeta" }),
      makeFinding({ ruleId: "seo-alpha" }),
    ];

    const first = prioritizeFindings(findings);
    const second = prioritizeFindings([...findings].reverse());

    expect(first.map((a) => a.id)).toEqual(second.map((a) => a.id));
  });
});
