"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` while React hydrates this component (and on the server), `true` from then on, and
 * straight away for components mounted later. Lets client-only state wait until the markup
 * matches the server's.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
