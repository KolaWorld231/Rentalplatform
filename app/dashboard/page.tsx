import { Eye, Heart, Home, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner Dashboard" };

export default async function DashboardOverviewPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("listing_status, view_count, favourite_count")
    .eq("owner_id", user.id);

  const total = properties?.length ?? 0;
  const published = properties?.filter((p) => p.listing_status === "published").length ?? 0;
  const drafts = properties?.filter((p) => p.listing_status === "draft").length ?? 0;
  const totalViews = properties?.reduce((sum, p) => sum + p.view_count, 0) ?? 0;
  const totalFavourites = properties?.reduce((sum, p) => sum + p.favourite_count, 0) ?? 0;

  const stats = [
    { label: "Total properties", value: total, icon: Home },
    { label: "Published", value: published, icon: Home },
    { label: "Draft", value: drafts, icon: Home },
    { label: "Total views", value: totalViews, icon: Eye },
    { label: "Total favourites", value: totalFavourites, icon: Heart },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <p className="mt-2 font-display text-2xl font-semibold text-charcoal-700">{s.value}</p>
            <p className="text-xs text-charcoal-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
          <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Inquiries
        </p>
        <p className="mt-1 text-sm text-charcoal-500">
          Direct messaging lands in a later milestone of this build — inquiries will appear here
          once it&apos;s live.
        </p>
      </Card>

      <div className="mt-6">
        <Link href="/dashboard/properties" className="text-sm font-medium text-brand-700">
          Manage your properties →
        </Link>
      </div>
    </div>
  );
}
