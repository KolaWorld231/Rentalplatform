"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { startCheckout } from "@/lib/subscriptions/service";

export async function startCheckoutAction(formData: FormData) {
  const user = await requireUser("/pricing");

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const returnUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
  const phone = formData.get("phone");
  const payerPhone = typeof phone === "string" && phone.trim() ? phone.trim() : undefined;

  let checkout: Awaited<ReturnType<typeof startCheckout>>;
  try {
    checkout = await startCheckout(user.id, returnUrl, payerPhone);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("mobile money phone number is required")) {
      redirect("/pricing?error=phone_required");
    }
    redirect("/pricing?error=checkout_failed");
  }

  if (checkout.kind === "redirect") {
    redirect(checkout.redirectUrl);
  }
  redirect(`/checkout/momo/pending?ref=${checkout.reference}`);
}
