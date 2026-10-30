"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { startCheckout } from "@/lib/subscriptions/service";

export async function startCheckoutAction() {
  const user = await requireUser("/pricing");

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const returnUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;

  let redirectUrl: string;
  try {
    redirectUrl = (await startCheckout(user.id, returnUrl)).redirectUrl;
  } catch {
    redirect("/pricing?error=checkout_failed");
  }
  redirect(redirectUrl);
}
