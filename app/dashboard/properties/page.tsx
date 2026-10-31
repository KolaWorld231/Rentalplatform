import { Home, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { formatUsd, isAvailabilityStale } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { PropertyWithCover } from "@/services/properties";

export const metadata = { title: "My Properties" };

export default async function OwnerPropertiesPage() {
  const user = await requireUser("/dashboard/properties");
  const supabase = await createClient();

  const { data: properties } = (await supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })) as { data: PropertyWithCover[] | null };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">My properties</h1>
        <Link href="/dashboard/properties/new" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
          <Plus className="h-4 w-4" />
          New listing
        </Link>
      </div>

      {!properties || properties.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <Home className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
          <p className="font-medium text-charcoal-700">You haven&apos;t listed a property yet.</p>
          <p className="max-w-md text-sm text-charcoal-500">
            Listing is free and takes a few minutes. Renters can find it as soon as you publish.
          </p>
          <Link href="/dashboard/properties/new" className={cn(buttonVariants({ variant: "primary" }))}>
            List your first property
          </Link>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {properties.map((p) => {
            const cover = p.property_images.find((i) => i.is_cover) ?? p.property_images[0];
            return (
              <Link
                key={p.id}
                href={`/dashboard/properties/${p.id}/edit`}
                className="focus-ring flex items-center gap-4 rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-raised)] hover:shadow-[var(--shadow-floating)]"
              >
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-sage-200">
                  {cover && (
                    <Image src={propertyImageUrl(cover.storage_path)} alt="" fill sizes="80px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal-700">{p.title}</p>
                  <p className="text-xs text-charcoal-400">{p.city}, {p.county}</p>
                </div>
                <p className="text-sm font-semibold text-brand-800">{formatUsd(p.rent_amount)}</p>
                <Badge variant={p.listing_status === "published" ? "success" : "neutral"}>
                  {p.listing_status.replace("_", " ")}
                </Badge>
                {p.listing_status === "published" && isAvailabilityStale(p.last_availability_confirmed_at) && (
                  <Badge variant="warning">needs reconfirmation</Badge>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
