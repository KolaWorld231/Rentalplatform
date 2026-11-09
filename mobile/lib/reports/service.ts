// Hand-ported from app/properties/actions.ts's reportPropertyAction and
// app/messages/actions.ts's reportMessageAction -- same tables, same
// RLS boundary (authenticated insert, reporter-or-moderator-only
// select), called directly since mobile has no Server Action layer
// (see mobile/README.md; RLS is the enforcement boundary either way,
// per CLAUDE.md rule #7).
import { supabase } from "../supabase";
import type { ReportReason } from "../database.types";

export async function reportProperty(
  reporterId: string,
  propertyId: string,
  reason: ReportReason,
  details?: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.from("property_reports").insert({
    property_id: propertyId,
    reporter_id: reporterId,
    reason,
    details: details || null,
  });
  if (error) return { error: "Couldn't submit your report. Please try again." };
  return { ok: true };
}

export async function reportMessage(
  reporterId: string,
  messageId: string,
  conversationId: string,
  reason: ReportReason,
  details?: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.from("message_reports").insert({
    message_id: messageId,
    conversation_id: conversationId,
    reporter_id: reporterId,
    reason,
    details: details || null,
  });
  if (error) return { error: "Couldn't submit your report. Please try again." };
  return { ok: true };
}
