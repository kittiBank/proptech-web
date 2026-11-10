"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Favorites live in localStorage until accounts exist; the API swap is
 * `POST/DELETE /me/favorites/:id` inside `toggle`.
 */
const STORAGE_KEY = "propertyhub:favorites";
const EMPTY: readonly string[] = [];

let favorites: readonly string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) favorites = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    favorites = EMPTY;
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Storage unavailable (private mode); favorites stay in memory.
  }
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  listener();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return favorites;
}

function getServerSnapshot() {
  return EMPTY;
}

export function toggleFavorite(id: string) {
  favorites = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
  persist();
  listeners.forEach((l) => l());
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);
  return { ids, count: ids.length, isFavorite, toggle: toggleFavorite };
}
