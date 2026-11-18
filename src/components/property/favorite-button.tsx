"use client";

import { Heart } from "lucide-react";
import { useAuthGate, useResumeAction } from "@/lib/auth-gate";
import { formatListingPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/providers/favorites-store";
import type { Property } from "@/types/property";

interface FavoriteButtonProps {
  property: Property;
  className?: string;
}

export function FavoriteButton({ property, className }: FavoriteButtonProps) {
  const { isFavorite, toggle, save } = useFavorites();
  const requireAuth = useAuthGate();
  const active = isFavorite(property.id);
  // Signed in from the login modal: save the listing the visitor tapped.
  useResumeAction("favorite", property.id, () => save(property));
  const propertyTitle = property.title;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        requireAuth(
          {
            intent: "favorite",
            key: property.id,
            preview: {
              title: property.title,
              subtitle: [
                formatListingPrice(property.price, property.mode),
                property.station && `${property.station.name}`,
              ]
                .filter(Boolean)
                .join("  "),
              image: property.image,
            },
          },
          () => toggle(property),
        );
      }}
      aria-pressed={active}
      aria-label={active ? `นำ ${propertyTitle} ออกจากรายการโปรด` : `บันทึก ${propertyTitle} ในรายการโปรด`}
      className={cn(
        "group/fav inline-flex size-10 items-center justify-center rounded-full bg-white text-ink transition-colors hover:text-brand",
        active && "text-brand",
        className,
      )}
    >
      <Heart
        className={cn("size-[18px] transition-transform group-active/fav:scale-90", active && "fill-brand")}
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  );
}
