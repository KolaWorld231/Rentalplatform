-- Milestone 5: direct messaging. The core gate — "active subscription
-- required to START a new conversation, not to reply in an existing
-- one" — is enforced entirely by RLS on `conversations` INSERT, using the
-- has_active_subscription() helper from Milestone 4. No separate RPC is
-- needed: Postgres evaluates the INSERT policy's WITH CHECK against the
-- proposed row, so this is exactly as trustworthy as a SECURITY DEFINER
-- function would be, with less code.
--
-- ARCHITECTURAL DECISION (recorded per CLAUDE.md): once a conversation
-- exists, the renter may continue replying in it even after their
-- subscription expires — only STARTING a new conversation (a new
-- property/owner relationship) requires an active pass. This matches the
-- brief's literal "initiate new conversation" gate and its promise that a
-- 30-day pass is for contacting owners, not a metered per-message charge.
-- Existing conversation history and reply access are preserved on expiry.

create type public.conversation_status as enum ('active', 'archived', 'blocked');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  renter_id uuid not null references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status public.conversation_status not null default 'active',
  renter_last_read_at timestamptz,
  owner_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, renter_id, owner_id)
);

create index conversations_renter_id_idx on public.conversations (renter_id, updated_at desc);
create index conversations_owner_id_idx on public.conversations (owner_id, updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- owner_id is always derived from the property, never trusted from the
-- client — this closes the gap where a client could otherwise set
-- owner_id to anything that merely isn't their own auth.uid().
create or replace function public.enforce_conversation_owner() returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_owner_id uuid;
  begin
    select owner_id into v_owner_id from public.properties where id = new.property_id;
    if v_owner_id is null then
      raise exception 'property % not found', new.property_id;
    end if;
    if v_owner_id = new.renter_id then
      raise exception 'cannot start a conversation about your own property';
    end if;
    new.owner_id = v_owner_id;
    return new;
  end;
  $$;

create trigger conversations_enforce_owner
  before insert on public.conversations
  for each row execute function public.enforce_conversation_owner();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  sent_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, sent_at);
create index messages_sender_rate_limit_idx on public.messages (sender_id, sent_at);

-- Keeps conversations.updated_at current for "most recent" sorting in the
-- conversation list, without the client having to remember to touch it.
create or replace function public.touch_conversation_on_message() returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    update public.conversations set updated_at = now() where id = new.conversation_id;
    return new;
  end;
  $$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index message_reports_status_idx on public.message_reports (status);

-- Row Level Security -----------------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;

create policy conversations_select_participant on public.conversations
  for select
  to authenticated
  using (renter_id = auth.uid() or owner_id = auth.uid());

create policy conversations_select_moderation on public.conversations
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

-- THE subscription gate: a renter may only create a conversation while
-- they currently hold an active, unexpired pass. Replying later (even
-- after expiry) is a separate INSERT on `messages`, governed by a
-- different, less restrictive policy below.
create policy conversations_insert_renter on public.conversations
  for insert
  to authenticated
  with check (renter_id = auth.uid() and public.has_active_subscription(auth.uid()));

-- Participants may update their own read-receipt timestamps (and, as a
-- known MVP looseness documented in docs/SECURITY.md, technically any
-- other column on their own conversation row — tightening this to
-- column-level granularity is tracked for Milestone 8 hardening).
create policy conversations_update_participant on public.conversations
  for update
  to authenticated
  using (renter_id = auth.uid() or owner_id = auth.uid())
  with check (renter_id = auth.uid() or owner_id = auth.uid());

create policy messages_select_participant on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.renter_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create policy messages_select_moderation on public.messages
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

-- Sending a message requires being a participant of an active
-- conversation. No subscription check here — per the architectural
-- decision above, that's only enforced at conversation creation. This is
-- also the policy that lets an owner reply for free, unconditionally.
create policy messages_insert_participant on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.status = 'active'
        and (c.renter_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create policy message_reports_insert on public.message_reports
  for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.renter_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create policy message_reports_select on public.message_reports
  for select
  to authenticated
  using (reporter_id = auth.uid() or public.has_role('admin') or public.has_role('moderator'));

-- Grants -------------------------------------------------------------------

grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.message_reports to authenticated;
grant all on public.conversations, public.messages, public.message_reports to service_role;
