import type { AuditCategory, AuditFinding, FindingSeverity, FindingStatus } from "@/types/audit";
import type { AuditInput, HeadingInfo, ImageInfo } from "@/types/collected-data";

const SCORE_IMPACT_BY_SEVERITY: Record<FindingSeverity, number> = {
  low: 4,
  medium: 8,
  high: 14,
  critical: 20,
};

export function scoreImpact(status: FindingStatus, severity: FindingSeverity): number {
  return status === "pass" ? 0 : SCORE_IMPACT_BY_SEVERITY[severity];
}

export function finding(params: {
  ruleId: string;
  category: AuditCategory;
  title: string;
  description: string;
  status: FindingStatus;
  severity: FindingSeverity;
  evidence: string[];
  recommendation: string;
}): AuditFinding {
  return {
    ...params,
    scoreImpact: scoreImpact(params.status, params.severity),
  };
}

export function hasPerformanceData(input: AuditInput): boolean {
  return input.performance.available;
}

export function headingSkipEvidence(headings: HeadingInfo[]): string | null {
  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1];
    const current = headings[index];

    if (previous && current && current.level > previous.level + 1) {
      return `Skipped heading level from h${previous.level} "${previous.text}" to h${current.level} "${current.text}"`;
    }
  }

  return null;
}

export function missingAltStats(images: ImageInfo[]): {
  total: number;
  missing: number;
  missingPercent: number;
  sampleSources: string[];
} {
  const missingImages = images.filter((image) => image.alt === null);

  return {
    total: images.length,
    missing: missingImages.length,
    missingPercent: images.length === 0 ? 0 : missingImages.length / images.length,
    sampleSources: missingImages.slice(0, 3).map((image) => image.src),
  };
}

export function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
