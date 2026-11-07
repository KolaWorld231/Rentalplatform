// Expo inlines EXPO_PUBLIC_* at build time, same mechanism as Next's
// NEXT_PUBLIC_* -- see lib/supabase/env.ts on the web side for why each
// reference is written out literally rather than name-parameterized.
function assertPresent(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

export const supabaseEnv = {
  get url() {
    return assertPresent("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL);
  },
  get anonKey() {
    return assertPresent("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  },
};
