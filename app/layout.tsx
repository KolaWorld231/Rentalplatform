import type { Metadata } from "next";
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
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.heroSupportingCopy,
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
