import { NextResponse } from "next/server";
import { listOpenScoutAreas } from "@/lib/scouts/actions";

/** Unauthenticated by design -- an applicant has no account yet at this point. */
export async function GET() {
  const areas = await listOpenScoutAreas();
  return NextResponse.json({ areas });
}
