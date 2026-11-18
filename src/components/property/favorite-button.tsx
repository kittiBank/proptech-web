"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/providers/favorites-store";
import type { Property } from "@/types/property";

interface FavoriteButtonProps {
  property: Property;
  className?: string;
}

export function FavoriteButton({ property, className }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(property.id);
  const propertyTitle = property.title;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(property);
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
