import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { processVerifiedPaymentEvent } from "@/lib/payments/service";

/**
 * Payment provider webhook endpoint. Handles subscription activation —
 * the one and only path by which a subscription becomes active. See
 * docs/PAYMENTS.md for the full verification/idempotency model.
 *
 * NOTE on architecture: the build brief's reference design routes this
 * through a Supabase Edge Function. We implement it as a Next.js Route
 * Handler instead — same trust boundary (server-only code using the
 * service-role key, never reachable by client-supplied authorization),
 * and it's directly testable in this environment where the Supabase CLI's
 * Docker-backed Edge Functions runtime isn't available. Porting this
 * handler's body into `supabase/functions/payments-webhook/` later is a
 * copy, not a redesign — see that folder's README.
 *
 * The actual activation logic lives in `lib/payments/service.ts`'s
 * `processVerifiedPaymentEvent` so a provider's own status poll (MTN
 * MoMo's `checkStatus`, used because its sandbox callbacks are known
 * unreliable — see `app/checkout/momo/actions.ts`) resolves a payment
 * through the exact same code, not a parallel copy of it.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const provider = getPaymentProvider();

  const event = await provider.verifyWebhook({ rawBody, headers: request.headers });
  if (!event) {
    return NextResponse.json({ error: "invalid or unverifiable webhook" }, { status: 401 });
  }

  const result = await processVerifiedPaymentEvent(event, provider.name);
  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: result.error === "unknown transaction reference" ? 404 : 500 });
  }
  return NextResponse.json({ status: result.status });
}
