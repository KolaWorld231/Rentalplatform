import { NextResponse } from "next/server";
import { startCheckout } from "@/lib/subscriptions/service";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Mobile has no Next.js server layer of its own (no service-role key,
 * ever, in the mobile bundle), so this thin authenticated route is how
 * the mobile app reuses the EXACT same startCheckout() business logic
 * the web app's Server Action calls — not a reimplementation of it.
 * Required because a real payment provider's createCheckout (MTN MoMo's
 * RequestToPay) needs a secret subscription key that must never reach a
 * client bundle; the mock provider's checkout URL-building didn't need
 * this (mobile built it itself), but a real provider does.
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

  const body = (await request.json().catch(() => ({}))) as { payerPhone?: string };
  const returnUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const checkout = await startCheckout(userData.user.id, returnUrl, body.payerPhone);
    return NextResponse.json(checkout);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't start checkout." }, { status: 400 });
  }
}
