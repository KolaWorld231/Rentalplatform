import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { processVerifiedPaymentEvent } from "@/lib/payments/service";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Mobile's equivalent of checkMomoPaymentStatusAction
 * (app/checkout/momo/actions.ts) -- same reasoning: MTN's sandbox
 * callbacks are unreliable, so the client polls this, which calls the
 * provider's own checkStatus() and funnels a resolved result through the
 * same processVerifiedPaymentEvent() a real webhook delivery would use.
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

  const body = (await request.json().catch(() => ({}))) as { reference?: string };
  if (!body.reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }

  const { data: transaction } = await admin
    .from("payment_transactions")
    .select("user_id, status")
    .eq("internal_reference", body.reference)
    .maybeSingle();
  if (!transaction || transaction.user_id !== userData.user.id) {
    return NextResponse.json({ status: "error", error: "Transaction not found." });
  }
  if (transaction.status === "confirmed") return NextResponse.json({ status: "confirmed" });
  if (["failed", "reversed", "refunded"].includes(transaction.status)) return NextResponse.json({ status: "failed" });

  const provider = getPaymentProvider();
  if (!provider.checkStatus) {
    return NextResponse.json({ status: "error", error: "This payment method doesn't support status polling." });
  }

  const event = await provider.checkStatus(body.reference);
  if (!event) return NextResponse.json({ status: "pending" });

  const result = await processVerifiedPaymentEvent(event, provider.name);
  if (result.status === "error") return NextResponse.json({ status: "error", error: result.error });
  return NextResponse.json({ status: result.status === "confirmed" ? "confirmed" : "failed" });
}
