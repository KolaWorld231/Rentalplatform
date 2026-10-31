import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "./env";

const PROTECTED_PREFIXES = ["/account", "/dashboard", "/messages", "/favourites", "/admin", "/notifications"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Must call getUser() (not getSession()) so the token is actually
  // re-validated against Supabase Auth, not just read from a cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // A suspended account must actually lose access, not just show a
  // different badge in the admin UI — found live, where a suspended test
  // user could still log in and use every protected page normally.
  if (isProtected && user && !request.nextUrl.pathname.startsWith("/suspended")) {
    const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
    if (profile?.account_status === "suspended") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/suspended", request.url));
    }
  }

  return response;
}
