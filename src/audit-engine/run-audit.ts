import type { AuditFinding } from "@/types/audit";
import type { AuditInput } from "@/types/collected-data";

import { accessibilityRules } from "./accessibility/rules";
import { conversionRules } from "./conversion/rules";
import { mobileRules } from "./mobile/rules";
import { performanceRules } from "./performance/rules";
import { seoRules } from "./seo/rules";
import { trustRules } from "./trust/rules";
import type { AuditRule, AuditRuleEffort } from "./types";

export interface AuditRuleMetadata {
  effort: AuditRuleEffort;
  blocking: boolean;
}

export interface AuditRunResult {
  findings: AuditFinding[];
  skippedRuleIds: string[];
}

export const allAuditRules: AuditRule[] = [
  ...seoRules,
  ...performanceRules,
  ...mobileRules,
  ...accessibilityRules,
  ...conversionRules,
  ...trustRules,
];

const DEFAULT_RULE_METADATA: AuditRuleMetadata = {
  effort: "medium",
  blocking: false,
};

export const auditRuleMetadataById: ReadonlyMap<string, AuditRuleMetadata> =
  new Map(
    allAuditRules.map((rule) => [
      rule.id,
      {
        effort: rule.effort ?? DEFAULT_RULE_METADATA.effort,
        blocking: rule.blocking ?? DEFAULT_RULE_METADATA.blocking,
      },
    ]),
  );

export function getAuditRuleMetadata(ruleId: string): AuditRuleMetadata {
  return auditRuleMetadataById.get(ruleId) ?? DEFAULT_RULE_METADATA;
}

export function runAudit(input: AuditInput): AuditRunResult {
  const findings: AuditFinding[] = [];
  const skippedRuleIds: string[] = [];

  for (const rule of allAuditRules) {
    try {
      const finding = rule.evaluate(input);

      if (finding !== null) {
        findings.push(finding);
      }
    } catch (error) {
      console.error(`Audit rule ${rule.id} failed`, error);
      skippedRuleIds.push(rule.id);
    }
  }

  return { findings, skippedRuleIds };
}
