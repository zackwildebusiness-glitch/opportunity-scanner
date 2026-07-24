import type { AuditInput } from "@/types/collected-data";

import { finding, headingSkipEvidence, missingAltStats, percentage } from "../helpers";
import type { AuditRule } from "../types";

export const seoRules: AuditRule[] = [
  {
    id: "seo-missing-title",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const title = input.page.title;
      const hasTitle = title !== null && title.trim().length > 0;

      return finding({
        ruleId: "seo-missing-title",
        category: "seo",
        title: hasTitle ? "Page title is present" : "Missing page title",
        description: hasTitle
          ? "The page has a title element available for search results."
          : "Checked whether the page has a title element for search result labeling.",
        status: hasTitle ? "pass" : "fail",
        severity: hasTitle ? "low" : "high",
        evidence: [`Title: ${title ?? "missing"}`],
        recommendation: hasTitle ? "Keep the title specific to the page." : "Add a concise, descriptive title element.",
      });
    },
  },
  {
    id: "seo-title-length",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const title = input.page.title ?? "";
      const length = title.length;
      const isHealthy = length >= 30 && length <= 60;

      return finding({
        ruleId: "seo-title-length",
        category: "seo",
        title: isHealthy ? "Title length is within range" : "Title length is outside the recommended range",
        description: isHealthy
          ? "The title length is within the recommended search snippet range."
          : "Checked whether the title length is between 30 and 60 characters.",
        status: isHealthy ? "pass" : "warning",
        severity: isHealthy ? "low" : "low",
        evidence: [`Title: ${input.page.title ?? "missing"}`, `Title length: ${length} characters`],
        recommendation: isHealthy ? "Keep title length between 30 and 60 characters." : "Rewrite the title to be 30 to 60 characters long.",
      });
    },
  },
  {
    id: "seo-missing-meta-description",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const description = input.page.metaDescription;
      const hasDescription = description !== null && description.trim().length > 0;

      return finding({
        ruleId: "seo-missing-meta-description",
        category: "seo",
        title: hasDescription ? "Meta description is present" : "Missing meta description",
        description: hasDescription
          ? "The page has a meta description available for search snippets."
          : "Checked whether the page has a meta description for search snippets.",
        status: hasDescription ? "pass" : "fail",
        severity: hasDescription ? "low" : "medium",
        evidence: [`Meta description: ${description ?? "missing"}`],
        recommendation: hasDescription ? "Keep the meta description aligned with the page offer." : "Add a concise meta description that summarizes the page.",
      });
    },
  },
  {
    id: "seo-meta-description-length",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const metaDescription = input.page.metaDescription ?? "";
      const length = metaDescription.length;
      const isHealthy = length >= 70 && length <= 160;

      return finding({
        ruleId: "seo-meta-description-length",
        category: "seo",
        title: isHealthy ? "Meta description length is within range" : "Meta description length is outside the recommended range",
        description: isHealthy
          ? "The meta description length is within the recommended search snippet range."
          : "Checked whether the meta description length is between 70 and 160 characters.",
        status: isHealthy ? "pass" : "warning",
        severity: isHealthy ? "low" : "low",
        evidence: [
          `Meta description: ${input.page.metaDescription ?? "missing"}`,
          `Meta description length: ${length} characters`,
        ],
        recommendation: isHealthy
          ? "Keep meta descriptions between 70 and 160 characters."
          : "Rewrite the meta description to be 70 to 160 characters long.",
      });
    },
  },
  {
    id: "seo-missing-canonical",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const hasCanonical = input.page.canonicalUrl !== null && input.page.canonicalUrl.trim().length > 0;

      return finding({
        ruleId: "seo-missing-canonical",
        category: "seo",
        title: hasCanonical ? "Canonical URL is present" : "Missing canonical URL",
        description: hasCanonical
          ? "The page declares a canonical URL."
          : "Checked whether the page declares a canonical URL to guide indexing.",
        status: hasCanonical ? "pass" : "warning",
        severity: hasCanonical ? "low" : "low",
        evidence: [`Canonical URL: ${input.page.canonicalUrl ?? "missing"}`],
        recommendation: hasCanonical ? "Keep the canonical URL accurate." : "Add a canonical URL that points to the preferred version of this page.",
      });
    },
  },
  {
    id: "seo-missing-h1",
    category: "seo",
    effort: "medium",
    evaluate(input: AuditInput) {
      const hasH1 = input.page.h1Count > 0;

      return finding({
        ruleId: "seo-missing-h1",
        category: "seo",
        title: hasH1 ? "H1 heading is present" : "Missing H1 heading",
        description: hasH1
          ? "The page has a primary H1 heading."
          : "Checked whether the page has a primary H1 heading.",
        status: hasH1 ? "pass" : "fail",
        severity: hasH1 ? "low" : "high",
        evidence: [`H1 count: ${input.page.h1Count}`],
        recommendation: hasH1 ? "Keep one clear H1 for the main page topic." : "Add one descriptive H1 that matches the page topic.",
      });
    },
  },
  {
    id: "seo-multiple-h1",
    category: "seo",
    effort: "medium",
    evaluate(input: AuditInput) {
      const hasSingleH1 = input.page.h1Count <= 1;

      return finding({
        ruleId: "seo-multiple-h1",
        category: "seo",
        title: hasSingleH1 ? "H1 count is focused" : "Multiple H1 headings found",
        description: hasSingleH1
          ? "The page keeps its primary heading structure focused."
          : "Checked whether the page uses more than one H1 heading.",
        status: hasSingleH1 ? "pass" : "warning",
        severity: hasSingleH1 ? "low" : "medium",
        evidence: [`H1 count: ${input.page.h1Count}`],
        recommendation: hasSingleH1 ? "Keep the page to one primary H1." : "Use one H1 for the page topic and demote secondary headings.",
      });
    },
  },
  {
    id: "seo-heading-hierarchy",
    category: "seo",
    effort: "medium",
    evaluate(input: AuditInput) {
      const skipEvidence = headingSkipEvidence(input.page.headings);

      return finding({
        ruleId: "seo-heading-hierarchy",
        category: "seo",
        title: skipEvidence === null ? "Heading hierarchy is sequential" : "Heading hierarchy skips a level",
        description: skipEvidence === null
          ? "The heading sequence does not skip levels."
          : "Checked whether heading levels progress without skipping levels.",
        status: skipEvidence === null ? "pass" : "warning",
        severity: skipEvidence === null ? "low" : "low",
        evidence: skipEvidence === null ? [`Heading count: ${input.page.headings.length}`] : [skipEvidence],
        recommendation: skipEvidence === null
          ? "Keep heading levels sequential."
          : "Adjust headings so sections move one level at a time, such as h2 to h3.",
      });
    },
  },
  {
    id: "seo-missing-og-title",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const hasOgTitle = input.page.openGraph.title !== null && input.page.openGraph.title.trim().length > 0;

      return finding({
        ruleId: "seo-missing-og-title",
        category: "seo",
        title: hasOgTitle ? "Open Graph title is present" : "Missing Open Graph title",
        description: hasOgTitle
          ? "The page has an Open Graph title for shared previews."
          : "Checked whether the page has an Open Graph title for shared previews.",
        status: hasOgTitle ? "pass" : "warning",
        severity: hasOgTitle ? "low" : "low",
        evidence: [`Open Graph title: ${input.page.openGraph.title ?? "missing"}`],
        recommendation: hasOgTitle ? "Keep the Open Graph title aligned with the page." : "Add an og:title value for social previews.",
      });
    },
  },
  {
    id: "seo-missing-og-description",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const hasOgDescription = input.page.openGraph.description !== null && input.page.openGraph.description.trim().length > 0;

      return finding({
        ruleId: "seo-missing-og-description",
        category: "seo",
        title: hasOgDescription ? "Open Graph description is present" : "Missing Open Graph description",
        description: hasOgDescription
          ? "The page has an Open Graph description for shared previews."
          : "Checked whether the page has an Open Graph description for shared previews.",
        status: hasOgDescription ? "pass" : "warning",
        severity: hasOgDescription ? "low" : "low",
        evidence: [`Open Graph description: ${input.page.openGraph.description ?? "missing"}`],
        recommendation: hasOgDescription
          ? "Keep the Open Graph description aligned with the page."
          : "Add an og:description value for social previews.",
      });
    },
  },
  {
    id: "seo-missing-structured-data",
    category: "seo",
    effort: "medium",
    evaluate(input: AuditInput) {
      const hasStructuredData = input.page.structuredData.blockCount > 0;

      return finding({
        ruleId: "seo-missing-structured-data",
        category: "seo",
        title: hasStructuredData ? "Structured data is present" : "Missing structured data",
        description: hasStructuredData
          ? "The page includes structured data blocks."
          : "Checked whether the page includes structured data blocks.",
        status: hasStructuredData ? "pass" : "warning",
        severity: hasStructuredData ? "low" : "low",
        evidence: [
          `Structured data blocks: ${input.page.structuredData.blockCount}`,
          `Structured data types: ${input.page.structuredData.types.join(", ") || "none"}`,
        ],
        recommendation: hasStructuredData
          ? "Keep structured data valid and relevant."
          : "Add relevant JSON-LD structured data, such as Organization or LocalBusiness.",
      });
    },
  },
  {
    id: "seo-noindex",
    category: "seo",
    effort: "low",
    blocking: true,
    evaluate(input: AuditInput) {
      const robotsMeta = input.page.robotsMeta ?? "";
      const hasNoindex = robotsMeta.includes("noindex");

      return finding({
        ruleId: "seo-noindex",
        category: "seo",
        title: hasNoindex ? "Page is marked noindex" : "Page is indexable by robots meta",
        description: hasNoindex
          ? "Checked whether the robots meta tag prevents search engines from indexing the page."
          : "The robots meta tag does not contain noindex.",
        status: hasNoindex ? "fail" : "pass",
        severity: hasNoindex ? "critical" : "low",
        evidence: [`Robots meta: ${input.page.robotsMeta ?? "missing"}`],
        recommendation: hasNoindex ? "Remove noindex unless this page should be excluded from search." : "Keep robots directives intentional.",
      });
    },
  },
  {
    id: "seo-images-missing-alt",
    category: "seo",
    effort: "low",
    evaluate(input: AuditInput) {
      const stats = missingAltStats(input.page.images);
      const hasFailingRatio = stats.missingPercent > 0.2 && stats.missing >= 2;
      const status = hasFailingRatio ? "fail" : stats.missing > 0 ? "warning" : "pass";
      const severity = status === "pass" ? "low" : "medium";

      return finding({
        ruleId: "seo-images-missing-alt",
        category: "seo",
        title: status === "pass" ? "Image alt attributes are complete" : "Images are missing alt attributes",
        description: status === "pass"
          ? "Images either include alt attributes or no images were found."
          : "Checked the share of images where the alt attribute is missing entirely.",
        status,
        severity,
        evidence: [
          `Images: ${stats.total}`,
          `Images missing alt: ${stats.missing} (${percentage(stats.missingPercent)})`,
          `Sample missing alt sources: ${stats.sampleSources.join(", ") || "none"}`,
        ],
        recommendation: status === "pass"
          ? "Keep meaningful images supplied with alt attributes."
          : "Add alt attributes to meaningful images; use empty alt text only for decorative images.",
      });
    },
  },
];
