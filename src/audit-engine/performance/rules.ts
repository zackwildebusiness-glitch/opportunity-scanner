import type { AuditInput } from "@/types/collected-data";

import { finding, hasPerformanceData } from "../helpers";
import type { AuditRule } from "../types";

export const performanceRules: AuditRule[] = [
  {
    id: "perf-lcp",
    category: "performance",
    effort: "high",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input) || input.performance.lcpMs === null) {
        return null;
      }

      const lcpMs = input.performance.lcpMs;
      const status = lcpMs > 4000 ? "fail" : lcpMs > 2500 ? "warning" : "pass";
      const severity = status === "fail" ? "high" : status === "warning" ? "high" : "low";

      return finding({
        ruleId: "perf-lcp",
        category: "performance",
        title: status === "pass" ? "Largest Contentful Paint is healthy" : "Largest Contentful Paint needs improvement",
        description: status === "pass"
          ? "Largest Contentful Paint is within the recommended threshold."
          : "Checked whether Largest Contentful Paint exceeds 2.5s or 4s thresholds.",
        status,
        severity,
        evidence: [`LCP: ${lcpMs}ms`],
        recommendation: status === "pass" ? "Keep the largest visible content fast." : "Optimize server response, render-blocking assets, and hero media.",
      });
    },
  },
  {
    id: "perf-cls",
    category: "performance",
    effort: "medium",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input) || input.performance.cls === null) {
        return null;
      }

      const cls = input.performance.cls;
      const status = cls > 0.25 ? "fail" : cls > 0.1 ? "warning" : "pass";
      const severity = status === "pass" ? "low" : "medium";

      return finding({
        ruleId: "perf-cls",
        category: "performance",
        title: status === "pass" ? "Cumulative Layout Shift is healthy" : "Cumulative Layout Shift needs improvement",
        description: status === "pass"
          ? "Cumulative Layout Shift is within the recommended threshold."
          : "Checked whether Cumulative Layout Shift exceeds 0.1 or 0.25 thresholds.",
        status,
        severity,
        evidence: [`CLS: ${cls}`],
        recommendation: status === "pass" ? "Keep reserving space for dynamic content." : "Reserve image, ad, and embed dimensions to prevent layout movement.",
      });
    },
  },
  {
    id: "perf-inp",
    category: "performance",
    effort: "medium",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input) || input.performance.inpMs === null) {
        return null;
      }

      const inpMs = input.performance.inpMs;
      const status = inpMs > 500 ? "fail" : inpMs > 200 ? "warning" : "pass";
      const severity = status === "pass" ? "low" : "medium";

      return finding({
        ruleId: "perf-inp",
        category: "performance",
        title: status === "pass" ? "Interaction to Next Paint is healthy" : "Interaction to Next Paint needs improvement",
        description: status === "pass"
          ? "Interaction to Next Paint is within the recommended threshold."
          : "Checked whether Interaction to Next Paint exceeds 200ms or 500ms thresholds.",
        status,
        severity,
        evidence: [`INP: ${inpMs}ms`],
        recommendation: status === "pass" ? "Keep interaction handlers lightweight." : "Reduce main-thread work and defer non-critical JavaScript.",
      });
    },
  },
  {
    id: "perf-score",
    category: "performance",
    effort: "high",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input) || input.performance.performanceScore === null) {
        return null;
      }

      const score = input.performance.performanceScore;
      const status = score < 50 ? "fail" : score < 90 ? "warning" : "pass";
      const severity = status === "fail" ? "high" : status === "warning" ? "high" : "low";

      return finding({
        ruleId: "perf-score",
        category: "performance",
        title: status === "pass" ? "Performance score is strong" : "Performance score needs improvement",
        description: status === "pass"
          ? "The Lighthouse performance score is in the healthy range."
          : "Checked whether the Lighthouse performance score is below 90 or 50.",
        status,
        severity,
        evidence: [`Performance score: ${score}`],
        recommendation: status === "pass" ? "Keep monitoring performance regressions." : "Use Lighthouse diagnostics to prioritize the largest performance bottlenecks.",
      });
    },
  },
  {
    id: "perf-tbt",
    category: "performance",
    effort: "high",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input) || input.performance.tbtMs === null) {
        return null;
      }

      const tbtMs = input.performance.tbtMs;
      const status = tbtMs > 600 ? "warning" : "pass";

      return finding({
        ruleId: "perf-tbt",
        category: "performance",
        title: status === "pass" ? "Total Blocking Time is healthy" : "Total Blocking Time is high",
        description: status === "pass"
          ? "Total Blocking Time is within the recommended threshold."
          : "Checked whether Total Blocking Time exceeds 600ms.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`TBT: ${tbtMs}ms`],
        recommendation: status === "pass" ? "Keep JavaScript execution lean." : "Reduce long tasks, split bundles, and defer non-critical scripts.",
      });
    },
  },
  {
    id: "perf-page-size",
    category: "performance",
    effort: "medium",
    evaluate(input: AuditInput) {
      const pageSizeBytes = input.page.pageSizeBytes;
      const status = pageSizeBytes >= 2_000_000 ? "fail" : pageSizeBytes > 1_500_000 ? "warning" : "pass";

      return finding({
        ruleId: "perf-page-size",
        category: "performance",
        title: status === "pass" ? "Page size is reasonable" : "Page size is large",
        description: status === "pass"
          ? "The fetched page size is below the large-page threshold."
          : "Checked whether the fetched page size exceeds 1.5MB or reaches the 2MB cap.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Page size: ${pageSizeBytes} bytes`],
        recommendation: status === "pass" ? "Keep page weight controlled." : "Compress assets, remove unused code, and reduce oversized media.",
      });
    },
  },
  {
    id: "perf-image-count",
    category: "performance",
    effort: "medium",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input)) {
        return null;
      }

      const imageCount = input.page.images.length;
      const status = imageCount > 40 ? "warning" : "pass";

      return finding({
        ruleId: "perf-image-count",
        category: "performance",
        title: status === "pass" ? "Image count is controlled" : "Many images found",
        description: status === "pass"
          ? "The page image count is within the recommended threshold."
          : "Checked whether the page includes more than 40 images.",
        status,
        severity: status === "pass" ? "low" : "low",
        evidence: [`Image count: ${imageCount}`],
        recommendation: status === "pass" ? "Keep image usage purposeful." : "Lazy-load non-critical images and remove images that do not support the page goal.",
      });
    },
  },
];
