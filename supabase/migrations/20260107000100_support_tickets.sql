-- Milestone 8: a minimal functional support-ticket workflow for the
-- Help & Support page.

create type public.support_ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 4000),
  status public.support_ticket_status not null default 'open',
  assigned_to uuid references auth.users (id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_user_id_idx on public.support_tickets (user_id, created_at desc);
create index support_tickets_status_idx on public.support_tickets (status);

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

create policy support_tickets_select_self on public.support_tickets
  for select
  to authenticated
  using (user_id = auth.uid() or public.has_role('admin') or public.has_role('moderator'));

create policy support_tickets_insert_self on public.support_tickets
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Status/assignment changes are service_role only (admin tooling), same
-- pattern as every other moderation table in this project.

grant select, insert on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
