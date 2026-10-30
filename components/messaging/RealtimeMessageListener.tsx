"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime for new messages in this conversation
 * and refreshes the Server Component tree when one arrives, so a reply
 * shows up without a manual reload. Requires Supabase Realtime to be
 * enabled for the `messages` table (on by default for a new Supabase
 * project) — not independently verified in this sandboxed environment
 * since no live Supabase instance is reachable here (see
 * docs/IMPLEMENTATION_STATUS.md).
 */
export function RealtimeMessageListener({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  return null;
}
