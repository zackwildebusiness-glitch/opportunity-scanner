import type { AuditInput } from "@/types/collected-data";

import { finding, hasPerformanceData } from "../helpers";
import type { AuditRule } from "../types";

export const mobileRules: AuditRule[] = [
  {
    id: "mobile-missing-viewport",
    category: "mobile",
    effort: "low",
    blocking: true,
    evaluate(input: AuditInput) {
      const hasViewport = input.page.viewportMeta !== null && input.page.viewportMeta.trim().length > 0;

      return finding({
        ruleId: "mobile-missing-viewport",
        category: "mobile",
        title: hasViewport ? "Viewport meta tag is present" : "Missing viewport meta tag",
        description: hasViewport
          ? "The page has a viewport meta tag for mobile layout."
          : "Checked whether the page has a viewport meta tag for mobile layout.",
        status: hasViewport ? "pass" : "fail",
        severity: hasViewport ? "low" : "critical",
        evidence: [`Viewport meta: ${input.page.viewportMeta ?? "missing"}`],
        recommendation: hasViewport ? "Keep the viewport tag aligned with responsive layout." : "Add a viewport meta tag for responsive mobile rendering.",
      });
    },
  },
  {
    id: "mobile-viewport-content",
    category: "mobile",
    effort: "low",
    evaluate(input: AuditInput) {
      const viewportMeta = input.page.viewportMeta;
      const hasDeviceWidth = viewportMeta === null || viewportMeta.toLowerCase().includes("width=device-width");

      return finding({
        ruleId: "mobile-viewport-content",
        category: "mobile",
        title: hasDeviceWidth ? "Viewport content supports device width" : "Viewport content does not set device width",
        description: hasDeviceWidth
          ? "The viewport content includes width=device-width or no viewport was available for this secondary check."
          : "Checked whether the viewport meta content includes width=device-width.",
        status: hasDeviceWidth ? "pass" : "warning",
        severity: hasDeviceWidth ? "low" : "low",
        evidence: [`Viewport meta: ${viewportMeta ?? "missing"}`],
        recommendation: hasDeviceWidth ? "Keep width=device-width in the viewport content." : "Set viewport content to include width=device-width.",
      });
    },
  },
  {
    id: "mobile-performance",
    category: "mobile",
    effort: "high",
    evaluate(input: AuditInput) {
      if (!hasPerformanceData(input) || input.performance.performanceScore === null) {
        return null;
      }

      const score = input.performance.performanceScore;
      const status = score < 50 ? "fail" : score < 70 ? "warning" : "pass";
      const severity = status === "fail" ? "high" : status === "warning" ? "high" : "low";

      return finding({
        ruleId: "mobile-performance",
        category: "mobile",
        title: status === "pass" ? "Mobile performance score is usable" : "Mobile performance score needs improvement",
        description: status === "pass"
          ? "The mobile Lighthouse performance score is in the usable range."
          : "Checked the mobile Lighthouse performance score because PageSpeed strategy is mobile.",
        status,
        severity,
        evidence: [`Mobile performance score: ${score}`],
        recommendation: status === "pass" ? "Keep monitoring the mobile Lighthouse score." : "Prioritize mobile Lighthouse diagnostics that reduce loading and main-thread delay.",
      });
    },
  },
  {
    id: "mobile-page-weight",
    category: "mobile",
    effort: "medium",
    evaluate(input: AuditInput) {
      const pageSizeBytes = input.page.pageSizeBytes;
      const status = pageSizeBytes > 1_000_000 ? "warning" : "pass";

      return finding({
        ruleId: "mobile-page-weight",
        category: "mobile",
        title: status === "pass" ? "Mobile page weight is controlled" : "Mobile page weight is high",
        description: status === "pass"
          ? "The page weight is below the mobile data-cost threshold."
          : "Checked whether page weight may create a high mobile data cost.",
        status,
        severity: status === "pass" ? "low" : "medium",
        evidence: [`Page size: ${pageSizeBytes} bytes`],
        recommendation: status === "pass" ? "Keep mobile payloads lean." : "Reduce transferred bytes by compressing assets and trimming oversized media.",
      });
    },
  },
];
