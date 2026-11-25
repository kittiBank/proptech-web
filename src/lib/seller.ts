import { listingStatuses } from "@/lib/status";
import { slotIso, slotParts } from "@/lib/viewing";
import type {
  AppointmentDto,
  AvailabilityDto,
  BoostKind,
  BoostOptionDto,
  ListSellerListingsQuery,
  OverviewRange,
  SellerListingDto,
  SellerListingSort,
  SellerListingTab,
  SellerPlan,
} from "@/types/api";
import type { ListingMode } from "@/types/property";

/**
 * Seller dashboard (C8–C14): package limits and boost prices (handoff §6),
 * the listings page URL state, row labels, the weekly viewing calendar and
 * what a boost will cost.
 */

const TZ = "Asia/Bangkok";
const DAY = 86_400_000;

export const PLANS: Record<
  SellerPlan,
  { name: string; price: number; listings: number; bumps: number; featured: number }
> = {
  free: { name: "ฟรี", price: 0, listings: 2, bumps: 0, featured: 0 },
  agent_pro: { name: "นายหน้า Pro", price: 1290, listings: 60, bumps: 120, featured: 5 },
  agency: { name: "Agency", price: 3290, listings: 300, bumps: 600, featured: 25 },
};

/** Boost products, VAT included (handoff §6). */
export const BOOST_CATALOG: Omit<BoostOptionDto, "packageLeft" | "slotsLeft">[] = [
  { kind: "bump", title: "ดันประกาศ 1 ครั้ง", description: "ขึ้นบนสุดของผลค้นหาทันที", price: 49 },
  {
    kind: "auto_bump",
    title: "ดันอัตโนมัติ 7 วัน",
    description: "ดันทุกวัน 08:00 รวม 7 ครั้ง",
    price: 199,
    days: 7,
  },
  {
    kind: "featured",
    title: "ประกาศแนะนำ 14 วัน",
    description: "อยู่ในแถบแนะนำ มีป้าย “แนะนำ” และดันอัตโนมัติ",
    price: 590,
    days: 14,
    estimate: "ประกาศแนะนำได้ยอดเข้าชมเพิ่มเฉลี่ย 2.6 เท่าใน 14 วัน",
  },
  {
    kind: "homepage_pin",
    title: "ปักหมุดหน้าแรก 7 วัน",
    description: "ไฮไลต์บนหน้าแรก จำกัด 24 ประกาศต่อวัน",
    price: 1490,
    days: 7,
  },
];

/** How many listings the package covers and what the rest costs. */
export function coverage(option: Pick<BoostOptionDto, "price" | "packageLeft">, count: number) {
  const covered = Math.min(count, Math.max(0, option.packageLeft ?? 0));
  return { covered, charge: (count - covered) * option.price, fullPrice: count * option.price };
}

// --- Dates ---------------------------------------------------------------------

const thaiDate = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const thaiDayMonth = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, day: "numeric", month: "short" });

/** "30 พ.ย. 2569" (Buddhist-era year). */
export const formatThaiDate = (iso: string) => thaiDate.format(new Date(iso));
/** "25 ธ.ค." */
export const formatDayMonth = (iso: string) => thaiDayMonth.format(new Date(iso));

/** Whole days until `iso` (rounded up), never below 0. */
export const daysUntil = (iso: string, now = Date.now()) => Math.max(0, Math.ceil((Date.parse(iso) - now) / DAY));

/** Hours until `iso` (negative once it has passed). */
export const hoursUntil = (iso: string, now = Date.now()) => (Date.parse(iso) - now) / 3_600_000;

/** "5 ชม." / "2 วัน" left, for countdowns such as a request's expiry. */
export function formatCountdown(iso: string, now = Date.now()): string {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return "หมดเวลาแล้ว";
  const hours = Math.ceil(ms / 3_600_000);
  return hours < 24 ? `${hours} ชม.` : `${Math.ceil(hours / 24)} วัน`;
}

// --- Listing rows --------------------------------------------------------------

export const promotionLabels: Record<BoostKind, string> = {
  bump: "ดันประกาศ",
  auto_bump: "ดันอัตโนมัติ",
  featured: "แนะนำ",
  homepage_pin: "ปักหมุดหน้าแรก",
};

