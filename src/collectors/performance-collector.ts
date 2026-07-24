import type { PerformanceData } from "@/types/collected-data";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 25_000;

export async function collectPerformanceData(
  url: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<PerformanceData> {
  if (!apiKey) {
    return unavailablePerformanceData();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const requestUrl = new URL(PSI_ENDPOINT);
    requestUrl.searchParams.set("url", url);
    requestUrl.searchParams.set("key", apiKey);
    requestUrl.searchParams.set("strategy", "mobile");
    requestUrl.searchParams.append("category", "performance");
    requestUrl.searchParams.append("category", "accessibility");
    requestUrl.searchParams.append("category", "seo");
    requestUrl.searchParams.append("category", "best-practices");

    const response = await fetchImpl(requestUrl, { signal: controller.signal });

    if (!response.ok) {
      console.warn(`PageSpeed Insights request failed with status ${response.status}`);
      return unavailablePerformanceData();
    }

    const payload = (await response.json()) as unknown;

    return parsePerformanceData(payload);
  } catch (error) {
    console.warn("PageSpeed Insights collection failed", error);
    return unavailablePerformanceData();
  } finally {
    clearTimeout(timeout);
  }
}

function parsePerformanceData(payload: unknown): PerformanceData {
  if (!isRecord(payload) || !isRecord(payload.lighthouseResult)) {
    console.warn("PageSpeed Insights response was malformed");
    return unavailablePerformanceData();
  }

  const lighthouseResult = payload.lighthouseResult;
  const categories = isRecord(lighthouseResult.categories) ? lighthouseResult.categories : {};
  const audits = isRecord(lighthouseResult.audits) ? lighthouseResult.audits : {};

  return {
    available: true,
    performanceScore: readCategoryScore(categories, "performance"),
    accessibilityScore: readCategoryScore(categories, "accessibility"),
    seoScore: readCategoryScore(categories, "seo"),
    bestPracticesScore: readCategoryScore(categories, "best-practices"),
    lcpMs: readAuditNumericValue(audits, "largest-contentful-paint"),
    cls: readAuditNumericValue(audits, "cumulative-layout-shift"),
    inpMs: readAuditNumericValue(audits, "interaction-to-next-paint"),
    fcpMs: readAuditNumericValue(audits, "first-contentful-paint"),
    tbtMs: readAuditNumericValue(audits, "total-blocking-time"),
  };
}

function unavailablePerformanceData(): PerformanceData {
  return {
    available: false,
    performanceScore: null,
    accessibilityScore: null,
    seoScore: null,
    bestPracticesScore: null,
    lcpMs: null,
    cls: null,
    inpMs: null,
    fcpMs: null,
    tbtMs: null,
  };
}

function readCategoryScore(categories: Record<string, unknown>, key: string): number | null {
  const category = categories[key];

  if (!isRecord(category) || typeof category.score !== "number") {
    return null;
  }

  return Math.round(category.score * 100);
}

function readAuditNumericValue(audits: Record<string, unknown>, key: string): number | null {
  const audit = audits[key];

  if (!isRecord(audit) || typeof audit.numericValue !== "number") {
    return null;
  }

  return audit.numericValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
