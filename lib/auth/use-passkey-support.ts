"use client";

import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";

/** Starts false on every render (server and first client paint must
 * match for hydration), then flips once we can safely check the
 * browser API client-side. Real device diversity in markets like
 * Liberia means this can legitimately stay false for some visitors --
 * every passkey UI element must degrade to "just not shown" rather than
 * a broken button. */
export function usePasskeySupport() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSupported(browserSupportsWebAuthn()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return supported;
}
