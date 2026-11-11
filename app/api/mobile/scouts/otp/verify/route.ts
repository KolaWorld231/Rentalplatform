import { NextResponse } from "next/server";
import { verifyScoutApplicationOtpAction } from "@/lib/scouts/actions";

/** Unauthenticated by design -- same reasoning as ../start/route.ts. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { phone?: string; code?: string };

  const formData = new FormData();
  formData.set("phone", body.phone ?? "");
  formData.set("code", body.code ?? "");

  const result = await verifyScoutApplicationOtpAction({}, formData);
  if (result.error || result.fieldErrors) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors, phone: result.phone }, { status: 400 });
  }
  return NextResponse.json({ verified: result.verified, phone: result.phone });
}
