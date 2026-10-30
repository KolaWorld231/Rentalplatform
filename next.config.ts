import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

// Deliberately permissive on 'unsafe-inline' for style-src (Tailwind/Next
// inject inline styles) and script-src needs 'unsafe-inline' + 'unsafe-eval'
// for Next's dev/HMR runtime; tightening script-src with nonces is a
// reasonable follow-up once this is running behind real hosting.
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`.trim(),
  "img-src 'self' data: https: http://127.0.0.1:54321",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
};

export default nextConfig;
