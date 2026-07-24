import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalysisResult } from "@/ai/generate-analysis";
import type { AuditFinding, PriorityAction } from "@/types/audit";
import type { CollectedPageData, PerformanceData } from "@/types/collected-data";
import type { Report, ScoreSummary } from "@/types/report";
import type { Scan } from "@/types/scan";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({ PAGESPEED_API_KEY: "pagespeed-key" })),
}));

vi.mock("@/lib/url-security", () => ({
  safeFetchPage: vi.fn(),
}));

vi.mock("@/collectors/collect-page-data", () => ({
  collectPageData: vi.fn(),
}));

vi.mock("@/collectors/performance-collector", () => ({
  collectPerformanceData: vi.fn(),
}));

vi.mock("@/audit-engine/run-audit", () => ({
  runAudit: vi.fn(),
}));

vi.mock("@/reports/build-report", () => ({
  buildReport: vi.fn(),
}));

vi.mock("@/ai/generate-analysis", () => ({
  generateAnalysis: vi.fn(),
}));

vi.mock("@/repositories/finding-repository", () => ({
  saveFindings: vi.fn(),
}));

vi.mock("@/repositories/report-repository", () => ({
  upsertReport: vi.fn(),
}));

vi.mock("@/repositories/scan-page-repository", () => ({
  saveScanPage: vi.fn(),
}));

vi.mock("@/repositories/scan-repository", () => ({
  getScanById: vi.fn(),
  logScanEvent: vi.fn(),
  markScanCompleted: vi.fn(),
  markScanFailed: vi.fn(),
  updateScanProgress: vi.fn(),
}));

const { generateAnalysis } = await import("@/ai/generate-analysis");
const { runAudit } = await import("@/audit-engine/run-audit");
const { collectPageData } = await import("@/collectors/collect-page-data");
const { collectPerformanceData } = await import(
  "@/collectors/performance-collector"
);
const { AppError } = await import("@/lib/errors");
const { safeFetchPage } = await import("@/lib/url-security");
const { buildReport } = await import("@/reports/build-report");
const { saveFindings } = await import("@/repositories/finding-repository");
const { upsertReport } = await import("@/repositories/report-repository");
const { saveScanPage } = await import("@/repositories/scan-page-repository");
const {
  getScanById,
  logScanEvent,
  markScanCompleted,
  markScanFailed,
  updateScanProgress,
} = await import("@/repositories/scan-repository");
const { runScanJob } = await import("./run-scan-job");

const scanId = "11111111-1111-4111-8111-111111111111";

