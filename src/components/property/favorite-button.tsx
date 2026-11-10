"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/providers/favorites-store";

interface FavoriteButtonProps {
  propertyId: string;
  propertyTitle: string;
  className?: string;
}

export function FavoriteButton({ propertyId, propertyTitle, className }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(propertyId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(propertyId);
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
