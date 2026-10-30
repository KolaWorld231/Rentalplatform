# payments-webhook (not implemented as an Edge Function)

The payment webhook handler is implemented as a Next.js Route Handler at
`app/api/payments/webhook/route.ts` instead of a Supabase Edge Function.

Why: this project's local development runs in a sandboxed container whose
Docker daemon doesn't start, so the Supabase CLI's Edge Functions runtime
(`supabase functions serve`, itself Docker-backed) was never usable here.
The Route Handler gives the exact same trust boundary — server-only code
using the `service_role` key, never reachable by client-supplied
authorization — and was directly testable in this environment.

If you want this running as an actual Edge Function (e.g. to decouple
webhook processing from the Next.js deployment), porting it is
copy-paste, not a redesign:

1. Copy the body of `POST` in `app/api/payments/webhook/route.ts` into
   `index.ts` here, swapping `NextResponse.json(...)` for
   `new Response(JSON.stringify(...), { ... })`.
2. Replace `createServiceRoleClient()` (`lib/supabase/service-role.ts`)
   with `createClient(Deno.env.get("SUPABASE_URL")!,
   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)` from
   `https://esm.sh/@supabase/supabase-js@2`.
3. `getPaymentProvider()` (`lib/payments/index.ts`) and its providers
   (`lib/payments/providers/`) have no Next.js-specific dependencies and
   can be imported as-is (or re-implemented against `Deno.env` instead of
   `process.env`).
4. Point the real payment provider's webhook URL at the deployed function
   instead of `/api/payments/webhook`.
5. Deploy with `supabase functions deploy payments-webhook`.
