import "server-only";

import { runAudit } from "@/audit-engine/run-audit";
import { generateAnalysis } from "@/ai/generate-analysis";
import type { SampledPageSummary } from "@/ai/prompts/analysis-prompt";
import { collectPageData } from "@/collectors/collect-page-data";
import { discoverKeyPages } from "@/collectors/discover-key-pages";
import { collectPerformanceData } from "@/collectors/performance-collector";
import type { CollectedPageData } from "@/types/collected-data";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { safeFetchPage } from "@/lib/url-security";
import { buildReport } from "@/reports/build-report";
import { saveFindings } from "@/repositories/finding-repository";
import { upsertReport } from "@/repositories/report-repository";
import { saveScanPage } from "@/repositories/scan-page-repository";
import {
  getScanById,
  logScanEvent,
  markScanCompleted,
  markScanFailed,
  updateScanProgress,
} from "@/repositories/scan-repository";

/**
 * Background scan pipeline. Runs after the POST /api/scans response via
 * next/server after(). Each stage writes progress so /scan/[id] can poll.
 *
 * queued → collecting → auditing → scoring → generating → completed
 *
 * AI generation degrades gracefully: a missing key or provider failure
 * still produces a complete deterministic report.
 */
export async function runScanJob(scanId: string): Promise<void> {
  try {
    const scan = await getScanById(scanId);

    if (!scan) {
      console.error(`runScanJob: scan ${scanId} not found`);
      return;
    }

    if (scan.status !== "pending") {
      // Retry safety: never re-run a scan that already ran or is running.
      await logScanEvent(scanId, scan.currentStage, "Skipped duplicate job run.");
      return;
    }

    // --- collecting -------------------------------------------------------
    await updateScanProgress(scanId, {
      stage: "collecting",
      progress: 10,
      status: "running",
      startedAt: new Date().toISOString(),
    });
    await logScanEvent(scanId, "collecting", "Fetching homepage.");

    const fetched = await safeFetchPage(scan.normalizedUrl);

    await updateScanProgress(scanId, {
      stage: "collecting",
      progress: 25,
      resolvedUrl: fetched.finalUrl,
    });

    const page = collectPageData({
      html: fetched.html,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      responseTimeMs: fetched.responseTimeMs,
      pageSizeBytes: fetched.pageSizeBytes,
      redirectChain: fetched.redirectChain,
    });

    await logScanEvent(scanId, "collecting", "Fetching PageSpeed Insights data.");

    const performance = await collectPerformanceData(
      fetched.finalUrl,
      getEnv().PAGESPEED_API_KEY,
    );

    if (!performance.available) {
      await logScanEvent(
        scanId,
        "collecting",
        "Performance data unavailable — continuing without it.",
      );
    }

    // Persist collected structure (never raw HTML).
    const { url: _url, ...pageMetadata } = page;
    await saveScanPage({
      scanId,
      url: fetched.finalUrl,
      httpStatus: fetched.status,
      responseTimeMs: fetched.responseTimeMs,
      pageSizeBytes: fetched.pageSizeBytes,
      rawMetadata: { ...pageMetadata, performance, pageRole: "homepage" },
    });

    await logScanEvent(scanId, "collecting", "Homepage collected.", {
      finalUrl: fetched.finalUrl,
      status: fetched.status,
      performanceAvailable: performance.available,
    });

    // --- key-page sampling (pitch context only) -----------------------------
    // Up to 3 same-origin key pages (services/about/contact) enrich the AI
    // pitch material. Scores and findings stay homepage-only so prospects
    // remain comparable; a failed sample never fails the scan.
    const keyPages = discoverKeyPages({
      internalLinks: page.internalLinks,
      finalUrl: fetched.finalUrl,
    });

    let sampledPages: SampledPageSummary[] = [];

    if (keyPages.length > 0) {
      const sampleResults = await Promise.allSettled(
        keyPages.map(async (candidate) => {
          const sampleFetched = await safeFetchPage(candidate.url);
          const samplePage = collectPageData({
            html: sampleFetched.html,
            finalUrl: sampleFetched.finalUrl,
            httpStatus: sampleFetched.status,
            responseTimeMs: sampleFetched.responseTimeMs,
            pageSizeBytes: sampleFetched.pageSizeBytes,
            redirectChain: sampleFetched.redirectChain,
          });

          const { url: _sampleUrl, ...sampleMetadata } = samplePage;
          await saveScanPage({
            scanId,
            url: sampleFetched.finalUrl,
            httpStatus: sampleFetched.status,
            responseTimeMs: sampleFetched.responseTimeMs,
            pageSizeBytes: sampleFetched.pageSizeBytes,
            rawMetadata: {
              ...sampleMetadata,
              pageRole: "sample",
              pageLabel: candidate.label,
            },
          });

          return summarizeSampledPage(candidate.label, samplePage);
        }),
      );

      sampledPages = sampleResults
        .filter(
          (result): result is PromiseFulfilledResult<SampledPageSummary> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);

      await updateScanProgress(scanId, { stage: "collecting", progress: 40 });
      await logScanEvent(
        scanId,
        "collecting",
        `Sampled ${sampledPages.length} of ${keyPages.length} key page(s) for pitch context.`,
        {
          requested: keyPages.map((candidate) => candidate.url),
          failed: keyPages.length - sampledPages.length,
        },
      );
    }

    // --- auditing ---------------------------------------------------------
    await updateScanProgress(scanId, { stage: "auditing", progress: 50 });

    const { findings, skippedRuleIds } = runAudit({ page, performance });
    await saveFindings(scanId, findings);

    if (skippedRuleIds.length > 0) {
      await logScanEvent(
        scanId,
        "auditing",
        `${skippedRuleIds.length} checks could not run and were skipped.`,
        { skippedRuleIds },
      );
    }

    await logScanEvent(scanId, "auditing", "Audit rules evaluated.", {
      findingCount: findings.length,
      failures: findings.filter((f) => f.status === "fail").length,
    });

    // --- scoring ----------------------------------------------------------
    await updateScanProgress(scanId, { stage: "scoring", progress: 70 });

    const { report, summary } = await buildReport(scanId, findings);

    await logScanEvent(scanId, "scoring", "Scores calculated.", {
      overallScore: summary.overallScore,
    });

    // --- generating (AI, optional) ----------------------------------------
    await updateScanProgress(scanId, { stage: "generating", progress: 85 });

    const analysisResult = await generateAnalysis({
      url: fetched.finalUrl,
      summary,
      findings,
      priorityActions: report.priorityActions,
      sampledPages,
    });

    if (analysisResult.status === "completed") {
      const { analysis } = analysisResult;

      await upsertReport({
        scanId,
        overallScore: summary.overallScore,
        priorityActions: report.priorityActions,
        executiveSummary: analysis.executiveSummary,
        copySuggestions: analysis.copySuggestions,
        serviceOpportunities: {
          interpretation: analysis.interpretation,
          implementationScope: analysis.implementationScope,
          services: analysis.serviceOpportunities,
          topFixExplanations: analysis.topFixExplanations,
          outreachDraft: analysis.outreachDraft,
        },
        aiStatus: "completed",
      });
    } else {
      await upsertReport({
        scanId,
        overallScore: summary.overallScore,
        priorityActions: report.priorityActions,
        aiStatus: analysisResult.status,
      });
    }

    await logScanEvent(
      scanId,
      "generating",
      `AI analysis ${analysisResult.status}.`,
    );

    await markScanCompleted(scanId);
    await logScanEvent(scanId, "completed", "Scan completed.");
  } catch (error) {
    const { code, userMessage } = toSafeFailure(error);

    console.error(`runScanJob failed for scan ${scanId}:`, error);

    try {
      await markScanFailed(scanId, {
        errorCode: code,
        errorMessage: userMessage,
      });
      await logScanEvent(scanId, "failed", userMessage, { code });
    } catch (persistError) {
      console.error(
        `runScanJob: failed to persist failure for scan ${scanId}:`,
        persistError,
      );
    }
  }
}

/** Reduces a sampled page's collected data to the compact AI pitch context. */
function summarizeSampledPage(
  label: SampledPageSummary["label"],
  page: CollectedPageData,
): SampledPageSummary {
  return {
    url: page.url,
    label,
    title: page.title,
    headline: page.textStats.headlineText,
    metaDescription: page.metaDescription,
    wordCount: page.textStats.wordCount,
    ctas: page.ctas.slice(0, 5).map((cta) => cta.text),
    hasServiceLanguage: page.textStats.hasServiceLanguage,
    hasTestimonials: page.trust.hasTestimonialIndicators,
    hasContactInfo:
      page.contact.hasEmail || page.contact.hasPhone || page.contact.hasContactLink,
  };
}

/** Maps any error to a safe user-facing failure — no stack traces or internals. */
function toSafeFailure(error: unknown): { code: string; userMessage: string } {
  if (error instanceof AppError) {
    return { code: error.code, userMessage: error.userMessage };
  }

  return {
    code: "scan_failed",
    userMessage:
      "We couldn't complete this scan. The site may be unreachable — please try again.",
  };
}
