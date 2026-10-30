"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavouriteAction } from "@/app/favourites/actions";
import { cn } from "@/lib/utils/cn";

export function FavouriteButton({
  propertyId,
  initialFavourited,
}: {
  propertyId: string;
  initialFavourited: boolean;
}) {
  const [favourited, setFavourited] = useState(initialFavourited);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      aria-pressed={favourited}
      aria-label={favourited ? "Remove from saved properties" : "Save property"}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          const result = await toggleFavouriteAction(propertyId);
          if ("error" in result) {
            router.push("/login");
            return;
          }
          setFavourited(result.favourited);
        });
      }}
      className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-raised)] transition-transform active:scale-95 disabled:opacity-60"
    >
      <Heart
        className={cn("h-5 w-5", favourited ? "fill-clay-500 text-clay-500" : "text-charcoal-500")}
        aria-hidden="true"
      />
    </button>
  );
}
