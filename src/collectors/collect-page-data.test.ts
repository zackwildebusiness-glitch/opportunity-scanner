import { describe, expect, it, vi } from "vitest";

import { collectPageData } from "./collect-page-data";
import { collectPerformanceData } from "./performance-collector";

const HAPPY_PATH_HTML = String.raw`<!doctype html>
<html>
  <head>
    <title>Acme Web Studio | Toronto</title>
    <meta name="description" content="We build useful websites for local companies.">
    <meta name="robots" content="INDEX, FOLLOW">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="/home">
    <meta property="og:title" content="Acme Web Studio">
    <meta property="og:description" content="Design and development help.">
    <meta property="og:image" content="/og.png">
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Web Studio"}
    </script>
    <script type="application/ld+json">
      [{"@type":["Organization","ProfessionalService"]},{"@graph":[{"@type":"WebSite"}]}]
    </script>
    <script type="application/ld+json">{ bad json }</script>
  </head>
  <body>
    <header>
      <a href="/" aria-label="Home"></a>
      <a href="/contact" class="nav-link">Contact us</a>
      <a href="https://www.example.com/services">Services</a>
      <a href="https://external.example/case-study">Case Study</a>
      <a href="mailto:hello@example.com">Email</a>
      <a href="tel:+14165550123">Call</a>
      <a href="#">Skip</a>
      <a href="javascript:alert(1)">Bad</a>
    </header>
    <main>
      <h1>Grow Your Local Leads</h1>
      <h2>Our services</h2>
      <p>
        We build landing pages and provide analytics. Our services include pricing packages.
        Book a free consultation at 123 King Street West, Toronto ON M5V 2T6.
        Rated five stars in Google Reviews and Trustpilot.
        Contact hello@acme.example or call (416) 555-0199.
      </p>
      <img src="/hero.jpg" alt="Team at work">
      <img src="/decorative.svg" alt="">
      <img src="">
      <a href="/quote" class="btn primary">Get a quote</a>
      <a href="/plain" class="cta-link">Plain prominent</a>
      <button>Book a demo</button>
      <button aria-label="Start now"></button>
      <button><img alt="Download guide"></button>
      <input type="submit" value="Send request">
      <form>
        <label for="name">Name</label>
        <input id="name" name="name">
        <label>Email <input name="email"></label>
        <input name="company" placeholder="Company">
        <textarea aria-label="Project details"></textarea>
        <select aria-labelledby="budget-label"><option>Budget</option></select>
        <input type="hidden" name="token">
        <button>Submit</button>
      </form>
      <form>
        <input name="message">
        <button type="button">No submit</button>
      </form>
      <section class="testimonial-card">Client testimonial</section>
    </main>
    <footer>
      <a href="/privacy">Privacy Policy</a>
      <a href="https://instagram.com/acme">Instagram</a>
      <p>&copy; 2026 Acme Web Studio Inc.</p>
    </footer>
  </body>
</html>`;

