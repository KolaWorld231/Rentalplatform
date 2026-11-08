import { NextResponse } from "next/server";
import { notifyMessageRecipient } from "@/lib/notifications/messages";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Mobile sends its own messages directly via the anon client (see
 * mobile/lib/messaging/service.ts) -- no server-role layer to call
 * notifyUser() from there. This thin authenticated route is the same
 * pattern as app/api/mobile/checkout/*: mobile calls it right after a
 * successful message insert, and it reuses the exact same
 * notifyMessageRecipient() web's sendMessageAction/startConversationAction
 * call, so a message sent from either client produces the identical
 * notification + push.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { conversationId?: string };
  if (!body.conversationId) {
    return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
  }

  await notifyMessageRecipient(body.conversationId, userData.user.id);
  return NextResponse.json({ ok: true });
}
