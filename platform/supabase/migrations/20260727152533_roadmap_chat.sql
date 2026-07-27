-- Persisted chat history for the AI roadmap assistant (Feature 2). Scoped
-- through the parent roadmap's owner, same join pattern as roadmap_steps.

create table public.roadmap_chat_messages (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index roadmap_chat_messages_roadmap_id_idx
  on public.roadmap_chat_messages (roadmap_id, created_at);

alter table public.roadmap_chat_messages enable row level security;

create policy "Users manage own roadmap chat messages"
  on public.roadmap_chat_messages for all to authenticated
  using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.roadmap_chat_messages to authenticated;
grant select, insert, update, delete on public.roadmap_chat_messages to service_role;