/** The promotion column: what is running, or a note about the listing's state. */
export function promotionNote(
  l: SellerListingDto,
  now = Date.now(),
): { text: string; tone: "violet" | "warning" | "danger" | "muted" } | undefined {
  if (l.promotion) {
    return {
      text: `${promotionLabels[l.promotion.kind]} เหลือ ${daysUntil(l.promotion.endsAt, now)} วัน`,
      tone: "violet",
    };
  }
  if (l.status === "published" && l.expiresAt && daysUntil(l.expiresAt, now) <= 3) {
    return { text: `หมดอายุใน ${daysUntil(l.expiresAt, now)} วัน`, tone: "warning" };
  }
  if (l.status === "published" && l.lastBumpedAt) {
    return { text: `ดันล่าสุด ${slotParts(l.lastBumpedAt).time}`, tone: "muted" };
  }
  if (l.status === "rejected" && l.rejectReason) return { text: l.rejectReason, tone: "danger" };
  if (l.status === "draft" && l.draftProgress !== undefined) {
    return { text: `ถึงขั้นที่ ${Math.min(5, l.draftProgress + 1)} จาก 5`, tone: "muted" };
  }
  return undefined;
}

/** Only live listings can be promoted; the charge starts once a listing has passed review (handoff §6). */
export const canPromote = (l: Pick<SellerListingDto, "status">) => l.status === "published";
export const canRenew = (l: Pick<SellerListingDto, "status">) => l.status === "published" || l.status === "expired";
export const canClose = (l: Pick<SellerListingDto, "status" | "draftId">) => l.status !== "closed" && !l.draftId;

const csvCell = (v: string | number | undefined) => {
  const text = v === undefined ? "" : String(v);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** "ส่งออก CSV": one row per listing; a BOM so Excel reads the Thai text as UTF-8. */
export function listingsCsv(rows: SellerListingDto[]): string {
  const header = ["รหัส", "ชื่อประกาศ", "ประเภท", "สถานะ", "ราคา", "เข้าชม 7 วัน", "ผู้สนใจ", "หมดอายุ"];
  const lines = rows.map((l) =>
    [
      l.code,
      l.title,
      l.mode === "rent" ? "เช่า" : "ขาย",
      listingStatuses[l.status].label,
      l.price,
      l.views7d,
      l.leads,
      l.expiresAt ? slotParts(l.expiresAt).date : undefined,
    ]
      .map(csvCell)
      .join(","),
  );
  return `\uFEFF${[header.join(","), ...lines].join("\r\n")}`;
}

// --- URL state of /dashboard/listings -------------------------------------------

export interface SellerListingsState {
  status: SellerListingTab;
  q: string;
  mode: ListingMode | "all";
  sort: SellerListingSort;
  page: number;
  /** Listing ids whose boost dialog is open (`?boost=id1,id2`). */
  boost: string[];
}

export const listingTabs: { value: SellerListingTab; label: string; short: string }[] = [
  { value: "all", label: "ทั้งหมด", short: "ทั้งหมด" },
  { value: "published", label: "เผยแพร่", short: "เผยแพร่" },
  { value: "pending_review", label: "รอตรวจสอบ", short: "รอตรวจ" },
  { value: "rejected", label: "ไม่ผ่าน", short: "ไม่ผ่าน" },
  { value: "draft", label: "แบบร่าง", short: "แบบร่าง" },
  { value: "expired", label: "หมดอายุ", short: "หมดอายุ" },
  { value: "closed", label: "ปิดแล้ว", short: "ปิดแล้ว" },
];

export const listingSortOptions: { value: SellerListingSort; label: string }[] = [
  { value: "-views", label: "เข้าชมมากสุด" },
  { value: "-leads", label: "ผู้สนใจมากสุด" },
  { value: "-updatedAt", label: "แก้ไขล่าสุด" },
  { value: "expiresAt", label: "ใกล้หมดอายุ" },
];

export const listingModeOptions: { value: SellerListingsState["mode"]; label: string }[] = [
  { value: "all", label: "ขายและเช่า" },
  { value: "buy", label: "ขาย" },
  { value: "rent", label: "เช่า" },
];

export const defaultListingsState: SellerListingsState = {
  status: "all",
  q: "",
  mode: "all",
  sort: "-views",
  page: 1,
  boost: [],
};

function pick<T extends string>(value: string | null, allowed: readonly { value: T }[], fallback: T): T {
  return allowed.some((o) => o.value === value) ? (value as T) : fallback;
}

export function parseListingsParams(params: Pick<URLSearchParams, "get">): SellerListingsState {
  const page = Number(params.get("page"));
  return {
    status: pick(params.get("status"), listingTabs, "all"),
    q: params.get("q")?.trim().slice(0, 80) ?? "",
    mode: pick(params.get("mode"), listingModeOptions, "all"),
    sort: pick(params.get("sort"), listingSortOptions, "-views"),
    page: Number.isInteger(page) && page > 1 ? page : 1,
    boost: (params.get("boost") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50),
  };
}

/** Only non-default values, so the plain page stays `/dashboard/listings`. */
export function toListingsQueryString(state: SellerListingsState): string {
  const params = new URLSearchParams();
  if (state.status !== "all") params.set("status", state.status);
  if (state.q) params.set("q", state.q);
  if (state.mode !== "all") params.set("mode", state.mode);
  if (state.sort !== defaultListingsState.sort) params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  // Commas stay readable in the address bar: `?boost=id1,id2`.
  const query = params.toString();
  const boost = state.boost.length ? `boost=${state.boost.map(encodeURIComponent).join(",")}` : "";
  return [query, boost].filter(Boolean).join("&");
}

/** Filter changes go back to page 1; a page change or boost keeps the filters. */
export function updateListingsState(
  state: SellerListingsState,
  change: Partial<SellerListingsState>,
): SellerListingsState {
  const keepsPage = Object.keys(change).every((k) => k === "page" || k === "boost");
  return { ...state, ...(keepsPage ? {} : { page: 1 }), ...change };
}

export function toListingsApiQuery(state: SellerListingsState, limit: number): ListSellerListingsQuery {
  return {
    status: state.status,
    q: state.q || undefined,
    mode: state.mode === "all" ? undefined : state.mode,
    sort: state.sort,
    page: state.page,
    limit,
  };
}

/** `/dashboard/listings?boost=…` from anywhere (overview "โปรโมต", row buttons). */
export const boostHref = (ids: string[]) => `/dashboard/listings?boost=${ids.map(encodeURIComponent).join(",")}`;

export const overviewRanges: { value: OverviewRange; label: string }[] = [
  { value: 14, label: "14 วัน" },
  { value: 30, label: "30 วัน" },
  { value: 90, label: "90 วัน" },
];

// --- Leads: viewing calendar and conflicts ---------------------------------------

/** Monday (Bangkok) of the week containing `iso`, as "2026-11-23". */
export function weekStart(iso: string): string {
  const { date } = slotParts(iso);
  const day = new Date(`${date}T00:00:00Z`);
  const back = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - back * DAY).toISOString().slice(0, 10);
}

