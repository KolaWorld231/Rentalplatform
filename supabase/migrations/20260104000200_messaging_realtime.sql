-- Enables Supabase Realtime change streaming for the messages table, so
-- RealtimeMessageListener (components/messaging/RealtimeMessageListener.tsx)
-- can subscribe to new messages. RLS still applies to Realtime
-- subscriptions — a client only receives change events for rows it's
-- authorized to SELECT, same as any other read.
alter publication supabase_realtime add table public.messages;
