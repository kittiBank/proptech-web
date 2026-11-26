"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, ticking every `intervalMs`. `null` during the server render and hydration,
 * so time-dependent text never mismatches; callers show a neutral placeholder until then.
 */
export function useNow(intervalMs = 30_000): number | null {
  return useSyncExternalStore(
    (notify) => {
      const id = window.setInterval(notify, intervalMs);
      return () => window.clearInterval(id);
    },
    // Rounded to the interval so the snapshot stays stable between ticks.
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
}
