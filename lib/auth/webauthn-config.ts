import "server-only";
import { brand } from "@/lib/config/brand";

/**
 * WebAuthn ties every credential to the exact origin it was registered
 * on. rpID must be a bare hostname (no scheme/port); origin must be the
 * full scheme+host[:port] the browser actually used. Passkeys registered
 * under one NEXT_PUBLIC_APP_URL will not work if the production domain
 * later changes — a WebAuthn/browser constraint, not something this app
 * can work around.
 */
export function webAuthnConfig() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { hostname, origin } = new URL(appUrl);
  return {
    rpID: hostname,
    rpName: brand.name,
    origin,
  };
}
