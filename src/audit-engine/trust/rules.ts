import type { AuditInput } from "@/types/collected-data";

import { finding } from "../helpers";
import type { AuditRule } from "../types";

export const trustRules: AuditRule[] = [
  {
    id: "trust-no-contact-info",
    category: "trust",
    effort: "medium",
    evaluate(input: AuditInput) {
      const hasContactInfo = input.page.contact.hasEmail || input.page.contact.hasPhone || input.page.contact.hasAddress;
      const status = hasContactInfo ? "pass" : "fail";

      return finding({
        ruleId: "trust-no-contact-info",
        category: "trust",
        title: status === "pass" ? "Contact information is present" : "No contact information detected",
        description: status === "pass"
          ? "The page includes contact information signals."
          : "Checked whether the page includes email, phone, or address contact information.",
        status,
        severity: status === "pass" ? "low" : "high",
        evidence: [
          `Email: ${input.page.contact.hasEmail}`,
          `Phone: ${input.page.contact.hasPhone}`,
          `Address: ${input.page.contact.hasAddress}`,
        ],
        recommendation: status === "pass" ? "Keep contact information current." : "Add at least one direct contact detail such as email, phone, or address.",
      });
    },
  },
  {
    id: "trust-no-privacy-policy",
    category: "trust",
    effort: "medium",
    evaluate(input: AuditInput) {
      const status = input.page.trust.hasPrivacyPolicyLink ? "pass" : "warning";

      return finding({
        ruleId: "trust-no-privacy-policy",
        category: "trust",
        title: status === "pass" ? "Privacy policy link is present" : "No privacy policy link detected",
        description: status === "pass"
          ? "The page includes a privacy policy link."
          : "Checked whether the page includes a privacy policy link.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Privacy policy link: ${input.page.trust.hasPrivacyPolicyLink}`],
        recommendation: status === "pass" ? "Keep the privacy policy accessible." : "Add a clear link to the privacy policy.",
      });
    },
  },
  {
    id: "trust-no-identity",
    category: "trust",
    effort: "medium",
    evaluate(input: AuditInput) {
      const status = input.page.trust.hasBusinessIdentity ? "pass" : "warning";

      return finding({
        ruleId: "trust-no-identity",
        category: "trust",
        title: status === "pass" ? "Business identity is present" : "No business identity detected",
        description: status === "pass"
          ? "The page includes business identity signals."
          : "Checked whether the page includes business identity signals.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Business identity: ${input.page.trust.hasBusinessIdentity}`],
        recommendation: status === "pass" ? "Keep business identity consistent." : "Add a clear business name or legal identity marker.",
      });
    },
  },
  {
    id: "trust-no-testimonials",
    category: "trust",
    effort: "high",
    evaluate(input: AuditInput) {
      const status = input.page.trust.hasTestimonialIndicators ? "pass" : "warning";

      return finding({
        ruleId: "trust-no-testimonials",
        category: "trust",
        title: status === "pass" ? "Testimonials are present" : "No testimonials detected",
        description: status === "pass"
          ? "The page includes testimonial or review indicators."
          : "Checked whether the page includes testimonial or review indicators.",
        status,
        severity: status === "pass" ? "low" : "low",
        evidence: [`Testimonial indicators: ${input.page.trust.hasTestimonialIndicators}`],
        recommendation: status === "pass" ? "Keep testimonials credible and specific." : "Add credible testimonials, reviews, or proof points where appropriate.",
      });
    },
  },
  {
    id: "trust-no-https",
    category: "trust",
    effort: "medium",
    blocking: true,
    evaluate(input: AuditInput) {
      const status = input.page.isHttps ? "pass" : "fail";

      return finding({
        ruleId: "trust-no-https",
        category: "trust",
        title: status === "pass" ? "HTTPS is enabled" : "HTTPS is not enabled",
        description: status === "pass"
          ? "The scanned URL uses HTTPS."
          : "Checked whether the scanned URL uses HTTPS.",
        status,
        severity: status === "pass" ? "low" : "critical",
        evidence: [`URL: ${input.page.url}`, `HTTPS: ${input.page.isHttps}`],
        recommendation: status === "pass" ? "Keep HTTPS enforced." : "Serve the site over HTTPS and redirect HTTP traffic to HTTPS.",
      });
    },
  },
  {
    id: "trust-no-social",
    category: "trust",
    effort: "low",
    evaluate(input: AuditInput) {
      const status = input.page.trust.hasSocialLinks ? "pass" : "warning";

      return finding({
        ruleId: "trust-no-social",
        category: "trust",
        title: status === "pass" ? "Social links are present" : "No social links detected",
        description: status === "pass"
          ? "The page includes social profile links."
          : "Checked whether the page includes social profile links.",
        status,
        severity: status === "pass" ? "low" : "low",
        evidence: [`Social links: ${input.page.trust.hasSocialLinks}`],
        recommendation: status === "pass" ? "Keep social profile links current." : "Add relevant social profile links if they support trust for this business.",
      });
    },
  },
];
