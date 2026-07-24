import type { Metadata } from "next";
import Link from "next/link";

import { ScanUrlForm } from "@/components/forms/scan-url-form";

export const metadata: Metadata = {
  title: "Website Opportunity Scanner — Wilde Digital",
  description:
    "Internal audit tool: scan a homepage and get scored findings across SEO, performance, mobile, accessibility, conversion, and trust.",
  robots: { index: false },
};

const CATEGORIES = [
  {
    name: "Conversion",
    detail: "Calls to action, contact paths, offer clarity, and headline focus.",
  },
  {
    name: "SEO",
    detail: "Titles, descriptions, headings, canonical tags, and structured data.",
  },
  {
    name: "Performance",
    detail: "Core Web Vitals — loading speed, layout stability, responsiveness.",
  },
  {
    name: "Mobile",
    detail: "Viewport setup, mobile speed, and page weight on small screens.",
  },
  {
    name: "Trust",
    detail: "Contact info, privacy policy, HTTPS, and credibility signals.",
  },
  {
    name: "Accessibility",
    detail: "Alt text, form labels, accessible names, and heading structure.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Scan launcher */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-14 sm:pb-20 sm:pt-20">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-deep">
              Wilde Digital — internal tool
            </p>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-accent-deep underline-offset-4 hover:underline"
            >
              Scan history →
            </Link>
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.08] text-ink sm:text-6xl">
            Size up any website in about a minute.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Paste a prospect&apos;s URL to audit their homepage: an overall
            opportunity score, findings across six categories, a ranked fix
            list, and AI-drafted pitch material for the redesign conversation.
          </p>

          <div className="mt-10">
            <ScanUrlForm />
          </div>
        </div>
      </section>

      {/* What gets checked */}
      <section className="border-b border-line bg-soft">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
          <h2 className="font-display text-3xl font-semibold text-ink">
            What each scan checks
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            43 deterministic rules plus Google PageSpeed data where available —
            same checks every time, so scores are comparable across prospects.
          </p>

          <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category, index) => (
              <div key={category.name} className="bg-surface p-6">
                <dt className="flex items-baseline gap-3">
                  <span className="font-display text-sm text-accent-deep">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lg font-semibold text-ink">
                    {category.name}
                  </span>
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">
                  {category.detail}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">
            Scans cover the <strong className="text-ink">homepage only</strong>,
            from what a public visitor can see. Conversion findings are
            heuristics — treat them as talking points, not verdicts.
          </p>
        </div>
      </section>

      <footer className="mt-auto">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-sm text-muted">
          <p>Website Opportunity Scanner · internal use</p>
          <Link
            href="/dashboard"
            className="font-medium text-accent-deep underline-offset-4 hover:underline"
          >
            Scan history →
          </Link>
        </div>
      </footer>
    </main>
  );
}
