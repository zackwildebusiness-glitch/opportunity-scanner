import type { AuditFinding } from "@/types/audit";
import type { AuditInput } from "@/types/collected-data";

type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends Array<unknown>
    ? T[Key]
    : T[Key] extends object
      ? DeepPartial<T[Key]>
      : T[Key];
};

export function makeInput(overrides: DeepPartial<AuditInput> = {}): AuditInput {
  const base: AuditInput = {
    page: {
      url: "https://example.com",
      isHttps: true,
      httpStatus: 200,
      responseTimeMs: 250,
      pageSizeBytes: 500_000,
      redirectChain: [],
      title: "Example Services for Growing Local Businesses",
      metaDescription:
        "Example Services helps growing local businesses improve operations, attract better prospects, and convert more visitors online.",
      canonicalUrl: "https://example.com/",
      robotsMeta: "index,follow",
      viewportMeta: "width=device-width, initial-scale=1",
      headings: [
        { level: 1, text: "Example Services for Growing Businesses" },
        { level: 2, text: "What We Do" },
        { level: 3, text: "Lead Generation" },
      ],
      h1Count: 1,
      images: [
        { src: "/hero.jpg", alt: "Team planning a growth campaign" },
        { src: "/logo.png", alt: "Example Services logo" },
      ],
      internalLinks: [{ href: "/contact", text: "Contact", isInternal: true }],
      externalLinks: [],
      buttons: [{ accessibleName: "Book a consultation", element: "button" }],
      forms: [{ inputCount: 3, unlabeledInputCount: 0, hasSubmit: true }],
      ctas: [{ text: "Book a consultation", element: "a", domIndex: 1 }],
      openGraph: {
        title: "Example Services for Growing Local Businesses",
        description: "Improve operations, attract prospects, and convert more visitors with Example Services.",
        image: "https://example.com/og.jpg",
      },
      structuredData: {
        types: ["Organization"],
        blockCount: 1,
        invalidBlockCount: 0,
      },
      contact: {
        hasEmail: true,
        hasPhone: true,
        hasContactLink: true,
        hasAddress: true,
      },
      trust: {
        hasPrivacyPolicyLink: true,
        hasTestimonialIndicators: true,
        hasSocialLinks: true,
        hasBusinessIdentity: true,
      },
      textStats: {
        wordCount: 450,
        headlineText: "Grow your local business",
        hasServiceLanguage: true,
      },
    },
    performance: {
      available: true,
      performanceScore: 95,
      accessibilityScore: 95,
      seoScore: 95,
      bestPracticesScore: 95,
      lcpMs: 1800,
      cls: 0.02,
      inpMs: 120,
      fcpMs: 1000,
      tbtMs: 100,
    },
  };

  return {
    page: {
      ...base.page,
      ...overrides.page,
      openGraph: { ...base.page.openGraph, ...overrides.page?.openGraph },
      structuredData: { ...base.page.structuredData, ...overrides.page?.structuredData },
      contact: { ...base.page.contact, ...overrides.page?.contact },
      trust: { ...base.page.trust, ...overrides.page?.trust },
      textStats: { ...base.page.textStats, ...overrides.page?.textStats },
    },
    performance: {
      ...base.performance,
      ...overrides.performance,
    },
  };
}

export function findingByRule(findings: AuditFinding[], ruleId: string): AuditFinding {
  const finding = findings.find((item) => item.ruleId === ruleId);

  if (!finding) {
    throw new Error(`Finding not found for rule ${ruleId}`);
  }

  return finding;
}
