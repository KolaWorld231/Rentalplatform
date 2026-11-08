import { NextResponse } from "next/server";
import { startWhatsAppLogin, startWhatsAppSignup } from "@/lib/auth/whatsapp-otp";
import { whatsappLoginSchema, whatsappSignupSchema } from "@/lib/validation/auth";

/**
 * Unauthenticated by design -- there's no session yet at the point of
 * requesting an OTP. Rate limiting against abuse happens per-phone
 * inside startWhatsAppSignup/startWhatsAppLogin (lib/auth/whatsapp-otp.ts),
 * the same functions web's Server Actions call, so mobile and web share
 * every bit of this logic -- only the transport (FormData vs. JSON) and
 * the final session-minting step (cookie jar vs. raw tokens) differ.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { mode?: "signup" | "login" } & Record<string, unknown>;

  if (body.mode === "signup") {
    const parsed = whatsappSignupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Please check the highlighted fields." }, { status: 400 });
    const result = await startWhatsAppSignup(parsed.data);
    if ("error" in result) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.mode === "login") {
    const parsed = whatsappLoginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    const result = await startWhatsAppLogin(parsed.data);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "mode must be 'signup' or 'login'." }, { status: 400 });
}
