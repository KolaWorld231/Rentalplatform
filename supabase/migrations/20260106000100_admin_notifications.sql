-- Milestone 7: administration, moderation, audit logging, and
-- notifications.

create type public.notification_type as enum (
  'new_message', 'subscription_activated', 'subscription_expiring', 'payment_failed',
  'listing_approved', 'listing_rejected', 'verification_update', 'account_notice', 'support_update'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Sensitive administrative actions (suspensions, role changes, listing
-- removal, verification decisions, subscription adjustments) are recorded
-- here. Never store sensitive documents or unnecessary personal data in
-- `metadata` — a reference (id) is enough; see docs/SECURITY.md.
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id),
  action text not null,
  target_table text not null,
  target_id text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_target_idx on public.admin_audit_logs (target_table, target_id);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);

-- Row Level Security -----------------------------------------------------

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Notifications are system-generated only (service_role) — a user may
-- read and mark their own as read, but not create one for themselves.
create policy notifications_select_self on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy notifications_update_self on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_preferences_select_self on public.notification_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

create policy notification_preferences_upsert_self on public.notification_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy notification_preferences_update_self on public.notification_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- admin_audit_logs: readable only by admins (not even moderators, to keep
-- the audit trail itself tightly scoped); writable only by service_role.
create policy admin_audit_logs_select_admin on public.admin_audit_logs
  for select
  to authenticated
  using (public.has_role('admin'));

-- Grants -------------------------------------------------------------------

grant select, update on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.admin_audit_logs to authenticated;
grant all on public.notifications, public.notification_preferences, public.admin_audit_logs to service_role;
