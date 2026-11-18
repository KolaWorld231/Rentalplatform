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
      className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-raised)] transition-transform duration-[var(--motion-fast)] ease-standard hover:scale-110 active:scale-90 motion-reduce:transition-none motion-reduce:hover:scale-100 disabled:opacity-60"
    >
      {/*
        Saving is the one irreversible-feeling action on a card, so it
        gets a beat of its own rather than a plain colour swap. The pop
        plays only on the transition into saved -- replaying it on
        un-save would celebrate the wrong thing -- and it is keyed on
        the state so React restarts the animation each time.
      */}
      <Heart
        key={favourited ? "saved" : "unsaved"}
        className={cn(
          "h-5 w-5 transition-colors duration-[var(--motion-base)] ease-standard motion-reduce:transition-none",
          favourited ? "animate-heart-pop fill-accent text-accent-text" : "text-charcoal-500",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
