import type { AuditInput } from "@/types/collected-data";

import { finding, wordCount } from "../helpers";
import type { AuditRule } from "../types";

const GENERIC_CTA_TEXTS = new Set(["submit", "click here", "learn more", "read more", "more info"]);

function ctaTexts(input: AuditInput): string[] {
  return input.page.ctas.map((cta) => cta.text.trim()).filter(Boolean);
}

export const conversionRules: AuditRule[] = [
  {
    id: "conv-no-cta",
    category: "conversion",
    effort: "medium",
    evaluate(input: AuditInput) {
      const status = input.page.ctas.length === 0 ? "fail" : "pass";

      return finding({
        ruleId: "conv-no-cta",
        category: "conversion",
        title: status === "pass" ? "CTA appears present" : "No CTA detected",
        description: status === "pass"
          ? "The page appears to include at least one call to action."
          : "Checked whether the page appears to include a call to action opportunity.",
        status,
        severity: status === "pass" ? "low" : "high",
        evidence: [`CTA count: ${input.page.ctas.length}`, `CTA texts: ${ctaTexts(input).join(", ") || "none"}`],
        recommendation: status === "pass" ? "Keep the primary CTA visible and specific." : "Add a clear CTA that matches the desired visitor action.",
      });
    },
  },
  {
    id: "conv-too-many-ctas",
    category: "conversion",
    effort: "medium",
    evaluate(input: AuditInput) {
      const distinctTexts = new Set(ctaTexts(input).map((text) => text.toLowerCase()));
      const status = distinctTexts.size > 8 ? "warning" : "pass";

      return finding({
        ruleId: "conv-too-many-ctas",
        category: "conversion",
        title: status === "pass" ? "CTA set appears focused" : "Many distinct CTAs detected",
        description: status === "pass"
          ? "The page appears to keep CTA choices focused."
          : "Checked whether the page may present more than eight distinct CTA texts.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Distinct CTA texts: ${distinctTexts.size}`, `CTA texts: ${Array.from(distinctTexts).join(", ") || "none"}`],
        recommendation: status === "pass" ? "Keep CTA choices focused around the primary journey." : "Consolidate competing CTAs around the highest-value actions.",
      });
    },
  },
  {
    id: "conv-no-contact-path",
    category: "conversion",
    effort: "medium",
    evaluate(input: AuditInput) {
      const hasContactPath = input.page.contact.hasContactLink || input.page.contact.hasEmail || input.page.contact.hasPhone;
      const status = hasContactPath ? "pass" : "fail";

      return finding({
        ruleId: "conv-no-contact-path",
        category: "conversion",
        title: status === "pass" ? "Contact path appears available" : "No contact path detected",
        description: status === "pass"
          ? "The page appears to provide at least one contact path."
          : "Checked whether visitors may have an obvious contact path through a contact link, email, or phone.",
        status,
        severity: status === "pass" ? "low" : "high",
        evidence: [
          `Contact link: ${input.page.contact.hasContactLink}`,
          `Email: ${input.page.contact.hasEmail}`,
          `Phone: ${input.page.contact.hasPhone}`,
        ],
        recommendation: status === "pass" ? "Keep contact paths easy to find." : "Add a clear contact link, email address, or phone number.",
      });
    },
  },
  {
    id: "conv-no-form",
    category: "conversion",
    effort: "medium",
    evaluate(input: AuditInput) {
      const status = input.page.forms.length === 0 ? "warning" : "pass";

      return finding({
        ruleId: "conv-no-form",
        category: "conversion",
        title: status === "pass" ? "Form appears available" : "No form detected",
        description: status === "pass"
          ? "The page appears to include a form-based conversion path."
          : "Checked whether the page may lack a form-based conversion opportunity.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Form count: ${input.page.forms.length}`],
        recommendation: status === "pass" ? "Keep forms short and purposeful." : "Add a simple form if direct inquiries are a goal for this page.",
      });
    },
  },
  {
    id: "conv-generic-cta",
    category: "conversion",
    effort: "medium",
    evaluate(input: AuditInput) {
      const texts = ctaTexts(input);
      const allGeneric = texts.length > 0 && texts.every((text) => GENERIC_CTA_TEXTS.has(text.toLowerCase()));
      const status = allGeneric ? "warning" : "pass";

      return finding({
        ruleId: "conv-generic-cta",
        category: "conversion",
        title: status === "pass" ? "CTA wording appears specific" : "CTA wording appears generic",
        description: status === "pass"
          ? "The page appears to use at least one CTA text beyond generic wording."
          : "Checked whether every CTA text may be generic rather than action-specific.",
        status,
        severity: status === "pass" ? "low" : "low",
        evidence: [`CTA texts: ${texts.join(", ") || "none"}`],
        recommendation: status === "pass" ? "Keep CTA text tied to the visitor outcome." : "Use CTA text that describes the specific next step or benefit.",
      });
    },
  },
  {
    id: "conv-headline",
    category: "conversion",
    effort: "high",
    evaluate(input: AuditInput) {
      const headline = input.page.textStats.headlineText;
      const headlineWordCount = headline === null ? 0 : wordCount(headline);
      const status = headline === null || headlineWordCount < 3 ? "warning" : "pass";

      return finding({
        ruleId: "conv-headline",
        category: "conversion",
        title: status === "pass" ? "Headline appears descriptive" : "Benefit-focused headline not detected",
        description: status === "pass"
          ? "The first detected headline appears long enough to communicate a value proposition."
          : "Checked whether the first detected headline may be too short or missing for a benefit-focused message.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Headline: ${headline ?? "missing"}`, `Headline word count: ${headlineWordCount}`],
        recommendation: status === "pass" ? "Keep the headline clear and benefit-focused." : "Add a concise headline that states the offer or visitor benefit.",
      });
    },
  },
  {
    id: "conv-no-offer-language",
    category: "conversion",
    effort: "high",
    evaluate(input: AuditInput) {
      const status = input.page.textStats.hasServiceLanguage ? "pass" : "warning";

      return finding({
        ruleId: "conv-no-offer-language",
        category: "conversion",
        title: status === "pass" ? "Offer language appears present" : "Offer language not detected",
        description: status === "pass"
          ? "The page appears to include service, product, or offer language."
          : "Checked whether the page may lack detectable service, product, or offer language.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Has service language: ${input.page.textStats.hasServiceLanguage}`],
        recommendation: status === "pass" ? "Keep offer language specific and easy to scan." : "Clarify what service, product, or offer the visitor can act on.",
      });
    },
  },
  {
    id: "conv-above-fold",
    category: "conversion",
    effort: "medium",
    evaluate(input: AuditInput) {
      const hasEarlyCta = input.page.ctas.some((cta) => cta.domIndex <= 3);
      const status = hasEarlyCta ? "pass" : "warning";

      return finding({
        ruleId: "conv-above-fold",
        category: "conversion",
        title: status === "pass" ? "Early CTA appears available" : "No early CTA detected",
        description: status === "pass"
          ? "The page appears to include an early conversion opportunity."
          : "Checked whether the page may lack a CTA in the first few detected interactive elements.",
        status,
        severity: status === "pass" ? "low" : "low",
        evidence: [`CTA dom indexes: ${input.page.ctas.map((cta) => cta.domIndex).join(", ") || "none"}`],
        recommendation: status === "pass" ? "Keep an early CTA visible without crowding the page." : "Place a relevant CTA near the top of the page.",
      });
    },
  },
];
