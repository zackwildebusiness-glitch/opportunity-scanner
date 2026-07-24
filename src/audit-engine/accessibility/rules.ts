import type { AuditInput } from "@/types/collected-data";

import { finding, hasPerformanceData, headingSkipEvidence, missingAltStats, percentage } from "../helpers";
import type { AuditRule } from "../types";

export const accessibilityRules: AuditRule[] = [
  {
    id: "a11y-images-alt",
    category: "accessibility",
    effort: "low",
    evaluate(input: AuditInput) {
      const stats = missingAltStats(input.page.images);
      const hasFailingRatio = stats.missingPercent > 0.2 && stats.missing >= 2;
      const status = hasFailingRatio ? "fail" : stats.missing > 0 ? "warning" : "pass";

      return finding({
        ruleId: "a11y-images-alt",
        category: "accessibility",
        title: status === "pass" ? "Image alt attributes support accessibility" : "Images are missing alt attributes",
        description: status === "pass"
          ? "Images either include alt attributes or no images were found."
          : "Checked the share of images where the alt attribute is missing entirely for non-visual users.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [
          `Images: ${stats.total}`,
          `Images missing alt: ${stats.missing} (${percentage(stats.missingPercent)})`,
          `Sample missing alt sources: ${stats.sampleSources.join(", ") || "none"}`,
        ],
        recommendation: status === "pass"
          ? "Keep meaningful images supplied with alt attributes."
          : "Add alt attributes to meaningful images; keep empty alt text only for decorative images.",
      });
    },
  },
  {
    id: "a11y-form-labels",
    category: "accessibility",
    effort: "medium",
    evaluate(input: AuditInput) {
      const unlabeledCount = input.page.forms.reduce((sum, form) => sum + form.unlabeledInputCount, 0);
      const status = unlabeledCount > 0 ? "fail" : "pass";

      return finding({
        ruleId: "a11y-form-labels",
        category: "accessibility",
        title: status === "pass" ? "Form inputs have labels" : "Form inputs are missing labels",
        description: status === "pass"
          ? "No unlabeled form inputs were detected."
          : "Checked whether collected forms contain unlabeled inputs.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Forms: ${input.page.forms.length}`, `Unlabeled inputs: ${unlabeledCount}`],
        recommendation: status === "pass" ? "Keep explicit labels or accessible names on form fields." : "Add labels or accessible names to every form input.",
      });
    },
  },
  {
    id: "a11y-button-names",
    category: "accessibility",
    effort: "medium",
    evaluate(input: AuditInput) {
      const unnamedButtons = input.page.buttons.filter((button) => button.accessibleName.trim() === "");
      const status = unnamedButtons.length > 0 ? "fail" : "pass";

      return finding({
        ruleId: "a11y-button-names",
        category: "accessibility",
        title: status === "pass" ? "Buttons have accessible names" : "Buttons are missing accessible names",
        description: status === "pass"
          ? "Interactive button-like elements have accessible names."
          : "Checked whether button-like elements have visible text or aria-labels.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Buttons: ${input.page.buttons.length}`, `Buttons missing accessible names: ${unnamedButtons.length}`],
        recommendation: status === "pass" ? "Keep button labels descriptive." : "Add visible text or aria-label values to unnamed buttons.",
      });
    },
  },
  {
    id: "a11y-score",
    category: "accessibility",
    effort: "medium",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input) || input.performance.accessibilityScore === null) {
        return null;
      }

      const score = input.performance.accessibilityScore;
      const status = score < 70 ? "fail" : score < 90 ? "warning" : "pass";
      const severity = status === "fail" ? "high" : status === "warning" ? "high" : "low";

      return finding({
        ruleId: "a11y-score",
        category: "accessibility",
        title: status === "pass" ? "Accessibility score is strong" : "Accessibility score needs improvement",
        description: status === "pass"
          ? "The Lighthouse accessibility score is in the healthy range."
          : "Checked whether the Lighthouse accessibility score is below 90 or 70.",
        status,
        severity,
        evidence: [`Accessibility score: ${score}`],
        recommendation: status === "pass" ? "Keep monitoring accessibility regressions." : "Use Lighthouse accessibility diagnostics to prioritize fixes.",
      });
    },
  },
  {
    id: "a11y-heading-structure",
    category: "accessibility",
    effort: "medium",
    evaluate(input: AuditInput) {
      const skipEvidence = headingSkipEvidence(input.page.headings);

      return finding({
        ruleId: "a11y-heading-structure",
        category: "accessibility",
        title: skipEvidence === null ? "Heading structure supports navigation" : "Heading structure skips a level",
        description: skipEvidence === null
          ? "The heading sequence supports predictable screen-reader navigation."
          : "Checked whether heading levels skip in a way that may disrupt screen-reader navigation.",
        status: skipEvidence === null ? "pass" : "warning",
        severity: skipEvidence === null ? "low" : "low",
        evidence: skipEvidence === null ? [`Heading count: ${input.page.headings.length}`] : [skipEvidence],
        recommendation: skipEvidence === null
          ? "Keep heading levels sequential."
          : "Adjust headings so screen-reader users can navigate sections predictably.",
      });
    },
  },
];
