"use server";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { reportPropertySchema } from "@/lib/validation/property";
import type { ActionState } from "@/lib/auth/actions";

export async function reportPropertyAction(
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reportPropertySchema.safeParse({
    reason: formData.get("reason"),
    details: formData.get("details"),
  });
  if (!parsed.success) {
    return { error: "Please choose a reason for this report." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("property_reports").insert({
    property_id: propertyId,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  if (error) {
    return { error: "Couldn't submit your report. Please try again." };
  }

  return {};
}