/** The seven days of the week starting on `monday`. */
export function weekDays(monday: string): string[] {
  const start = Date.parse(`${monday}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => new Date(start + i * DAY).toISOString().slice(0, 10));
}

export const shiftWeek = (monday: string, weeks: number) =>
  new Date(Date.parse(`${monday}T00:00:00Z`) + weeks * 7 * DAY).toISOString().slice(0, 10);

const shortWeekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/** "จ. 17" for a calendar column. */
export function weekdayLabel(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return `${shortWeekdays[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** "17 ถึง 23 พ.ย." for the calendar heading (month taken from the last day). */
export function weekRangeLabel(monday: string) {
  const days = weekDays(monday);
  const first = new Date(`${days[0]}T00:00:00Z`).getUTCDate();
  return `${first} ถึง ${formatDayMonth(slotIso(days[6], "12:00"))}`;
}

/** Calendar entries per day: confirmed and still-pending lister viewings. */
export function calendarEntries(viewings: AppointmentDto[], monday: string) {
  const days = weekDays(monday);
  return days.map((date) => ({
    date,
    items: viewings
      .filter(
        (v) =>
          v.role === "lister" &&
          (v.status === "confirmed" || v.status === "requested") &&
          slotParts(v.slot).date === date,
      )
      .sort((a, b) => a.slot.localeCompare(b.slot)),
  }));
}

/** A request whose first choice is already taken by a confirmed viewing of mine. */
export function clashesWithConfirmed(request: AppointmentDto, all: AppointmentDto[]): boolean {
  return all.some(
    (v) =>
      v.id !== request.id &&
      v.role === "lister" &&
      v.status === "confirmed" &&
      Date.parse(v.slot) === Date.parse(request.slot),
  );
}

// --- Availability ------------------------------------------------------------------

export const availabilityHours = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);
export const gapOptions = [0, 30, 60, 90, 120];

export function formatRange(range: AvailabilityDto["weekdays"]) {
  return range ? `${range.start} ถึง ${range.end}` : "ไม่รับนัด";
}
