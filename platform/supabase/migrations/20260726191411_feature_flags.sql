-- Feature flags (master plan section 10.2 "System" table group; FND-006).
-- Flags are read broadly (including anonymous, for public-page gating) but
-- writes are intentionally left with no policy: only the service-role key
-- (used exclusively in server-only code, never the browser) can change them.
-- See section 9.4 "Admin access should occur through server-only privileged
-- operations" and rule 4 (never expose service-role keys to the browser).

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null default '',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.feature_flags is
  'Server-read feature flags. Only service-role writes are permitted (no INSERT/UPDATE/DELETE policy).';

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row
  execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

create policy "Feature flags are readable by anyone"
  on public.feature_flags
  for select
  to anon, authenticated
  using (true);

-- This Postgres/Supabase config does not auto-expose new public tables to the
-- Data API roles, so grants are explicit. Reads only for anon/authenticated;
-- RLS above still governs which rows they see. service_role needs write access
-- for server-only admin operations and test fixtures.
grant select on public.feature_flags to anon, authenticated;
grant select, insert, update, delete on public.feature_flags to service_role;
