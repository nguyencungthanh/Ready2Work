-- Foundation migration: shared helpers reused by every later domain migration.
-- Section 10.3 of the master plan requires most tables to carry created_at/updated_at;
-- this trigger function keeps that behavior consistent instead of repeating it per table.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps updated_at = now() on row update. Attach via BEFORE UPDATE trigger.';
