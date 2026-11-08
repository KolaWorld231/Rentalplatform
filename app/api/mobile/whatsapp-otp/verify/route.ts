import { NextResponse } from "next/server";
import { mintSessionTokensForEmail } from "@/lib/auth/session-mint";
import { verifyWhatsAppOtp } from "@/lib/auth/whatsapp-otp";
import { whatsappOtpVerifySchema } from "@/lib/validation/auth";

/**
 * Unauthenticated by design -- same reasoning as ../start/route.ts.
 * Unlike the web Server Action (which mints a session into the request's
 * cookie jar), this returns the raw access/refresh tokens in the JSON
 * response; mobile calls supabase.auth.setSession({ access_token,
 * refresh_token }) with them -- see mintSessionTokensForEmail's own doc
 * comment in lib/auth/session-mint.ts for why mobile needs a different
 * mechanism here than web does.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = whatsappOtpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await verifyWhatsAppOtp(parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: 400 });
  }

  try {
    const tokens = await mintSessionTokensForEmail(result.email);
    return NextResponse.json({ ok: true, mode: result.mode, ...tokens });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't complete sign-in." }, { status: 500 });
  }
}
