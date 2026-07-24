import { describe, expect, it } from "vitest";

import { findingByRule, makeInput } from "../test-helpers";
import { seoRules } from "./rules";

function evaluate(ruleId: string, input = makeInput()) {
  const rule = seoRules.find((item) => item.id === ruleId);

  if (!rule) {
    throw new Error(`Missing rule ${ruleId}`);
  }

  return rule.evaluate(input);
}

describe("seo rules", () => {
  it.each(seoRules.map((rule) => rule.id))("%s passes for the healthy fixture", (ruleId) => {
    expect(evaluate(ruleId)?.status).toBe("pass");
  });

  it("fails when the title is missing", () => {
    expect(evaluate("seo-missing-title", makeInput({ page: { title: null } }))?.status).toBe("fail");
  });

  it("warns outside title length boundaries and passes at the boundaries", () => {
    expect(evaluate("seo-title-length", makeInput({ page: { title: "a".repeat(29) } }))?.status).toBe("warning");
    expect(evaluate("seo-title-length", makeInput({ page: { title: "a".repeat(30) } }))?.status).toBe("pass");
    expect(evaluate("seo-title-length", makeInput({ page: { title: "a".repeat(60) } }))?.status).toBe("pass");
    expect(evaluate("seo-title-length", makeInput({ page: { title: "a".repeat(61) } }))?.status).toBe("warning");
  });

  it("fails when the meta description is missing", () => {
    expect(evaluate("seo-missing-meta-description", makeInput({ page: { metaDescription: null } }))?.status).toBe("fail");
  });

  it("warns outside meta description length boundaries and passes at the boundaries", () => {
    expect(evaluate("seo-meta-description-length", makeInput({ page: { metaDescription: "a".repeat(69) } }))?.status).toBe("warning");
    expect(evaluate("seo-meta-description-length", makeInput({ page: { metaDescription: "a".repeat(70) } }))?.status).toBe("pass");
    expect(evaluate("seo-meta-description-length", makeInput({ page: { metaDescription: "a".repeat(160) } }))?.status).toBe("pass");
    expect(evaluate("seo-meta-description-length", makeInput({ page: { metaDescription: "a".repeat(161) } }))?.status).toBe("warning");
  });

  it("warns when canonical URL is missing", () => {
    expect(evaluate("seo-missing-canonical", makeInput({ page: { canonicalUrl: null } }))?.status).toBe("warning");
  });

  it("fails when H1 is missing", () => {
    expect(evaluate("seo-missing-h1", makeInput({ page: { h1Count: 0 } }))?.status).toBe("fail");
  });

  it("warns when multiple H1 headings are present", () => {
    expect(evaluate("seo-multiple-h1", makeInput({ page: { h1Count: 2 } }))?.status).toBe("warning");
  });

  it("warns when heading hierarchy skips a level", () => {
    const input = makeInput({
      page: {
        headings: [
          { level: 1, text: "Main" },
          { level: 2, text: "Section" },
          { level: 4, text: "Skipped" },
        ],
      },
    });

    expect(evaluate("seo-heading-hierarchy", input)?.status).toBe("warning");
  });

  it("warns when Open Graph title is missing", () => {
    expect(evaluate("seo-missing-og-title", makeInput({ page: { openGraph: { title: null } } }))?.status).toBe("warning");
  });

  it("warns when Open Graph description is missing", () => {
    expect(evaluate("seo-missing-og-description", makeInput({ page: { openGraph: { description: null } } }))?.status).toBe("warning");
  });

  it("warns when structured data is missing", () => {
    const finding = evaluate(
      "seo-missing-structured-data",
      makeInput({ page: { structuredData: { blockCount: 0, types: [] } } }),
    );

    expect(finding?.status).toBe("warning");
  });

  it("fails when robots meta contains noindex", () => {
    const finding = evaluate("seo-noindex", makeInput({ page: { robotsMeta: "noindex,nofollow" } }));

    expect(finding?.status).toBe("fail");
    expect(finding?.severity).toBe("critical");
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

    expect(evaluate("seo-images-missing-alt", warningInput)?.status).toBe("warning");
    expect(evaluate("seo-images-missing-alt", failInput)?.status).toBe("fail");
  });

  it("returns concrete evidence for SEO findings", () => {
    const findings = seoRules.map((rule) => rule.evaluate(makeInput())).filter((finding) => finding !== null);

    expect(findingByRule(findings, "seo-missing-title").evidence).toContain("Title: Example Services for Growing Local Businesses");
  });
});
