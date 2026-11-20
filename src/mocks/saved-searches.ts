import {
  MAX_SAVED_SEARCHES,
  type CreateSavedSearchRequest,
  type SavedSearchDto,
  type UpdateSavedSearchRequest,
} from "@/types/api";

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

/** First-visit demo list for the demo account (B9), so the page is not empty in the browser. */
function demoRows(): Row[] {
  const row = (
    id: string,
    name: string,
    query: string,
    newCount: number,
    createdAt: string,
    alerts: Row["alerts"],
  ) => ({
    userId: "u-1",
    id,
    name,
    query,
    newCount,
    createdAt,
    alerts,
  });
  return [
    row(
      "ss-demo-1",
      "ซื้อคอนโด ใกล้รถไฟฟ้า 2 สถานี",
      "mode=buy&type=condo&station=E5,E6&beds=2",
      5,
      "2026-11-02T09:00:00.000Z",
      {
        email: true,
        line: true,
        frequency: "daily",
      },
    ),
    row(
      "ss-demo-2",
      "เช่าคอนโด ใกล้ BTS อารีย์",
      "mode=rent&type=condo&station=N5&price=15-30k",
      2,
      "2026-10-28T09:00:00.000Z",
      {
        email: true,
        line: false,
        frequency: "instant",
      },
    ),
    row("ss-demo-3", "ซื้อบ้านเดี่ยว", "mode=buy&type=house&price=10-20m&beds=3", 0, "2026-10-10T09:00:00.000Z", {
      email: false,
      line: false,
      frequency: "weekly",
    }),
  ];
}

function load(): Row[] {
  if (rows) return rows;
  const store = storage();
  if (!store) return (rows = []);
  try {
    const raw = store.getItem(KEY);
    rows = raw ? (JSON.parse(raw) as Row[]) : demoRows();
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

/** `undefined` when the search is not this user's. */
export function updateSavedSearch(userId: string, id: string, patch: UpdateSavedSearchRequest) {
  const row = load().find((r) => r.userId === userId && r.id === id);
  if (!row) return undefined;
  if (patch.name?.trim()) row.name = patch.name.trim();
  if (patch.alerts) row.alerts = { ...row.alerts, ...patch.alerts };
  persist();
  return strip(row);
}

export function deleteSavedSearch(userId: string, id: string): boolean {
  const before = load().length;
  rows = load().filter((r) => !(r.userId === userId && r.id === id));
  persist();
  return rows.length < before;
}

export function resetMockSavedSearches() {
  rows = [];
}
