import { describe, expect, it } from "vitest";

import type { LinkInfo } from "@/types/collected-data";

import { discoverKeyPages } from "./discover-key-pages";

function link(href: string, text: string): LinkInfo {
  return { href, text, isInternal: true };
}

describe("discoverKeyPages", () => {
  it("resolves relative and absolute hrefs against the final URL", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/",
        internalLinks: [
          link("/services", "Services"),
          link("https://example.com/about-us", "About"),
          link("./contact-us", "Contact"),
        ],
      }),
    ).toEqual([
      { url: "https://example.com/services", label: "services" },
      { url: "https://example.com/about-us", label: "about" },
      { url: "https://example.com/contact-us", label: "contact" },
    ]);
  });

  it("rejects cross-origin links and non-http schemes", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/",
        internalLinks: [
          link("https://www.example.com/services", "Services"),
          link("http://example.com/about", "About"),
          link("mailto:hello@example.com", "Contact"),
          link("tel:+14165550123", "Call"),
          link("javascript:alert(1)", "Pricing"),
          link("https://example.com/contact", "Contact"),
        ],
      }),
    ).toEqual([{ url: "https://example.com/contact", label: "contact" }]);
  });

  it("drops query-string links and strips hash fragments", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/",
        internalLinks: [
          link("/services?utm_source=newsletter", "Services"),
          link("/pricing#plans", "Pricing"),
          link("/about-us#team", "About"),
        ],
      }),
    ).toEqual([
      { url: "https://example.com/pricing", label: "services" },
      { url: "https://example.com/about-us", label: "about" },
    ]);
  });

  it("excludes the homepage itself", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/home",
        internalLinks: [
          link("/", "Services"),
          link("/home#main", "Contact"),
          link("/services", "Services"),
        ],
      }),
    ).toEqual([{ url: "https://example.com/services", label: "services" }]);
  });

  it("keeps one URL per bucket with document-order winners", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/",
        internalLinks: [
          link("/pricing", "Pricing"),
          link("/services", "Services"),
          link("/team", "Team"),
          link("/about-us", "About"),
          link("/quote", "Get a quote"),
          link("/contact-us", "Contact"),
        ],
      }),
    ).toEqual([
      { url: "https://example.com/pricing", label: "services" },
      { url: "https://example.com/team", label: "about" },
      { url: "https://example.com/quote", label: "contact" },
    ]);
  });

  it("normalizes pathname case and dedupes trailing slashes", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/",
        internalLinks: [
          link("/Services/", "Services"),
          link("/services", "Pricing"),
          link("/ABOUT-US/", "About"),
        ],
      }),
    ).toEqual([
      { url: "https://example.com/services", label: "services" },
      { url: "https://example.com/about-us", label: "about" },
    ]);
  });

  it("returns candidates in priority order and respects the limit", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/",
        limit: 2,
        internalLinks: [
          link("/contact", "Contact"),
          link("/about", "About"),
          link("/services", "Services"),
        ],
      }),
    ).toEqual([
      { url: "https://example.com/services", label: "services" },
      { url: "https://example.com/about", label: "about" },
    ]);
  });

  it("classifies by link text when the path is generic", () => {
    expect(
      discoverKeyPages({
        finalUrl: "https://example.com/",
        internalLinks: [
          link("/start-here", "What we do"),
          link("/people", "Our team"),
          link("/calendar", "Book a call"),
        ],
      }),
    ).toEqual([
      { url: "https://example.com/start-here", label: "services" },
      { url: "https://example.com/people", label: "about" },
      { url: "https://example.com/calendar", label: "contact" },
    ]);
  });

  it("returns an empty list for empty input or an invalid final URL", () => {
    expect(discoverKeyPages({ finalUrl: "https://example.com/", internalLinks: [] })).toEqual([]);
    expect(
      discoverKeyPages({
        finalUrl: "not a url",
        internalLinks: [link("/services", "Services")],
      }),
    ).toEqual([]);
  });
});
