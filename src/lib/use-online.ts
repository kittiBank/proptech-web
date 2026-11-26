"use client";

import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

/**
 * Whether the browser has a connection, as TanStack Query sees it: queries and mutations pause
 * while offline and resume on their own, so the UI and the cache agree. `true` on the server.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
    () => true,
  );
}
