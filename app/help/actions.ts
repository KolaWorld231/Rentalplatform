"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/auth/actions";

const supportTicketSchema = z.object({
  subject: z.string().trim().min(3, "Enter a short subject").max(160),
  message: z.string().trim().min(10, "Tell us a bit more").max(4000),
});

export async function submitSupportTicketAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/help");

  const parsed = supportTicketSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject: parsed.data.subject, message: parsed.data.message });

  if (error) {
    return { error: "Couldn't submit your request. Please try again." };
  }

  return {};
}
