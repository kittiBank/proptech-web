import { postSteps } from "@/lib/post-wizard";
import { BOOST_CATALOG, PLANS, coverage, formatThaiDate } from "@/lib/seller";
import { slotParts } from "@/lib/viewing";
import {
  SELLER_LISTINGS_DEFAULT_LIMIT,
  type AvailabilityDto,
  type BillingCycle,
  type BoostKind,
  type SellerPlan,
  type BoostOptionDto,
  type BulkListingsRequest,
  type LeadChannel,
  type LeadDto,
  type ListSellerListingsQuery,
  type ListSellerListingsResponse,
  type OverviewRange,
  type PromoteListingsRequest,
  type PromoteListingsResponse,
  type SellerAccountDto,
  type SellerListingDto,
  type SellerListingStatus,
  type SellerListingTab,
  type SellerOverviewDto,
} from "@/types/api";
import { sellerSourceListings } from "./db";
import { listDrafts, listSubmissions } from "./drafts";
import { listAppointments, listThreads } from "./inbox";

/**
 * The lister workspace behind `/me/seller`, `/me/listings`, `/me/leads` and
 * `/me/availability` (C8–C11, C14). Each account starts with the same demo
 * Agent Pro workspace dated relative to "now"; real wizard drafts and
 * submissions from `drafts.ts` are listed alongside it.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const LISTING_DAYS = 60;

interface Workspace {
  listings: SellerListingDto[];
  credit: number;
  bumpsUsed: number;
  availability: AvailabilityDto;
  seededAt: number;
  plan: SellerPlan;
  cycle: BillingCycle;
  autoRenew: boolean;
  /** Next charge, or the end of the plan once auto-renew is off. */
  renewsAt: string;
}

/** End of the current Bangkok month, 10:00. */
function endOfMonth(now: number) {
  const { date } = slotParts(new Date(now).toISOString());
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0, 3)).toISOString();
}

const KEY = "propertyhub:mock:seller";
let store: Record<string, Workspace> | undefined;