describe("collectPageData", () => {
  it("collects realistic page data across all collector fields", () => {
    const data = collectPageData({
      html: HAPPY_PATH_HTML,
      finalUrl: "https://example.com/start",
      httpStatus: 200,
      responseTimeMs: 321,
      pageSizeBytes: 12_345,
      redirectChain: ["https://www.example.com/start", "https://example.com/start"],
    });

    expect(data.url).toBe("https://example.com/start");
    expect(data.isHttps).toBe(true);
    expect(data.httpStatus).toBe(200);
    expect(data.responseTimeMs).toBe(321);
    expect(data.pageSizeBytes).toBe(12_345);
    expect(data.redirectChain).toEqual(["https://www.example.com/start", "https://example.com/start"]);
    expect(data.title).toBe("Acme Web Studio | Toronto");
    expect(data.metaDescription).toBe("We build useful websites for local companies.");
    expect(data.canonicalUrl).toBe("https://example.com/home");
    expect(data.robotsMeta).toBe("index, follow");
    expect(data.viewportMeta).toBe("width=device-width, initial-scale=1");
    expect(data.openGraph).toEqual({
      title: "Acme Web Studio",
      description: "Design and development help.",
      image: "https://example.com/og.png",
    });
    expect(data.headings).toEqual([
      { level: 1, text: "Grow Your Local Leads" },
      { level: 2, text: "Our services" },
    ]);
    expect(data.h1Count).toBe(1);
    expect(data.images).toEqual([
      { src: "https://example.com/hero.jpg", alt: "Team at work" },
      { src: "https://example.com/decorative.svg", alt: "" },
      { src: "", alt: null },
      { src: "", alt: "Download guide" },
    ]);
    expect(data.internalLinks.map((link) => link.href)).toEqual([
      "https://example.com/",
      "https://example.com/contact",
      "https://www.example.com/services",
      "https://example.com/quote",
      "https://example.com/plain",
      "https://example.com/privacy",
    ]);
    expect(data.internalLinks[0]?.text).toBe("Home");
    expect(data.externalLinks).toEqual([
      { href: "https://external.example/case-study", text: "Case Study", isInternal: false },
      { href: "https://instagram.com/acme", text: "Instagram", isInternal: false },
    ]);
    expect(data.forms).toEqual([
      { inputCount: 5, unlabeledInputCount: 1, hasSubmit: true },
      { inputCount: 1, unlabeledInputCount: 1, hasSubmit: false },
    ]);
    expect(data.buttons).toEqual([
      { accessibleName: "Get a quote", element: "a" },
      { accessibleName: "Book a demo", element: "button" },
      { accessibleName: "Start now", element: "button" },
      { accessibleName: "Download guide", element: "button" },
      { accessibleName: "Send request", element: "input" },
      { accessibleName: "Submit", element: "button" },
      { accessibleName: "No submit", element: "button" },
    ]);
    expect(data.ctas).toEqual([
      { text: "Contact us", element: "a", domIndex: 1 },
      { text: "Call", element: "a", domIndex: 5 },
      { text: "Get a quote", element: "a", domIndex: 8 },
      { text: "Plain prominent", element: "a", domIndex: 9 },
      { text: "Book a demo", element: "button", domIndex: 10 },
      { text: "Start now", element: "button", domIndex: 11 },
      { text: "Download guide", element: "button", domIndex: 12 },
    ]);
    expect(data.contact).toEqual({
      hasEmail: true,
      hasPhone: true,
      hasContactLink: true,
      hasAddress: true,
    });
    expect(data.trust).toEqual({
      hasPrivacyPolicyLink: true,
      hasTestimonialIndicators: true,
      hasSocialLinks: true,
      hasBusinessIdentity: true,
    });
    expect(data.structuredData).toEqual({
      types: ["LocalBusiness", "Organization", "ProfessionalService", "WebSite"],
      blockCount: 3,
      invalidBlockCount: 1,
    });
    expect(data.textStats.headlineText).toBe("Grow Your Local Leads");
    expect(data.textStats.hasServiceLanguage).toBe(true);
    expect(data.textStats.wordCount).toBeGreaterThan(35);
  });

  it("returns null metadata and negative indicators when signals are absent", () => {
    const data = collectPageData({
      html: "<html><head></head><body><h2>Only heading</h2><p>Plain brochure text.</p></body></html>",
      finalUrl: "http://example.org",
      httpStatus: 404,
      responseTimeMs: 50,
      pageSizeBytes: 90,
      redirectChain: [],
    });

    expect(data.isHttps).toBe(false);
    expect(data.title).toBeNull();
    expect(data.metaDescription).toBeNull();
    expect(data.canonicalUrl).toBeNull();
    expect(data.robotsMeta).toBeNull();
    expect(data.viewportMeta).toBeNull();
    expect(data.openGraph).toEqual({ title: null, description: null, image: null });
    expect(data.contact).toEqual({
      hasEmail: false,
      hasPhone: false,
      hasContactLink: false,
      hasAddress: false,
    });
    expect(data.trust).toEqual({
      hasPrivacyPolicyLink: false,
      hasTestimonialIndicators: false,
      hasSocialLinks: false,
      hasBusinessIdentity: false,
    });
    expect(data.textStats.headlineText).toBe("Only heading");
    expect(data.textStats.hasServiceLanguage).toBe(false);
  });
});

describe("collectPerformanceData", () => {
  it("extracts PSI category scores and lab metrics", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          lighthouseResult: {
            categories: {
              performance: { score: 0.92 },
              accessibility: { score: 0.87 },
              seo: { score: 1 },
              "best-practices": { score: 0.73 },
            },
            audits: {
              "largest-contentful-paint": { numericValue: 2345.6 },
              "cumulative-layout-shift": { numericValue: 0.0123 },
              "interaction-to-next-paint": { numericValue: 145 },
              "first-contentful-paint": { numericValue: 1200 },
              "total-blocking-time": { numericValue: 80 },
            },
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await collectPerformanceData("https://example.com", "api-key", fetchImpl);
    const calledUrl = new URL(String(vi.mocked(fetchImpl).mock.calls[0]?.[0]));

    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    expect(calledUrl.searchParams.get("url")).toBe("https://example.com");
    expect(calledUrl.searchParams.get("key")).toBe("api-key");
    expect(calledUrl.searchParams.get("strategy")).toBe("mobile");
    expect(calledUrl.searchParams.getAll("category")).toEqual([
      "performance",
      "accessibility",
      "seo",
      "best-practices",
    ]);
    expect(result).toEqual({
      available: true,
      performanceScore: 92,
      accessibilityScore: 87,
      seoScore: 100,
      bestPracticesScore: 73,
      lcpMs: 2345.6,
      cls: 0.0123,
      inpMs: 145,
      fcpMs: 1200,
      tbtMs: 80,
    });
  });

  it("returns unavailable data without an API key", async () => {
    await expect(collectPerformanceData("https://example.com", undefined)).resolves.toEqual({
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
    });
  });

  it("returns unavailable data and warns when the API fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 })) as typeof fetch;

    await expect(collectPerformanceData("https://example.com", "api-key", fetchImpl)).resolves.toMatchObject({
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
    });
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});
