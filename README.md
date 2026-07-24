# Website Opportunity Scanner

An internal analysis tool by [Wilde Digital](https://wildedigital.ca) for
assessing prospect websites for redesign and optimization opportunities. The
app scans a public website homepage, runs 43 deterministic audit rules across
six categories (conversion, SEO, performance, mobile, trust, accessibility),
calculates weighted scores, prioritizes fixes, layers AI-written plain-English
recommendations on top, and renders a client-ready, printable report.

## What I built / why it matters

I built the whole pipeline: a hardened fetch boundary for untrusted URLs (`src/lib/url-security.ts`),
the 43-rule deterministic audit engine and pure scoring math, the staged/retry-safe scan
orchestration (`src/jobs/run-scan-job.ts`), and an AI layer that can only *rephrase* verified
findings. It matters because it's the hard version of a common task: fetching and analyzing arbitrary
user-supplied websites **safely** (SSRF defense), and using AI as a bounded feature over deterministic,
tested logic — not as the source of truth. Covered by **216 passing Vitest cases** + a Playwright
end-to-end flow.

> **Screenshots / demo:** _(placeholders — add before publishing)_ a 60–90s scan→report clip, a
> report page screenshot, the dashboard, and an anonymized sample PDF report.

## Stack

Next.js (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase
(Postgres) · Zod · React Hook Form · Anthropic API (structured output) ·
Vitest · Playwright.

## Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then
   run the migration in the SQL editor (or via `supabase db push`):

   ```
   supabase/migrations/20260705000000_initial_schema.sql
   ```

3. **Configure environment** — copy `.env.example` to `.env.local` and fill in:

   | Variable | Required | Purpose |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key (RLS applies) |
   | `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only writes (never exposed to client) |
   | `PAGESPEED_API_KEY` | no | Google PageSpeed Insights — scans degrade gracefully without it |
   | `ANTHROPIC_API_KEY` | no | AI report content — reports stay fully usable without it |
   | `APP_URL` | no | Defaults to `http://localhost:3000` |

4. **Run**

   ```sh
   npm run dev
   ```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit + integration tests (Vitest, no network) |
| `npm run test:e2e` | End-to-end flow (Playwright; needs `.env.local` + `npx playwright install chromium`) |
| `npm run typecheck` / `npm run lint` / `npm run format` | Quality gates |

## Architecture

```
POST /api/scans ─▶ validate + normalize URL (SSRF checks) ─▶ scans row
                    └▶ after(): runScanJob (background)
                         collecting  safeFetchPage → collectors → scan_pages
                                     + up to 3 key pages (services/about/contact)
                                       sampled in parallel as AI pitch context —
                                       scores and findings stay homepage-only
                         auditing    43 deterministic rules → audit_findings
                         scoring     weighted category + overall scores
                         generating  AI analysis (optional) → reports
/scan/[id]   polls GET /api/scans/[id] for stage + progress
/report/[id] renders the stored report (print-friendly)
/dashboard   scan history, score change vs previous scan of the same site, rescan
```

## Deployment

Intended to run locally (`npm run dev` or `npm run build && npm start`) or on a
long-running host. The scan pipeline executes inside `next/server after()`,
which is killed at the platform's max request duration — do not deploy to
default serverless limits without raising the function duration well past a
full scan (~60s+).

Separation of concerns: `collectors/` extract structure from HTML (cheerio,
never executed, never rendered), `audit-engine/` consumes only the typed
`CollectedPageData` contract, `scoring/` is pure deterministic math, `ai/` is
a provider abstraction that can only rephrase verified findings — it never
determines findings or scores, and the report renders fully without it.

## Security notes

- **SSRF**: URL normalization, protocol allowlist, credential rejection,
  private/reserved/metadata IP blocking (IPv4 + IPv6 incl. mapped/NAT64),
  DNS resolution checks, per-redirect-hop revalidation, 15s timeout, 2MB
  response cap, content-type validation (`src/lib/url-security.ts`).
- Raw scraped HTML is never stored or rendered — only extracted structured
  data.
- Supabase service-role key is server-only; all tables have RLS enabled with
  **no policies** (deny-by-default) — the anon key can read nothing via
  PostgREST. Every read/write goes through server-side service-role code.
  There is no auth layer — the app is intended to run locally/privately.
- AI generation is bounded (120s timeout, 1 retry); a timed-out or failed
  call degrades to the deterministic report.
- Rate limiting on scan creation (5/10min per IP). In-memory per instance —
  swap for a durable store when scaling.
- Users only ever see safe error messages; internals go to server logs.
