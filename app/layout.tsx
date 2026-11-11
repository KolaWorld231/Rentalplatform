import type { Metadata, Viewport } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header, MobileTabBar } from "@/components/layout/Header";
import { brand } from "@/lib/config/brand";
import { getCurrentUser } from "@/lib/auth/session";

const interfaceFont = Manrope({
  variable: "--font-interface",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.heroSupportingCopy,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.heroSupportingCopy,
    images: [{ url: "/og-image-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.heroSupportingCopy,
    images: ["/og-image-1200x630.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#da1a32",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${interfaceFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ivory-100 text-charcoal-700">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-floating)]"
        >
          Skip to content
        </a>
        <Header isAuthenticated={!!user} />
        <main id="main-content" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  );
}
