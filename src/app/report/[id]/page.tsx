import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { FindingCard } from "@/components/report/finding-card";
import { ScoreDial } from "@/components/report/score-dial";
import { getFindingsByScanId } from "@/repositories/finding-repository";
import {
  getCategoryScores,
  getReportByScanId,
} from "@/repositories/report-repository";
import { getScanById } from "@/repositories/scan-repository";
import type { AuditCategory, AuditFinding } from "@/types/audit";

export const metadata: Metadata = {
  title: "Website Audit Report",
  robots: { index: false },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  conversion: "Conversion",
  seo: "SEO",
  performance: "Performance",
  mobile: "Mobile usability",
  trust: "Trust & credibility",
  accessibility: "Accessibility",
};

const CATEGORY_ORDER: AuditCategory[] = [
  "conversion",
  "seo",
  "performance",
  "mobile",
  "trust",
  "accessibility",
];

// Stored AI content is re-validated before rendering; invalid or missing
// content simply hides the AI sections — the deterministic report stands alone.
const copySuggestionsSchema = z.object({
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  primaryCta: z.string().min(1),
  secondaryCta: z.string().min(1),
});

const serviceOpportunitiesSchema = z.object({
  interpretation: z.string().optional(),
  implementationScope: z.string().optional(),
  services: z.array(z.object({ service: z.string(), reason: z.string() })),
  topFixExplanations: z
    .array(z.object({ ruleId: z.string(), explanation: z.string() }))
    .optional(),
  outreachDraft: z.string().optional(),
});

