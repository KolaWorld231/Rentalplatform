// IMPORTANT: Next.js inlines NEXT_PUBLIC_* vars into the client bundle only
// when it sees a STATIC `process.env.NEXT_PUBLIC_X` reference at build
// time — a dynamic `process.env[name]` lookup (even with a literal string
// argument) is invisible to that static analysis, so the value silently
// comes back `undefined` in the browser even though it's set. Found live,
// against a real Supabase project: every browser-side feature that calls
// lib/supabase/client.ts's createClient() (image/document upload,
// Realtime) threw "Missing required environment variable" in the browser
// console, despite the var being correctly set and working fine
// server-side. Each getter below must keep its `process.env.NEXT_PUBLIC_*`
// reference written out literally — do not refactor this back into a
// name-parameterized helper.

function assertPresent(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in (see docs/DEPLOYMENT.md).`,
    );
  }
  return value;
}

export const supabaseEnv = {
  get url() {
    return assertPresent("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get anonKey() {
    return assertPresent("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  // Server-only; never referenced from client code (lib/supabase/service-role.ts
  // is itself guarded by the `server-only` package), so a dynamic lookup
  // here is fine — this one doesn't need client-bundle inlining.
  get serviceRoleKey() {
    return assertPresent("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
};
