-- Identity and access schema (master plan sections 8, 9, 10.2 "Identity and access").
-- Covers AUTH-006 (profile trigger), AUTH-007 (roles/user_roles),
-- AUTH-010 (RLS on identity tables), AUTH-011 (role applications),
-- AUTH-012 (account status/suspension).

-- ---------------------------------------------------------------------------
-- Enums (section 8.8 account state, 9.2 role values)
-- ---------------------------------------------------------------------------

create type public.account_status as enum (
  'active',
  'pending_verification',
  'pending_role_approval',
  'suspended',
  'deletion_requested',
  'deleted'
);

create type public.onboarding_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

create type public.app_role as enum (
  'mentee',
  'mentor_pending',
  'mentor',
  'employer_pending',
  'employer_member',
  'employer_admin',
  'content_reviewer',
  'admin',
  'super_admin'
);

create type public.role_application_status as enum (
  'submitted',
  'under_review',
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  account_status public.account_status not null default 'active',
  onboarding_status public.onboarding_status not null default 'not_started',
  university text,
  major text,
  graduation_year integer,
  city text,
  preferred_language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile mirroring auth.users. Created automatically by the on_auth_user_created trigger.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- roles / user_roles (section 9.1: DB-backed roles, never editable metadata)
-- ---------------------------------------------------------------------------

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null,
  unique (user_id, role)
);

comment on table public.user_roles is
  'Database-backed role assignments. Writes are service-role only so a user can never grant themselves a role.';

create index user_roles_user_id_idx on public.user_roles (user_id);

-- ---------------------------------------------------------------------------
-- consent_records (section 25.4: separate record per policy, with version)
-- ---------------------------------------------------------------------------

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null,
  policy_version text not null,
  accepted_at timestamptz not null default now()
);

create index consent_records_user_id_idx on public.consent_records (user_id);

-- ---------------------------------------------------------------------------
-- role_applications (AUTH-011: Mentor/Employer approval)
-- ---------------------------------------------------------------------------

create table public.role_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  requested_role public.app_role not null,
  status public.role_application_status not null default 'submitted',
  justification text not null default '',
  reviewer_id uuid references auth.users (id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

create trigger role_applications_set_updated_at
  before update on public.role_applications
  for each row
  execute function public.set_updated_at();

create index role_applications_user_id_idx on public.role_applications (user_id);

-- ---------------------------------------------------------------------------
-- account_events / audit_logs (section 25.6)
-- ---------------------------------------------------------------------------

create table public.account_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index account_events_user_id_idx on public.account_events (user_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Privileged-action audit trail. Readable only via server-only privileged operations.';

-- ---------------------------------------------------------------------------
-- Signup trigger (section 8.3). SECURITY DEFINER with a fixed empty
-- search_path, and idempotent so a duplicate call cannot fail signup.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, account_status, onboarding_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    'active',
    'not_started'
  )
  on conflict (id) do nothing;

  -- Every new account starts as a mentee. Elevated roles require the
  -- role_applications review flow; never granted at signup (section 8.2).
  insert into public.user_roles (user_id, role)
  values (new.id, 'mentee')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin? SECURITY DEFINER so policies can
-- consult user_roles without recursing through user_roles' own RLS.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role in ('admin', 'super_admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS (AUTH-010). Every table below is user-accessible, so all get RLS.
-- Suspended/deleted accounts are excluded from their own profile access so a
-- suspended session cannot keep operating (AUTH-012).
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.consent_records enable row level security;
alter table public.role_applications enable row level security;
alter table public.account_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    and account_status not in ('suspended', 'deleted')
  )
  with check (id = (select auth.uid()));

create policy "Users can read own roles"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read own consent records"
  on public.consent_records for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert own consent records"
  on public.consent_records for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can read own role applications"
  on public.role_applications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create own role applications"
  on public.role_applications for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Admins can read all role applications"
  on public.role_applications for select to authenticated
  using (public.is_admin((select auth.uid())));

create policy "Users can read own account events"
  on public.account_events for select to authenticated
  using (user_id = (select auth.uid()));

-- audit_logs intentionally has NO policy: readable only via service-role
-- (server-only privileged operations), per section 9.4.

-- ---------------------------------------------------------------------------
-- Grants. This Supabase config does not auto-expose new public tables to the
-- Data API roles, so grants are explicit. RLS above still governs rows.
-- ---------------------------------------------------------------------------

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert on public.consent_records to authenticated;
grant select, insert on public.role_applications to authenticated;
grant select on public.account_events to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.user_roles to service_role;
grant select, insert, update, delete on public.consent_records to service_role;
grant select, insert, update, delete on public.role_applications to service_role;
grant select, insert, update, delete on public.account_events to service_role;
grant select, insert, update, delete on public.audit_logs to service_role;
