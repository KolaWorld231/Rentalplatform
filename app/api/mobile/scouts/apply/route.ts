import { NextResponse } from "next/server";
import { submitScoutApplicationAction } from "@/lib/scouts/actions";

/**
 * Unauthenticated by design -- same reasoning as ../otp/start/route.ts.
 * The OTP-verified-within-30-minutes gate is re-checked inside the
 * proxied action itself, not here.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const formData = new FormData();
  formData.set("fullName", String(body.fullName ?? ""));
  formData.set("phone", String(body.phone ?? ""));
  formData.set("email", String(body.email ?? ""));
  formData.set("ageConfirmed", body.ageConfirmed ? "true" : "false");
  formData.set("areaId", String(body.areaId ?? ""));
  formData.set("areaKnowledge", String(body.areaKnowledge ?? ""));
  formData.set("experience", String(body.experience ?? ""));
  formData.set("smartphoneModel", String(body.smartphoneModel ?? ""));
  formData.set("hasDataAccess", body.hasDataAccess ? "true" : "false");
  formData.set("motivation", String(body.motivation ?? ""));
  formData.set("references", JSON.stringify(body.references ?? []));
  formData.set("codeOfConductAccepted", body.codeOfConductAccepted ? "true" : "false");
  formData.set("verificationConsent", body.verificationConsent ? "true" : "false");

  const result = await submitScoutApplicationAction({}, formData);
  if (result.error || result.fieldErrors) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: 400 });
  }
  return NextResponse.json({ submitted: result.submitted, referenceCode: result.referenceCode, status: result.status });
}
