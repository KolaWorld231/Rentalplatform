import { CloudOff, Heart } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { PropertyWithCover } from "@/services/properties";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Saved Properties", robots: { index: false, follow: false } };

export default async function FavouritesPage() {
  const user = await requireUser("/favourites");
  const supabase = await createClient();

  const { data, error } = (await supabase
    .from("property_favourites")
    .select("property_id, properties(*, property_images(id, storage_path, is_cover))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as {
    data: { property_id: string; properties: PropertyWithCover | null }[] | null;
    error: { message: string } | null;
  };

  const properties = (data ?? [])
    .map((row) => row.properties)
    .filter((p): p is PropertyWithCover => !!p);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Saved properties</h1>

      {error ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <CloudOff className="h-10 w-10 text-charcoal-500" aria-hidden="true" />
          <p className="font-medium text-charcoal-700">We couldn&apos;t load your saved properties.</p>
          <p className="max-w-md text-sm text-charcoal-500">
            Your saved list is safe — this is a problem loading it, not a sign that it is empty.
            Please try again in a moment.
          </p>
          <Link href="/favourites" className={cn(buttonVariants({ variant: "secondary" }))}>
            Try again
          </Link>
        </Card>
      ) : properties.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <Heart className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
          <p className="font-medium text-charcoal-700">Keep the places you love in one list.</p>
          <p className="max-w-md text-sm text-charcoal-500">
            Save a property while browsing and it will show up here.
          </p>
          <Link href="/search" className={cn(buttonVariants({ variant: "primary" }))}>
            Browse properties
          </Link>
        </Card>
      ) : (
        <div className="stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} isFavourited />
          ))}
        </div>
      )}
    </div>
  );
}