const storage = () => {
  try {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "test" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function load() {
  if (store) return store;
  try {
    store = JSON.parse(storage()?.getItem(KEY) ?? "{}") as Record<string, Workspace>;
  } catch {
    store = {};
  }
  return store;
}

function persist() {
  try {
    storage()?.setItem(KEY, JSON.stringify(store));
  } catch {
    // Memory only.
  }
}

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Status of the n-th demo listing: 41 live, 2 in review, 1 rejected, 5 expired, 12 closed. */
function seedStatus(i: number): SellerListingStatus {
  if (i < 41) return "published";
  if (i < 43) return "pending_review";
  if (i < 44) return "rejected";
  if (i < 49) return "expired";
  return "closed";
}

export const DEFAULT_AVAILABILITY: AvailabilityDto = {
  weekdays: { start: "17:00", end: "20:00" },
  weekend: { start: "09:00", end: "19:00" },
  gapMinutes: 60,
};

function seed(now: number): Workspace {
  const iso = (offset: number) => new Date(now + offset).toISOString();
  const today8 = (() => {
    const { date } = slotParts(new Date(now).toISOString());
    const t = Date.parse(`${date}T08:00:00+07:00`);
    return new Date(t <= now ? t : t - DAY).toISOString();
  })();
  const expiringSoon = new Set([2, 5, 9, 11, 14]);
  const featured: Record<number, number> = { 0: 12, 3: 6, 7: 9 };

  const listings = sellerSourceListings(61).map((p, i): SellerListingDto => {
    const status = seedStatus(i);
    const h = hash(p.id);
    const live = status === "published";
    const views7d = live ? Math.round(1300 * 0.92 ** i) + (h % 37) : 0;
    const rate = 0.008 + (h % 32) / 1000;
    const leads = live ? Math.max(0, Math.round(views7d * rate)) : 0;
    const row: SellerListingDto = {
      id: `sl-${p.id}`,
      code: `PH-${1000 + ((h + i) % 9000)}`,
      slug: p.slug,
      title: p.title,
      mode: p.mode,
      price: p.price,
      image: p.image,
      status,
      views7d,
      leads,
      contactRate: views7d ? leads / views7d : 0,
      updatedAt: iso(-(i + 1) * 5 * HOUR),
    };
    if (live) {
      row.expiresAt = expiringSoon.has(i) ? iso(2 * DAY + i * HOUR) : iso((10 + (h % 48)) * DAY);
      if (featured[i]) row.promotion = { kind: "featured", endsAt: iso(featured[i] * DAY) };
      if (i === 1) row.lastBumpedAt = today8;
    }
    if (status === "expired") row.expiresAt = iso(-(i - 40) * DAY);
    if (status === "pending_review") row.submittedAt = iso(-(i === 41 ? 40 / 60 : 3) * HOUR);
    if (status === "rejected") row.rejectReason = "รูปมีลายน้ำของเว็บอื่น";
    return row;
  });

  return {
    listings,
    credit: 1250,
    bumpsUsed: 82,
    availability: DEFAULT_AVAILABILITY,
    seededAt: now,
    plan: "agent_pro",
    cycle: "monthly",
    autoRenew: true,
    renewsAt: endOfMonth(now),
  };
}

function workspace(userId: string, now = Date.now()): Workspace {
  const all = load();
  all[userId] ??= seed(now);
  const ws = all[userId];
  // Workspaces saved before billing existed (FE-15) lack the plan fields.
  ws.plan ??= "agent_pro";
  ws.cycle ??= "monthly";
  ws.autoRenew ??= true;
  ws.renewsAt ??= endOfMonth(now);
  // Time moves on: live listings past their date expire, promotions end.
  for (const l of ws.listings) {
    if (l.status === "published" && l.expiresAt && Date.parse(l.expiresAt) <= now) l.status = "expired";
    if (l.promotion && Date.parse(l.promotion.endsAt) <= now) l.promotion = undefined;
  }
  return ws;
}

/** Real wizard drafts and submissions, as dashboard rows. */
function wizardRows(userId: string): SellerListingDto[] {
  const drafts = listDrafts(userId).map((d): SellerListingDto => {
    const next = postSteps.find((s) => !d.completedSteps.includes(s.id)) ?? postSteps.at(-1)!;
    return {
      id: d.id,
      title: d.values.title?.trim() || d.values.projectName || "แบบร่างไม่มีชื่อ",
      mode: d.values.deal === "rent" ? "rent" : "buy",
      price: d.values.deal === "rent" ? d.values.rentPrice : d.values.price,
      image: d.values.photos[0] ? { src: d.values.photos[0].url, alt: d.values.photos[0].name } : undefined,
      status: "draft",
      views7d: 0,
      leads: 0,
      contactRate: 0,
      draftId: d.id,
      draftStep: next.id,
      draftProgress: d.completedSteps.length,
      updatedAt: d.updatedAt,
    };
  });
  const submitted = listSubmissions(userId).map((s): SellerListingDto => ({
    id: s.id,
    code: s.code,
    title: s.values.title ?? s.code,
    mode: s.values.deal === "rent" ? "rent" : "buy",
    price: s.values.deal === "rent" ? s.values.rentPrice : s.values.price,
    image: s.values.photos[0] ? { src: s.values.photos[0].url, alt: s.values.photos[0].name } : undefined,
    status: "pending_review",
    views7d: 0,
    leads: 0,
    contactRate: 0,
    submittedAt: s.submittedAt,
    updatedAt: s.submittedAt,
  }));
  return [...drafts, ...submitted];
}

function allRows(userId: string, now = Date.now()) {
  return [...wizardRows(userId), ...workspace(userId, now).listings];
}

// --- Account -----------------------------------------------------------------

const listerViewings = (userId: string) => listAppointments(userId).filter((a) => a.role === "lister");

export function sellerAccount(userId: string, now = Date.now()): SellerAccountDto {
  const ws = workspace(userId, now);
  const plan = PLANS[ws.plan];
  const live = ws.listings.filter((l) => l.status === "published").length;
  const featuredUsed = ws.listings.filter((l) => l.promotion?.kind === "featured").length;
  return {
    plan: ws.plan,
    planName: plan.name,
    kycStatus: "approved",
    renewsAt: ws.renewsAt,
    autoRenew: ws.autoRenew,
    credit: ws.credit,
    usage: {
      listings: { used: live, limit: plan.listings },
      bumps: { used: ws.bumpsUsed, limit: plan.bumps },
      featured: { used: featuredUsed, limit: plan.featured },
    },
    pendingViewings: listerViewings(userId).filter((v) => v.status === "requested").length,
  };
}

/** Billing: the plan, its cycle and renewal. */
export function planState(userId: string, now = Date.now()) {
  const ws = workspace(userId, now);
  return { plan: ws.plan, cycle: ws.cycle, autoRenew: ws.autoRenew, renewsAt: ws.renewsAt, credit: ws.credit };
}

/** A paid plan order: switch plan and start a new period from now. */
export function startPlan(userId: string, plan: SellerPlan, cycle: BillingCycle, now = Date.now()) {
  const ws = workspace(userId, now);
  const end = new Date(now);
  if (cycle === "yearly") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  Object.assign(ws, { plan, cycle, autoRenew: true, renewsAt: end.toISOString() });
  persist();
}

export function setAutoRenew(userId: string, autoRenew: boolean) {
  workspace(userId).autoRenew = autoRenew;
  persist();
}

/** Adds (top-up, refund) or takes (payment) credit; `false` when there is not enough. */
export function changeCredit(userId: string, delta: number): boolean {
  const ws = workspace(userId);
  if (ws.credit + delta < 0) return false;
  ws.credit = Math.round((ws.credit + delta) * 100) / 100;
  persist();
  return true;
}

/** A paid promotion order: run it on the listings that are still live. */
export function applyPaidPromotion(userId: string, ids: string[], kind: BoostKind, now = Date.now()) {
  const ws = workspace(userId, now);
  const option = BOOST_CATALOG.find((o) => o.kind === kind);
  const at = new Date(now).toISOString();
  for (const l of ws.listings) {
    if (!ids.includes(l.id) || l.status !== "published") continue;
    if (kind === "bump") l.lastBumpedAt = at;
    else l.promotion = { kind, endsAt: new Date(now + (option?.days ?? 7) * DAY).toISOString() };
    l.updatedAt = at;
  }
  persist();
}

/** Titles for an order line, e.g. a promotion's listings. */
export function listingTitles(userId: string, ids: string[]) {
  return workspace(userId)
    .listings.filter((l) => ids.includes(l.id))
    .map((l) => l.title);
}

// --- Listings ----------------------------------------------------------------

const tabs: SellerListingTab[] = ["all", "published", "pending_review", "rejected", "draft", "expired", "closed"];

export function listSellerListings(
  userId: string,
  query: ListSellerListingsQuery,
  now = Date.now(),
): ListSellerListingsResponse {
  const q = query.q?.trim().toLowerCase();
  const ids = query.ids?.split(",").filter(Boolean);
  const base = allRows(userId, now).filter(
    (l) =>
      (!ids || ids.includes(l.id)) &&
      (!query.mode || l.mode === query.mode) &&
      (!q || l.title.toLowerCase().includes(q) || l.code?.toLowerCase().includes(q)),
  );
  const counts = Object.fromEntries(
    tabs.map((t) => [t, t === "all" ? base.length : base.filter((l) => l.status === t).length]),
  ) as Record<SellerListingTab, number>;
  const status = query.status ?? "all";
  const rows = base.filter((l) => status === "all" || l.status === status);

  const sort = query.sort ?? "-views";
  rows.sort((a, b) => {
    if (sort === "-leads") return b.leads - a.leads || b.views7d - a.views7d;
    if (sort === "-updatedAt") return b.updatedAt.localeCompare(a.updatedAt);
    if (sort === "expiresAt") return (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999");
    // Most viewed first; rows without stats (drafts, in review) by last change.
    return b.views7d - a.views7d || b.updatedAt.localeCompare(a.updatedAt);
  });

  const limit = query.limit ?? SELLER_LISTINGS_DEFAULT_LIMIT;
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const page = Math.min(query.page ?? 1, totalPages);
  const live = base.filter((l) => l.status === "published");
  return {
    data: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: rows.length, totalPages },
    counts,
    totals: {
      views7d: live.reduce((s, l) => s + l.views7d, 0),
      leads: live.reduce((s, l) => s + l.leads, 0),
    },
  };
}

export function bulkUpdateListings(userId: string, body: BulkListingsRequest, now = Date.now()) {
  const ws = workspace(userId, now);
  const updated: string[] = [];
  const skipped: string[] = [];
  for (const id of body.ids) {
    const l = ws.listings.find((x) => x.id === id);
    if (body.action === "renew" && l && (l.status === "published" || l.status === "expired")) {
      const from = Math.max(now, l.expiresAt ? Date.parse(l.expiresAt) : now);
      l.expiresAt = new Date(from + LISTING_DAYS * DAY).toISOString();
      l.status = "published";
    } else if (body.action === "close" && l && l.status !== "closed") {
      l.status = "closed";
      l.promotion = undefined;
      l.expiresAt = undefined;
    } else {
      skipped.push(id);
      continue;
    }
    l.updatedAt = new Date(now).toISOString();
    updated.push(id);
  }
  persist();
  return { updated, skipped };
}

// --- Boosts ------------------------------------------------------------------

const HOMEPAGE_PINS_LEFT = 5;

export function boostOptions(userId: string, now = Date.now()): BoostOptionDto[] {
  const account = sellerAccount(userId, now);
  return BOOST_CATALOG.map((o) => ({
    ...o,
    packageLeft:
      o.kind === "bump"
        ? account.usage.bumps.limit - account.usage.bumps.used
        : o.kind === "featured"
          ? account.usage.featured.limit - account.usage.featured.used
          : undefined,
    slotsLeft: o.kind === "homepage_pin" ? HOMEPAGE_PINS_LEFT : undefined,
  }));
}

export type PromoteResult =
  { ok: true; data: PromoteListingsResponse["data"] } | { ok: false; status: 400 | 402 | 404 | 409; message: string };

export function promoteListings(userId: string, body: PromoteListingsRequest, now = Date.now()): PromoteResult {
  const option = boostOptions(userId, now).find((o) => o.kind === body.kind);
  if (!option || !Array.isArray(body.ids) || body.ids.length === 0) {
    return { ok: false, status: 400, message: "ids and a valid kind are required" };
  }
  const ws = workspace(userId, now);
  const targets = body.ids.map((id) => ws.listings.find((l) => l.id === id));
  if (targets.some((l) => !l)) return { ok: false, status: 404, message: "Listing not found" };
  if (targets.some((l) => l!.status !== "published")) return { ok: false, status: 409, message: "not_published" };
  if (option.slotsLeft !== undefined && targets.length > option.slotsLeft) {
    return { ok: false, status: 409, message: "sold_out" };
  }
  const { covered, charge } = coverage(option, targets.length);
  if (charge > ws.credit) return { ok: false, status: 402, message: "insufficient_credit" };

  const at = new Date(now).toISOString();
  for (const l of targets) {
    if (body.kind === "bump") l!.lastBumpedAt = at;
    else l!.promotion = { kind: body.kind, endsAt: new Date(now + (option.days ?? 7) * DAY).toISOString() };
    l!.updatedAt = at;
  }
  if (body.kind === "bump") ws.bumpsUsed += covered;
  ws.credit -= charge;
  persist();
  return {
    ok: true,
    data: { promoted: body.ids, coveredByPackage: covered, charged: charge, creditLeft: ws.credit },
  };
}

// --- Leads -------------------------------------------------------------------

const leadNames = [
  "อรุณี ศักดิ์ดี",
  "ภาณุ วัฒนกุล",
  "จิราพร คงเจริญ",
  "เอกชัย บุญมา",
  "สุดารัตน์ แก้วใส",
  "ชยพล อินทร์แก้ว",
  "มาลัย ศรีทอง",
  "ณัฐวุฒิ ปัญญา",
  "รัชนี วงศ์ทอง",
  "ปิยะ สมบูรณ์",
  "กมลวรรณ ชัยมงคล",
  "ธนากร มั่นคง",
  "วิภาวี เพชรงาม",
  "อนุชา ทองคำ",
  "ศศิธร นาคสุข",
];

/** 23 leads over the last week: calls, chats (the lister threads first) and LINE. */
export function listLeads(userId: string, now = Date.now()): LeadDto[] {
  const ws = workspace(userId, now);
  const live = ws.listings.filter((l) => l.status === "published").slice(0, 8);
  const threads = listThreads(userId).filter((t) => t.role === "lister");
  const channels: LeadChannel[] = [
    ...Array<LeadChannel>(9).fill("call"),
    ...Array<LeadChannel>(11).fill("chat"),
    ...Array<LeadChannel>(3).fill("line"),
  ];
  let chats = 0;
  let names = 0;
  const leads = channels.map((channel, i): LeadDto => {
    const thread = channel === "chat" ? threads[chats++] : undefined;
    const listing = live[(i * 5) % live.length];
    return {
      id: `lead-${i + 1}`,
      name: thread?.counterpart.name ?? leadNames[names++ % leadNames.length],
      channel,
      listingTitle: thread?.listing?.title ?? listing.title,
      listingId: listing.id,
      // Spread over the last week, newest first.
      createdAt: new Date(now - ((i * 7) % 160) * HOUR - HOUR).toISOString(),
      phoneVerified: thread?.counterpart.phoneVerified ?? i % 4 !== 0,
      threadId: thread?.id,
    };
  });
  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Overview ----------------------------------------------------------------

export function sellerOverview(userId: string, days: OverviewRange = 14, now = Date.now()): SellerOverviewDto {
  const ws = workspace(userId, now);
  const rows = allRows(userId, now);
  const live = ws.listings.filter((l) => l.status === "published");
  const views7d = live.reduce((s, l) => s + l.views7d, 0);

  // Daily series: the last 7 days add up to `views7d`; earlier days run ~15% lower.
  const weight = (d: number) => 0.8 + (hash(`day-${d}`) % 40) / 100;
  const series = Array.from({ length: days }, (_, i) => days - 1 - i).map((ago) => {
    const date = slotParts(new Date(now - ago * DAY).toISOString()).date;
    return { ago, date, w: weight(Math.floor((now - ago * DAY) / DAY)) };
  });
  const recent = series.filter((s) => s.ago < 7);
  const recentWeight = recent.reduce((s, x) => s + x.w, 0) || 1;
  const perDay = views7d / recentWeight;
  const dailyViews = series.map((s) => ({
    date: s.date,
    views: Math.round(s.w * perDay * (s.ago < 7 ? 1 : 0.85)),
  }));
  // Make rounding land exactly on the total.
  const recentSum = dailyViews.slice(-7).reduce((s, d) => s + d.views, 0);
  if (dailyViews.length) dailyViews[dailyViews.length - 1].views += views7d - recentSum;
  const viewsPrev7d = Math.round(views7d / 1.18);

  const leads = listLeads(userId, now).filter((l) => Date.parse(l.createdAt) > now - 7 * DAY);
  const viewings = listerViewings(userId);
  const pending = viewings
    .filter((v) => v.status === "requested")
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const thisWeek = viewings.filter(
    (v) =>
      (v.status === "confirmed" || v.status === "requested") &&
      Date.parse(v.slot) >= now &&
      Date.parse(v.slot) < now + 7 * DAY,
  );
  const rejected = rows.filter((l) => l.status === "rejected");
  const drafts = rows.filter((l) => l.status === "draft");
  const featured = live.find((l) => l.promotion?.kind === "featured");

  return {
    updatedAt: new Date(now).toISOString(),
    views7d,
    viewsPrev7d,
    newLeads: leads.length,
    leadsByChannel: {
      call: leads.filter((l) => l.channel === "call").length,
      chat: leads.filter((l) => l.channel === "chat").length,
      line: leads.filter((l) => l.channel === "line").length,
    },
    viewingsThisWeek: thisWeek.length,
    responseRate: 0.94,
    responseMinutes: 18,
    dailyViews,
    chartNote: featured?.promotion
      ? `ประกาศแนะนำ “${featured.title}” ทำงานถึง ${formatThaiDate(featured.promotion.endsAt)}`
      : undefined,
    todo: {
      pendingViewings: pending.length,
      firstExpiresAt: pending[0]?.expiresAt,
      rejected: rejected.length,
      rejectReason: rejected[0]?.rejectReason,
      expiringSoon: live.filter((l) => l.expiresAt && Date.parse(l.expiresAt) - now <= 3 * DAY).length,
      drafts: drafts.length,
      latestDraftTitle: drafts[0]?.title,
    },
  };
}

// --- Availability ------------------------------------------------------------

export function getAvailability(userId: string): AvailabilityDto {
  return workspace(userId).availability;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const validRange = (r: AvailabilityDto["weekdays"]) =>
  r === null || (TIME.test(r.start) && TIME.test(r.end) && r.start < r.end);

export function setAvailability(userId: string, body: Partial<AvailabilityDto>): AvailabilityDto | undefined {
  const next: AvailabilityDto = { ...getAvailability(userId), ...body };
  if (
    next.weekdays === undefined ||
    next.weekend === undefined ||
    !validRange(next.weekdays) ||
    !validRange(next.weekend) ||
    !Number.isInteger(next.gapMinutes) ||
    next.gapMinutes < 0 ||
    next.gapMinutes > 240
  )
    return undefined;
  workspace(userId).availability = next;
  persist();
  return next;
}

/** Tests: start fresh. */
export function resetMockSeller() {
  store = {};
}
