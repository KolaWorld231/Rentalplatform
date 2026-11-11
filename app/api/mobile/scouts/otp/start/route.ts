import { NextResponse } from "next/server";
import { startScoutApplicationOtpAction } from "@/lib/scouts/actions";

/**
 * Unauthenticated by design -- same reasoning as
 * app/api/mobile/whatsapp-otp/start/route.ts. Proxies the existing Server
 * Action by constructing the FormData it expects; rate limiting and the
 * "no SMS provider configured" honest-failure path live in the action
 * itself and are shared with web unchanged.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { phone?: string };

  const formData = new FormData();
  formData.set("phone", body.phone ?? "");

  const result = await startScoutApplicationOtpAction({}, formData);
  if (result.error || result.fieldErrors) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: 400 });
  }
  return NextResponse.json({ otpSent: result.otpSent, phone: result.phone });
}
