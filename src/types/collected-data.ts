/**
 * Contract between the collectors (src/collectors) and the audit engine
 * (src/audit-engine). Collectors extract this from fetched HTML; audit rules
 * consume it and never touch raw HTML themselves.
 */

export interface HeadingInfo {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface ImageInfo {
  src: string;
  /** null = alt attribute missing entirely; "" = present but empty (decorative). */
  alt: string | null;
}

export interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
}

export interface FormInfo {
  inputCount: number;
  unlabeledInputCount: number;
  hasSubmit: boolean;
}

export interface ButtonInfo {
  /** Visible text or aria-label; empty string when neither exists. */
  accessibleName: string;
  element: "button" | "a" | "input";
}

export interface CtaInfo {
  text: string;
  element: "button" | "a";
  /** 0-based order of appearance in the document — proxy for "above the fold". */
  domIndex: number;
}

export interface OpenGraphInfo {
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface StructuredDataInfo {
  /** JSON-LD @type values found in valid script blocks. */
  types: string[];
  blockCount: number;
  invalidBlockCount: number;
}

export interface ContactIndicators {
  hasEmail: boolean;
  hasPhone: boolean;
  hasContactLink: boolean;
  hasAddress: boolean;
}

export interface TrustIndicators {
  hasPrivacyPolicyLink: boolean;
  hasTestimonialIndicators: boolean;
  hasSocialLinks: boolean;
  /** Business name in title/footer/copyright, legal entity markers, etc. */
  hasBusinessIdentity: boolean;
}

export interface TextStats {
  wordCount: number;
  /** First H1 text, else first heading, else null. */
  headlineText: string | null;
  /** Heuristic: page mentions services/products/offers ("we build", pricing, etc.). */
  hasServiceLanguage: boolean;
}

/** Everything the audit engine knows about the scanned homepage. */
export interface CollectedPageData {
  url: string;
  isHttps: boolean;
  httpStatus: number;
  responseTimeMs: number;
  pageSizeBytes: number;
  redirectChain: string[];

  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  /** Raw content of <meta name="robots">, lowercased, or null. */
  robotsMeta: string | null;
  viewportMeta: string | null;

  headings: HeadingInfo[];
  h1Count: number;

  images: ImageInfo[];
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
  buttons: ButtonInfo[];
  forms: FormInfo[];
  ctas: CtaInfo[];

  openGraph: OpenGraphInfo;
  structuredData: StructuredDataInfo;
  contact: ContactIndicators;
  trust: TrustIndicators;
  textStats: TextStats;
}

/**
 * PageSpeed Insights data. `available: false` means the API call failed or no
 * key is configured — rules that depend on it must degrade gracefully.
 */
export interface PerformanceData {
  available: boolean;
  /** Lighthouse category scores, 0–100. */
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
  /** Lab metrics. */
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  fcpMs: number | null;
  tbtMs: number | null;
}

/** Input handed to every audit rule. */
export interface AuditInput {
  page: CollectedPageData;
  performance: PerformanceData;
}