const EFFORT_LABELS = { low: "Low", medium: "Medium", high: "High" } as const;

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) notFound();

  const scan = await getScanById(id);
  if (!scan) notFound();

  const report = await getReportByScanId(id);
  if (!report) {
    // Scan exists but no report yet — send the visitor to the status page.
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-semibold text-ink">
            Report not ready yet
          </h1>
          <p className="mt-3 text-muted">
            {scan.status === "failed"
              ? "This scan didn't complete, so there's no report to show."
              : "This scan is still running. The report appears here the moment it's done."}
          </p>
          <Link
            href={`/scan/${id}`}
            className="mt-6 inline-block rounded-lg border-2 border-line-strong bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-hover hover:text-white"
          >
            View scan status
          </Link>
        </div>
      </main>
    );
  }

  const [findings, categoryScores] = await Promise.all([
    getFindingsByScanId(id),
    getCategoryScores(id),
  ]);

  const copySuggestions = copySuggestionsSchema.safeParse(
    report.copySuggestions,
  );
  const aiContent = serviceOpportunitiesSchema.safeParse(
    report.serviceOpportunities,
  );

  const scanDate = new Date(scan.completedAt ?? scan.createdAt).toLocaleDateString(
    "en-CA",
    { year: "numeric", month: "long", day: "numeric" },
  );

  const findingsByCategory = new Map<AuditCategory, AuditFinding[]>();
  for (const category of CATEGORY_ORDER) {
    const items = findings.filter((f) => f.category === category);
    if (items.length > 0) findingsByCategory.set(category, items);
  }

  const explanationByRuleId = new Map(
    (aiContent.success ? (aiContent.data.topFixExplanations ?? []) : []).map(
      (item) => [item.ruleId, item.explanation],
    ),
  );

  return (
    <main className="flex-1 bg-paper print:bg-white">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-deep">
              Website audit report
            </p>
            <h1 className="mt-2 break-all font-display text-2xl font-semibold text-ink sm:text-3xl">
              {scan.resolvedUrl ?? scan.normalizedUrl}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Scanned {scanDate} · Homepage only · By{" "}
              <a
                href="https://wildedigital.ca"
                className="font-medium text-accent-deep underline-offset-4 hover:underline"
              >
                Wilde Digital
              </a>
            </p>
          </div>
          <ScoreDial score={report.overallScore} label="Overall opportunity score" />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Category scores */}
        <section aria-labelledby="category-scores">
          <h2
            id="category-scores"
            className="font-display text-2xl font-semibold text-ink"
          >
            Scores by category
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORY_ORDER.map((category) => {
              const entry = categoryScores.find((s) => s.category === category);
              return entry ? (
                <ScoreDial
                  key={category}
                  score={entry.score}
                  label={CATEGORY_LABELS[category]}
                  size="small"
                />
              ) : null;
            })}
          </div>
        </section>

        {/* Executive summary */}
        {report.executiveSummary ? (
          <section aria-labelledby="summary" className="mt-12">
            <div className="flex items-baseline gap-3">
              <h2
                id="summary"
                className="font-display text-2xl font-semibold text-ink"
              >
                Executive summary
              </h2>
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
                AI-generated from verified findings
              </span>
            </div>
            <div className="mt-4 space-y-4 rounded-xl border border-line bg-surface p-6 leading-relaxed text-ink sm:p-8">
              {report.executiveSummary.split(/\n\n+/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {aiContent.success && aiContent.data.interpretation ? (
                <p className="text-muted">{aiContent.data.interpretation}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Priority actions */}
        {report.priorityActions.length > 0 ? (
          <section aria-labelledby="priorities" className="mt-12">
            <h2
              id="priorities"
              className="font-display text-2xl font-semibold text-ink"
            >
              Where to start
            </h2>
            <p className="mt-2 text-muted">
              The highest-impact fixes, ranked by severity, business value, and
              effort.
            </p>
            <ol className="mt-6 space-y-4">
              {report.priorityActions.map((action) => (
                <li
                  key={action.id}
                  className="flex gap-4 rounded-xl border border-line bg-surface p-5 break-inside-avoid sm:p-6"
                >
                  <span className="font-display text-3xl font-light text-accent">
                    {action.recommendedOrder}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink">{action.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {explanationByRuleId.get(action.relatedRuleIds[0] ?? "") ??
                        action.reason}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted">
                      <span>{CATEGORY_LABELS[action.category]}</span>
                      <span>Effort: {EFFORT_LABELS[action.estimatedEffort]}</span>
                      <span>Impact: {EFFORT_LABELS[action.estimatedImpact]}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Suggested copy */}
        {copySuggestions.success ? (
          <section aria-labelledby="copy" className="mt-12">
            <div className="flex items-baseline gap-3">
              <h2
                id="copy"
                className="font-display text-2xl font-semibold text-ink"
              >
                Suggested homepage copy
              </h2>
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
                AI suggestion — adapt to your voice
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-line bg-tint/30 p-6 sm:p-8">
              <p className="font-display text-3xl font-semibold leading-tight text-ink">
                {copySuggestions.data.headline}
              </p>
              <p className="mt-3 text-lg text-muted">
                {copySuggestions.data.subheadline}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-lg border-2 border-line-strong bg-accent px-5 py-2.5 font-semibold text-ink">
                  {copySuggestions.data.primaryCta}
                </span>
                <span className="rounded-lg border-2 border-line-strong px-5 py-2.5 font-semibold text-ink">
                  {copySuggestions.data.secondaryCta}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {/* Findings by category */}
        <section aria-labelledby="findings" className="mt-12">
          <h2
            id="findings"
            className="font-display text-2xl font-semibold text-ink"
          >
            All findings
          </h2>
          <p className="mt-2 text-muted">
            Technical findings are verified checks. Conversion findings are
            labeled heuristic opportunities — informed suggestions, not
            guarantees.
          </p>

          {CATEGORY_ORDER.map((category) => {
            const items = findingsByCategory.get(category);
            if (!items) return null;

            return (
              <div key={category} className="mt-8">
                <h3 className="font-display text-xl font-semibold text-ink">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[...items]
                    .sort((a, b) => (a.status === "pass" ? 1 : 0) - (b.status === "pass" ? 1 : 0))
                    .map((finding) => (
                      <FindingCard key={finding.ruleId} finding={finding} />
                    ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Pitch prep — internal use only. print-hidden keeps it out of the
            printable report handed to prospects (services to pitch, scope,
            outreach draft must never leak). */}
        {aiContent.success ? (
          <section aria-labelledby="pitch-prep" className="print-hidden mt-14">
            <div className="rounded-xl border-2 border-line-strong bg-ink p-6 text-paper sm:p-10">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 id="pitch-prep" className="font-display text-3xl font-semibold">
                  Pitch prep
                </h2>
                <span className="rounded-full border border-paper/30 px-2.5 py-0.5 text-xs font-medium text-paper/70">
                  Internal — AI-drafted from findings
                </span>
              </div>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gold">
                Services to pitch
              </h3>
              <ul className="mt-3 space-y-3">
                {aiContent.data.services.map((item) => (
                  <li key={item.service} className="flex gap-3">
                    <span aria-hidden className="text-gold">
                      →
                    </span>
                    <p>
                      <span className="font-semibold text-gold">
                        {item.service}:
                      </span>{" "}
                      <span className="text-paper/85">{item.reason}</span>
                    </p>
                  </li>
                ))}
              </ul>

              {aiContent.data.implementationScope ? (
                <>
                  <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gold">
                    Suggested engagement scope
                  </h3>
                  <p className="mt-2 text-paper/85">
                    {aiContent.data.implementationScope}
                  </p>
                </>
              ) : null}

              {aiContent.data.outreachDraft ? (
                <>
                  <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gold">
                    Outreach draft
                  </h3>
                  <blockquote className="mt-2 whitespace-pre-line rounded-lg bg-paper/10 p-4 leading-relaxed text-paper/90">
                    {aiContent.data.outreachDraft}
                  </blockquote>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-muted">
          <p>
            Automated homepage audit · Generated by the Website Opportunity
            Scanner
          </p>
          <Link
            href="/"
            className="font-medium text-accent-deep underline-offset-4 hover:underline print-hidden"
          >
            Scan another site
          </Link>
        </footer>
      </div>
    </main>
  );
}
