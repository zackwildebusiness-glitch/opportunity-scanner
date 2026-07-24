-- Website Opportunity Scanner — initial schema
-- Tables: scans, scan_pages, audit_findings, category_scores, reports, scan_events
--
-- Access model:
--   * All writes go through the API using the service-role key (bypasses RLS).
--   * Scan status / findings / reports are readable by UUID
--     (UUIDs are unguessable; the scan link is the capability).
--   * No anon/authenticated INSERT/UPDATE/DELETE policies exist; writes are
--     service-role only by construction.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- scans
-- ---------------------------------------------------------------------------

create table public.scans (
  id             uuid primary key default gen_random_uuid(),
  submitted_url  text not null,
  normalized_url text not null,
  resolved_url   text,
  status         text not null default 'pending'
                 check (status in ('pending', 'running', 'completed', 'failed')),
  progress       integer not null default 0
                 check (progress between 0 and 100),
  current_stage  text not null default 'queued'
                 check (current_stage in
                   ('queued', 'collecting', 'auditing', 'scoring',
                    'generating', 'completed', 'failed')),
  error_code     text,
  error_message  text,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index scans_created_at_idx on public.scans (created_at desc);
create index scans_status_idx     on public.scans (status);

create trigger scans_set_updated_at
  before update on public.scans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- scan_pages
-- ---------------------------------------------------------------------------

create table public.scan_pages (
  id               uuid primary key default gen_random_uuid(),
  scan_id          uuid not null references public.scans (id) on delete cascade,
  url              text not null,
  http_status      integer,
  response_time_ms integer,
  page_size_bytes  integer,
  raw_metadata     jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index scan_pages_scan_id_idx on public.scan_pages (scan_id);

-- ---------------------------------------------------------------------------
-- audit_findings
-- ---------------------------------------------------------------------------

create table public.audit_findings (
  id             uuid primary key default gen_random_uuid(),
  scan_id        uuid not null references public.scans (id) on delete cascade,
  rule_id        text not null,
  category       text not null
                 check (category in
                   ('seo', 'performance', 'mobile', 'accessibility',
                    'conversion', 'trust')),
  title          text not null,
  description    text not null,
  status         text not null
                 check (status in ('pass', 'warning', 'fail')),
  severity       text not null
                 check (severity in ('low', 'medium', 'high', 'critical')),
  evidence       jsonb not null default '[]'::jsonb,
  recommendation text not null,
  score_impact   numeric not null default 0,
  created_at     timestamptz not null default now(),
  unique (scan_id, rule_id)
);

create index audit_findings_scan_id_idx  on public.audit_findings (scan_id);
create index audit_findings_category_idx on public.audit_findings (scan_id, category);

-- ---------------------------------------------------------------------------
-- category_scores
-- ---------------------------------------------------------------------------

create table public.category_scores (
  id         uuid primary key default gen_random_uuid(),
  scan_id    uuid not null references public.scans (id) on delete cascade,
  category   text not null
             check (category in
               ('seo', 'performance', 'mobile', 'accessibility',
                'conversion', 'trust')),
  score      integer not null check (score between 0 and 100),
  weight     numeric not null check (weight >= 0 and weight <= 1),
  created_at timestamptz not null default now(),
  unique (scan_id, category)
);

create index category_scores_scan_id_idx on public.category_scores (scan_id);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------

create table public.reports (
  id                    uuid primary key default gen_random_uuid(),
  scan_id               uuid not null unique references public.scans (id) on delete cascade,
  overall_score         integer not null check (overall_score between 0 and 100),
  executive_summary     text,
  priority_actions      jsonb not null default '[]'::jsonb,
  copy_suggestions      jsonb,
  service_opportunities jsonb,
  ai_status             text not null default 'pending'
                        check (ai_status in ('pending', 'completed', 'failed', 'skipped')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- scan_events
-- ---------------------------------------------------------------------------

create table public.scan_events (
  id         uuid primary key default gen_random_uuid(),
  scan_id    uuid not null references public.scans (id) on delete cascade,
  stage      text not null,
  message    text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index scan_events_scan_id_idx on public.scan_events (scan_id, created_at);

-- ---------------------------------------------------------------------------
-- row-level security
-- ---------------------------------------------------------------------------

alter table public.scans           enable row level security;
alter table public.scan_pages      enable row level security;
alter table public.audit_findings  enable row level security;
alter table public.category_scores enable row level security;
alter table public.reports         enable row level security;
alter table public.scan_events     enable row level security;

-- Deny-by-default: RLS is enabled on every table and NO policies are created.
-- The app never queries with the anon key — every read and write goes through
-- server-side service-role code (src/lib/supabase/admin.ts), which bypasses
-- RLS. Anyone holding the publishable anon key therefore sees nothing via
-- PostgREST. If a client-side read path is ever added, grant it the narrowest
-- possible policy here (per-row capability, not `using (true)`).
