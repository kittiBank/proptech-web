import type { FavoriteDto } from "@/types/api";
import { closedListingIds, findListingById } from "./db";

/**
 * The signed-in user's saved listings, behind `/me/favorites`.
 *
 * MSW resolves requests on the page's own thread, so in the browser the list
 * is kept in localStorage and survives reloads, like a real account would.
 * Tests and Node get a plain in-memory list (reset between tests).
 */

interface Row {
  propertyId: string;
  savedAt: string;
  savedPrice: number;
  note: string;
}

const STORAGE_KEY = "propertyhub:mock:favorites";
/** Ids saved by the old localStorage-only favorites; migrated on first load. */
const LEGACY_KEY = "propertyhub:favorites";

/**
 * First-visit demo list, so the price-drop and closed states are visible
 * without setup. Removing items sticks: the seed only applies once.
 */
function demoRows(): Row[] {
  const day = 86_400_000;
  const at = (daysAgo: number) => new Date(Date.UTC(2026, 10, 10) - daysAgo * day).toISOString();
  const price = (id: string) => findListingById(id)?.price ?? 0;
  return [
    { propertyId: "p-1003", savedAt: at(3), savedPrice: price("p-1003") + 300_000, note: "ห้องมุม ถามเรื่องที่จอดรถ" },
    { propertyId: "p-1001", savedAt: at(5), savedPrice: price("p-1001"), note: "" },
    { propertyId: "p-1004", savedAt: at(7), savedPrice: price("p-1004"), note: "นัดดูห้องเสาร์นี้ 10:00" },
    { propertyId: "p-1006", savedAt: at(8), savedPrice: price("p-1006"), note: "" },
    { propertyId: "g-2010", savedAt: at(14), savedPrice: price("g-2010"), note: "" },
    { propertyId: "p-1002", savedAt: at(21), savedPrice: price("p-1002"), note: "" },
  ].filter((r) => r.savedPrice > 0);
}

let rows: Row[] | undefined;

function storage(): Storage | undefined {
  try {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "test" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function load(): Row[] {
  if (rows) return rows;
  const store = storage();
  if (!store) return (rows = []);
  try {
    const saved = store.getItem(STORAGE_KEY);
    if (saved) return (rows = JSON.parse(saved) as Row[]);
    const legacy = JSON.parse(store.getItem(LEGACY_KEY) ?? "[]") as unknown;
    const now = new Date().toISOString();
    rows =
      Array.isArray(legacy) && legacy.length > 0
        ? legacy
            .filter((id): id is string => typeof id === "string" && Boolean(findListingById(id)))
            .map((id) => ({ propertyId: id, savedAt: now, savedPrice: findListingById(id)!.price, note: "" }))
        : demoRows();
  } catch {
    rows = demoRows();
  }
  persist();
  return rows;
}

function persist() {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(rows ?? []));
  } catch {
    // Private mode: the list lives in memory until reload.
  }
}

function toDto(row: Row): FavoriteDto | undefined {
  const property = findListingById(row.propertyId);
  if (!property) return undefined;
  return {
    property,
    savedAt: row.savedAt,
    savedPrice: row.savedPrice,
    note: row.note,
    status: closedListingIds.has(property.id) ? "closed" : "active",
  };
}

export function listFavorites(): FavoriteDto[] {
  return [...load()]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map(toDto)
    .filter((f): f is FavoriteDto => Boolean(f));
}

/** `undefined` = no such listing. `created` tells 201 from 200. */
export function saveFavorite(propertyId: string): { favorite: FavoriteDto; created: boolean } | undefined {
  const property = findListingById(propertyId);
  if (!property) return undefined;
  const list = load();
  const existing = list.find((r) => r.propertyId === propertyId);
  if (existing) return { favorite: toDto(existing)!, created: false };
  const row = { propertyId, savedAt: new Date().toISOString(), savedPrice: property.price, note: "" };
  list.push(row);
  persist();
  return { favorite: toDto(row)!, created: true };
}

/** `undefined` = not in favorites. */
export function updateFavoriteNote(propertyId: string, note: string): FavoriteDto | undefined {
  const row = load().find((r) => r.propertyId === propertyId);
  if (!row) return undefined;
  row.note = note;
  persist();
  return toDto(row);
}

export function removeFavorite(propertyId: string) {
  rows = load().filter((r) => r.propertyId !== propertyId);
  persist();
}

/** Tests: start from a known list (default empty). */
export function resetMockFavorites(next: Row[] = []) {
  rows = next.map((r) => ({ ...r }));
}

/** Tests: the first-visit demo list. */
export function seedDemoFavorites() {
  rows = demoRows();
}
