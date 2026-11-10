"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/providers/favorites-store";

export function FavoritesLink({ className }: { className?: string }) {
  const { count } = useFavorites();
  return (
    <Link
      href="/favorites"
      className={cn(
        "relative inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-mist",
        className,
      )}
      aria-label={count > 0 ? `รายการโปรด ${count} รายการ` : "รายการโปรด"}
    >
      <Heart className={cn("size-5", count > 0 && "fill-brand text-brand")} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute top-1.5 right-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[11px] leading-[18px] font-semibold text-white tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
