import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const STATIC_ROUTES = [
  "",
  "/search",
  "/pricing",
  "/how-it-works",
  "/safety",
  "/about",
  "/help",
  "/legal/terms",
  "/legal/privacy",
  "/legal/subscription-terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${appUrl}${path}`,
    lastModified: new Date(),
  }));

  try {
    const supabase = await createClient();
    const { data: properties } = await supabase
      .from("properties")
      .select("slug, updated_at")
      .eq("listing_status", "published")
      .limit(1000);

    const propertyEntries: MetadataRoute.Sitemap = (properties ?? []).map((p) => ({
      url: `${appUrl}/properties/${p.slug}`,
      lastModified: new Date(p.updated_at),
    }));

    return [...staticEntries, ...propertyEntries];
  } catch {
    // No reachable Supabase instance (e.g. local build without env
    // configured) — fall back to the static routes rather than failing
    // the whole sitemap.
    return staticEntries;
  }
}