const pendingScan: Scan = {
  id: scanId,
  submittedUrl: "example.com",
  normalizedUrl: "https://example.com/",
  resolvedUrl: null,
  status: "pending",
  progress: 0,
  currentStage: "queued",
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const fetchedPage = {
  finalUrl: "https://example.com/",
  status: 200,
  html: "<html><title>Example</title></html>",
  redirectChain: [],
  responseTimeMs: 120,
  pageSizeBytes: 512,
  contentType: "text/html",
};

const page = {
  url: fetchedPage.finalUrl,
  title: "Example",
  h1Count: 1,
  metaDescription: null,
  internalLinks: [],
  ctas: [],
  textStats: { wordCount: 250, headlineText: "Example", hasServiceLanguage: false },
  trust: {
    hasPrivacyPolicyLink: false,
    hasTestimonialIndicators: false,
    hasSocialLinks: false,
    hasBusinessIdentity: false,
  },
  contact: { hasEmail: false, hasPhone: false, hasContactLink: false, hasAddress: false },
} as unknown as CollectedPageData;

const servicesLink = { href: "/services", text: "Services", isInternal: true };

const servicesPage = {
  ...page,
  url: "https://example.com/services",
  title: "Our Services",
  textStats: { wordCount: 480, headlineText: "What we do", hasServiceLanguage: true },
} as unknown as CollectedPageData;

const performance: PerformanceData = {
  available: true,
  performanceScore: 92,
  accessibilityScore: 88,
  seoScore: 95,
  bestPracticesScore: 90,
  lcpMs: 1200,
  cls: 0.01,
  inpMs: 80,
  fcpMs: 900,
  tbtMs: 30,
};

const finding: AuditFinding = {
  ruleId: "seo-title-length",
  category: "seo",
  title: "Title can be improved",
  description: "The title is too short.",
  status: "warning",
  severity: "medium",
  evidence: ["Title: Example"],
  recommendation: "Write a more descriptive title.",
  scoreImpact: 0,
};

const priorityAction: PriorityAction = {
  id: "action-1",
  title: "Improve title",
  category: "seo",
  reason: "Search snippets need clearer context.",
  severity: "medium",
  estimatedEffort: "low",
  estimatedImpact: "medium",
  recommendedOrder: 1,
  relatedRuleIds: [finding.ruleId],
};

const summary: ScoreSummary = {
  overallScore: 82,
  categoryScores: [],
  severityCounts: { low: 0, medium: 1, high: 0, critical: 0 },
  passCount: 10,
  warningCount: 1,
  failCount: 0,
};

const report: Report = {
  id: "report-1",
  scanId,
  overallScore: summary.overallScore,
  executiveSummary: null,
  priorityActions: [priorityAction],
  copySuggestions: null,
  serviceOpportunities: null,
  aiStatus: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const completedAnalysis: Extract<AnalysisResult, { status: "completed" }> = {
  status: "completed",
  analysis: {
    executiveSummary: "The site is in good shape with a few clear wins.",
    interpretation: "The score indicates a solid baseline.",
    copySuggestions: {
      headline: "Turn your website into a sales asset",
      subheadline: "Clearer messaging and faster pages for better prospects",
      primaryCta: "Book a consultation",
      secondaryCta: "See the audit",
    },
    serviceOpportunities: [
      { service: "SEO refinement", reason: "Metadata can be improved." },
    ],
    implementationScope: "A focused one-week optimization sprint.",
    outreachDraft: "Hi, I reviewed your site and found a few quick wins.",
    topFixExplanations: [
      { ruleId: finding.ruleId, explanation: "The page title needs more context." },
    ],
  },
};

function mockHappyPath(): void {
  vi.mocked(getScanById).mockResolvedValue(pendingScan);
  vi.mocked(safeFetchPage).mockResolvedValue(fetchedPage);
  vi.mocked(collectPageData).mockReturnValue(page);
  vi.mocked(collectPerformanceData).mockResolvedValue(performance);
  vi.mocked(saveScanPage).mockResolvedValue("page-1");
  vi.mocked(runAudit).mockReturnValue({
    findings: [finding],
    skippedRuleIds: [],
  });
  vi.mocked(saveFindings).mockResolvedValue();
  vi.mocked(buildReport).mockResolvedValue({ report, summary });
  vi.mocked(generateAnalysis).mockResolvedValue(completedAnalysis);
  vi.mocked(upsertReport).mockResolvedValue({
    ...report,
    aiStatus: "completed",
  });
  vi.mocked(updateScanProgress).mockResolvedValue();
  vi.mocked(logScanEvent).mockResolvedValue();
  vi.mocked(markScanCompleted).mockResolvedValue();
  vi.mocked(markScanFailed).mockResolvedValue();
}

describe("runScanJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHappyPath();
  });

  it("runs the happy path pipeline and completes the scan", async () => {
    await runScanJob(scanId);

    const progressStages = vi
      .mocked(updateScanProgress)
      .mock.calls.map(([, update]) => update.stage);

    expect([pendingScan.currentStage, ...progressStages]).toEqual([
      "queued",
      "collecting",
      "collecting",
      "auditing",
      "scoring",
      "generating",
    ]);
    expect(safeFetchPage).toHaveBeenCalledWith(pendingScan.normalizedUrl);
    expect(collectPageData).toHaveBeenCalledWith({
      html: fetchedPage.html,
      finalUrl: fetchedPage.finalUrl,
      httpStatus: fetchedPage.status,
      responseTimeMs: fetchedPage.responseTimeMs,
      pageSizeBytes: fetchedPage.pageSizeBytes,
      redirectChain: fetchedPage.redirectChain,
    });
    expect(collectPerformanceData).toHaveBeenCalledWith(
      fetchedPage.finalUrl,
      "pagespeed-key",
    );
    expect(saveFindings).toHaveBeenCalledWith(scanId, [finding]);
    expect(buildReport).toHaveBeenCalledWith(scanId, [finding]);
    expect(upsertReport).toHaveBeenCalledWith(
      expect.objectContaining({
        scanId,
        overallScore: summary.overallScore,
        priorityActions: report.priorityActions,
        executiveSummary: completedAnalysis.analysis.executiveSummary,
        copySuggestions: completedAnalysis.analysis.copySuggestions,
        aiStatus: "completed",
      }),
    );
    expect(markScanCompleted).toHaveBeenCalledWith(scanId);
    expect(markScanFailed).not.toHaveBeenCalled();
  });

  it("marks the scan failed with a safe AppError code and message on fetch failure", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(safeFetchPage).mockRejectedValue(
      new AppError(
        "fetch_timeout",
        "internal stack trace: socket timeout",
        "The page took too long to respond. Please try again later.",
      ),
    );

    try {
      await runScanJob(scanId);
    } finally {
      consoleError.mockRestore();
    }

    expect(markScanFailed).toHaveBeenCalledWith(scanId, {
      errorCode: "fetch_timeout",
      errorMessage: "The page took too long to respond. Please try again later.",
    });
    const failure = vi.mocked(markScanFailed).mock.calls[0]?.[1];
    expect(failure?.errorMessage).not.toContain("internal");
    expect(failure?.errorMessage).not.toContain("stack");
    expect(saveFindings).not.toHaveBeenCalled();
    expect(upsertReport).not.toHaveBeenCalled();
    expect(markScanCompleted).not.toHaveBeenCalled();
  });

  it("still completes when AI generation returns failed", async () => {
    vi.mocked(generateAnalysis).mockResolvedValue({ status: "failed" });
    vi.mocked(upsertReport).mockResolvedValue({
      ...report,
      aiStatus: "failed",
    });

    await runScanJob(scanId);

    expect(upsertReport).toHaveBeenCalledWith({
      scanId,
      overallScore: summary.overallScore,
      priorityActions: report.priorityActions,
      aiStatus: "failed",
    });
    expect(markScanCompleted).toHaveBeenCalledWith(scanId);
    expect(markScanFailed).not.toHaveBeenCalled();
  });

  it("samples discovered key pages and passes summaries to AI generation", async () => {
    vi.mocked(collectPageData)
      .mockReturnValueOnce({ ...page, internalLinks: [servicesLink] } as never)
      .mockReturnValueOnce(servicesPage as never);
    vi.mocked(safeFetchPage)
      .mockResolvedValueOnce(fetchedPage)
      .mockResolvedValueOnce({
        ...fetchedPage,
        finalUrl: "https://example.com/services",
      });

    await runScanJob(scanId);

    expect(safeFetchPage).toHaveBeenCalledTimes(2);
    expect(safeFetchPage).toHaveBeenNthCalledWith(2, "https://example.com/services");

    // Homepage row is marked, sample row carries its role and label.
    expect(saveScanPage).toHaveBeenCalledTimes(2);
    expect(vi.mocked(saveScanPage).mock.calls[0]?.[0].rawMetadata).toMatchObject({
      pageRole: "homepage",
    });
    expect(vi.mocked(saveScanPage).mock.calls[1]?.[0]).toMatchObject({
      url: "https://example.com/services",
      rawMetadata: { pageRole: "sample", pageLabel: "services" },
    });

    expect(generateAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        sampledPages: [
          expect.objectContaining({
            url: "https://example.com/services",
            label: "services",
            title: "Our Services",
            headline: "What we do",
            hasServiceLanguage: true,
          }),
        ],
      }),
    );
    expect(markScanCompleted).toHaveBeenCalledWith(scanId);
  });

  it("completes the scan even when every sampled page fails to fetch", async () => {
    vi.mocked(collectPageData).mockReturnValueOnce({
      ...page,
      internalLinks: [servicesLink],
    } as never);
    vi.mocked(safeFetchPage)
      .mockResolvedValueOnce(fetchedPage)
      .mockRejectedValueOnce(new Error("sample fetch blew up"));

    await runScanJob(scanId);

    // Only the homepage row was persisted; the scan still finished.
    expect(saveScanPage).toHaveBeenCalledTimes(1);
    expect(generateAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ sampledPages: [] }),
    );
    expect(logScanEvent).toHaveBeenCalledWith(
      scanId,
      "collecting",
      "Sampled 0 of 1 key page(s) for pitch context.",
      expect.objectContaining({ failed: 1 }),
    );
    expect(markScanCompleted).toHaveBeenCalledWith(scanId);
    expect(markScanFailed).not.toHaveBeenCalled();
  });

  it("logs skipped audit rules and still completes the scan", async () => {
    vi.mocked(runAudit).mockReturnValue({
      findings: [finding],
      skippedRuleIds: ["seo-missing-title", "perf-score"],
    });

    await runScanJob(scanId);

    expect(saveFindings).toHaveBeenCalledWith(scanId, [finding]);
    expect(logScanEvent).toHaveBeenCalledWith(
      scanId,
      "auditing",
      "2 checks could not run and were skipped.",
      { skippedRuleIds: ["seo-missing-title", "perf-score"] },
    );
    expect(markScanCompleted).toHaveBeenCalledWith(scanId);
    expect(markScanFailed).not.toHaveBeenCalled();
  });

  it("skips duplicate runs when the scan is not pending", async () => {
    vi.mocked(getScanById).mockResolvedValue({
      ...pendingScan,
      status: "running",
      currentStage: "collecting",
    });

    await runScanJob(scanId);

    expect(logScanEvent).toHaveBeenCalledWith(
      scanId,
      "collecting",
      "Skipped duplicate job run.",
    );
    expect(updateScanProgress).not.toHaveBeenCalled();
    expect(safeFetchPage).not.toHaveBeenCalled();
    expect(saveFindings).not.toHaveBeenCalled();
    expect(buildReport).not.toHaveBeenCalled();
    expect(upsertReport).not.toHaveBeenCalled();
    expect(markScanCompleted).not.toHaveBeenCalled();
    expect(markScanFailed).not.toHaveBeenCalled();
  });
});
