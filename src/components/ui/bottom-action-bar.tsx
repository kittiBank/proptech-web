"use client";

import type { ReactNode } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav";
import { cn } from "@/lib/utils";

interface BottomActionBarProps {
  children: ReactNode;
  /** Names the region for screen readers, e.g. "ติดต่อผู้ลงประกาศ". */
  label: string;
  /** Show from this breakpoint down only; most bars are a phone pattern. */
  hideFrom?: "sm" | "md" | "lg" | "none";
  className?: string;
}

const hide = { sm: "sm:hidden", md: "md:hidden", lg: "lg:hidden", none: "" } as const;

/**
 * Sticky bottom bar for the page's main actions (A8, A9, C7, B18): white,
 * hairline on top, 12px/16px padding and at least the safe area below. Leave room for it
 * with `pb-24` (or similar) on the page so it never covers content.
 * While it is mounted the phone bottom nav steps aside (one bar at a time).
 */
export function BottomActionBar({ children, label, hideFrom = "lg", className }: BottomActionBarProps) {
  useHideBottomNav();
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]",
        hide[hideFrom],
        className,
      )}
    >
      {children}
    </div>
  );
}
