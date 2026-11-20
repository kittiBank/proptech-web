import { MAX_SAVED_SEARCHES, type CreateSavedSearchRequest, type SavedSearchDto } from "@/types/api";

/**
 * Saved searches for the signed-in user, behind `/me/saved-searches`.
 * localStorage in the browser so they survive a reload; in memory under tests.
 */

type Row = SavedSearchDto & { userId: string };

const KEY = "propertyhub:mock:saved-searches";
let rows: Row[] | undefined;

const storage = () => {
  try {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "test" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function load(): Row[] {
  if (rows) return rows;
  try {
    rows = JSON.parse(storage()?.getItem(KEY) ?? "[]") as Row[];
  } catch {
    rows = [];
  }
  return rows;
}

function persist() {
  try {
    storage()?.setItem(KEY, JSON.stringify(rows));
  } catch {
    // Memory only.
  }
}

function strip(row: Row): SavedSearchDto {
  const { userId, ...dto } = row;
  void userId;
  return dto;
}

export function listSavedSearches(userId: string): SavedSearchDto[] {
  return load()
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(strip);
}

export type CreateResult = { kind: "created" | "existing"; search: SavedSearchDto } | { kind: "limit" };

/** Same query twice returns the first one; the 11th distinct search is refused. */
export function createSavedSearch(userId: string, body: CreateSavedSearchRequest): CreateResult {
  const mine = load().filter((r) => r.userId === userId);
  const existing = mine.find((r) => r.query === body.query);
  if (existing) return { kind: "existing", search: strip(existing) };
  if (mine.length >= MAX_SAVED_SEARCHES) return { kind: "limit" };
  const row: Row = {
    userId,
    id: `ss-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: body.name,
    query: body.query,
    alerts: { email: true, line: false, frequency: "daily" },
    newCount: 0,
    createdAt: new Date().toISOString(),
  };
  load().push(row);
  persist();
  return { kind: "created", search: strip(row) };
}

export function resetMockSavedSearches() {
  rows = [];
}
