"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Mobile bottom nav (A3, B10, B15, B20): which tab a page belongs to, where
 * the bar is left out, and a small store that lets overlays and sticky
 * action bars hide it while they are on screen.
 */

export type BottomTab = "search" | "favorites" | "messages" | "account";

/** The tab to highlight for a path, or undefined for pages outside the four tabs (guides, projects…). */
export function activeBottomTab(pathname: string): BottomTab | undefined {
  if (pathname === "/" || pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/account/favorites") || pathname.startsWith("/compare")) return "favorites";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/account") || pathname.startsWith("/notifications") || pathname.startsWith("/dashboard"))
    return "account";
  return undefined;
}

/**
 * Pages that never show the bar: a chat room needs the composer at the bottom.
 * Auth pages and the post wizard live outside the site shell, so they never mount it.
 */
export function bottomNavHiddenOn(pathname: string): boolean {
  return /^\/messages\/[^/]+/.test(pathname);
}

let hiders = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hides the bottom nav while the calling component is mounted and `active` is true. */
export function useHideBottomNav(active = true) {
  useEffect(() => {
    if (!active) return;
    hiders++;
    emit();
    return () => {
      hiders--;
      emit();
    };
  }, [active]);
}

/** True while any sheet, dialog or sticky action bar asks the nav to step aside. */
export function useBottomNavSuppressed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hiders > 0,
    () => false,
  );
}

/** Drop-in for overlays: `<HideBottomNav />` inside sheet or dialog content. */
export function HideBottomNav({ active = true }: { active?: boolean }) {
  useHideBottomNav(active);
  return null;
}
