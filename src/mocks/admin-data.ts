import { articles } from "@/data/articles";
import { bangkokDay } from "@/lib/format";
import {
  ADMIN_PAYMENTS_PAGE_SIZE,
  ADMIN_USERS_PAGE_SIZE,
  REFUND_FINANCE_THRESHOLD,
  type AdminPaymentDto,
  type AdminRevenueDto,
  type AdminUserAction,
  type AdminUserDetailDto,
  type AdminUserDto,
  type AdminUserKind,
  type AdminUserRowDto,
  type AdminUserStatus,
  type CmsArticleDto,
  type CmsArticleSummaryDto,
  type ListAdminUsersQuery,
  type PromoDayDto,
  type PromoPinDto,
  type PromoSettingsDto,
  type RefundRequestDto,
  type RevenueProduct,
  type SaveCmsArticleRequest,
} from "@/types/api";
import { listAuditLog, recordAdminAction } from "./admin";
import { liftRestriction, queueSnapshot, restrictUser, userRestriction } from "./admin-queues";
import { sellerSourceListings } from "./db";

/**
 * Admin data screens (E6–E9): users, revenue and refunds, homepage pin slots and the CMS.
 * Users are built from the people the review queues already know (posters, reported accounts,
 * KYC applicants) so links between admin pages land on the same accounts. Suspensions live in
 * `admin-queues.ts` and are shared with the reports queue. State is kept in sessionStorage in
 * the browser, like the rest of the admin mock.
 */

const KEY = "propertyhub:mock:admin-data";
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const iso = (t: number) => new Date(t).toISOString();

interface UserSeed {
  id: string;
  name: string;
  contact: string;
  phone: string;
  kind: AdminUserKind;
  listings: number;
  totalPaid: number;
  joinedAt: string;
  joinedVia: AdminUserDetailDto["joinedVia"];
  phoneVerified: boolean;
  phoneGroup?: string;
  device: string;
  networkNote?: string;
  pendingKyc: boolean;
}

interface State {
  users: UserSeed[];
  banned: string[];
  payments: AdminPaymentDto[];
  refundRequests: RefundRequestDto[];
  refundsDone: { amount: number; count: number };
  promoSettings: PromoSettingsDto;
  pins: PromoPinDto[];
  cms: CmsArticleDto[];
}

let state: State | undefined;
const inBrowser = () => typeof window !== "undefined" && process.env.NODE_ENV !== "test";

function save() {
  try {
    if (inBrowser() && state) window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Memory only.
  }
}

function load(): State {
  if (state) return state;
  try {
    const raw = inBrowser() ? window.sessionStorage.getItem(KEY) : null;
    if (raw) state = JSON.parse(raw) as State;
  } catch {
    // Fresh seed below.
  }
  state ??= seed(Date.now());
  return state;
}

// --- Seed -------------------------------------------------------------------

/** Masked email shown in the list, e.g. "u10073@…". */
const maskedEmail = (id: string) => `u${id.replace(/\D/g, "")}@…`;

function seedUsers(now: number): UserSeed[] {
  const { moderation, reports, kyc } = queueSnapshot();
  const users = new Map<string, UserSeed>();
  const add = (u: Omit<UserSeed, "phone" | "device"> & Partial<Pick<UserSeed, "phone" | "device">>) => {
    if (users.has(u.id)) return;
    const n = users.size;
    users.set(u.id, {
      phone: `08${(n % 9) + 1}${String(1_000_000 + n * 7_919).slice(-7)}`,
      device: n % 3 ? "iPhone 1 เครื่อง" : "Android 1 เครื่อง",
      ...u,
    });
  };
  const joined = (days: number) => iso(now - days * DAY);

  add({
    id: "u-1",
    name: "สมหญิง ใจดี",
    contact: "somying@…",
    kind: "seeker",
    listings: 0,
    totalPaid: 0,
    joinedAt: joined(400),
    joinedVia: "email",
    phoneVerified: true,
    pendingKyc: false,
  });
  // The account from the E4/E6 boards, and two more on its phone number.
  add({
    id: "user_88213",
    name: "user_88213",
    contact: "08x-xxx-4412",
    phone: "0812274412",
    kind: "owner",
    listings: 4,
    totalPaid: 0,
    joinedAt: joined(1),
    joinedVia: "line",
    phoneVerified: true,
    phoneGroup: "g-4412",
    device: "Android 1 เครื่อง",
    networkNote: "IP ตรงกับบัญชีที่ถูกระงับก่อนหน้า",
    pendingKyc: false,
  });
  for (const [id, days] of [
    ["user_88214", 3],
    ["user_88215", 6],
  ] as const) {
    add({
      id,
      name: id,
      contact: "08x-xxx-4412",
      phone: "0812274412",
      kind: "owner",
      listings: 1,
      totalPaid: 0,
      joinedAt: joined(days),
      joinedVia: "line",
      phoneVerified: true,
      phoneGroup: "g-4412",
      device: "Android 1 เครื่อง",
      pendingKyc: false,
    });
  }

  for (const [i, item] of moderation.entries()) {
    const p = item.poster;
    add({
      id: p.userId,
      name: p.name,
      contact: maskedEmail(p.userId),
      kind: p.kind === "agent" ? (p.badge.includes("Pro") ? "agent_pro" : "agent") : "owner",
      listings: p.listings,
      totalPaid: p.kind === "agent" ? 1_290 + (i % 9) * 590 : (i % 4) * 199,
      joinedAt: joined(p.accountAgeDays),
      joinedVia: (["email", "google", "line"] as const)[i % 3],
      phoneVerified: true,
      pendingKyc: false,
    });
  }
  for (const [i, c] of reports.entries()) {
    add({
      id: c.reported.userId,
      name: c.reported.name,
      contact: maskedEmail(c.reported.userId),
      kind: "owner",
      listings: c.reported.listings,
      totalPaid: 0,
      joinedAt: joined(c.reported.accountAgeDays),
      joinedVia: "line",
      phoneVerified: i % 2 === 0,
      pendingKyc: false,
    });
  }
  for (const [i, k] of kyc.entries()) {
    add({
      id: k.userId,
      name: k.name,
      contact: maskedEmail(k.userId),
      kind: "agent",
      listings: 0,
      totalPaid: 0,
      joinedAt: joined(1 + (i % 25)),
      joinedVia: "email",
      phoneVerified: true,
      pendingKyc: k.status === "pending" || k.status === "needs_info",
    });
  }
  return [...users.values()];
}

/** Payment history for the transactions table (E7); a few match the refund requests. */
function seedPayments(now: number, users: UserSeed[]): AdminPaymentDto[] {
  const items: [string, number][] = [
    ["ประกาศแนะนำ 14 วัน", 590],
    ["แพ็กเกจนายหน้า Pro", 1_290],
    ["ดันอัตโนมัติ 7 วัน", 199],
    ["ดันประกาศ", 49],
    ["ปักหมุดหน้าแรก 7 วัน", 1_490],
    ["แพ็กเกจเอเจนซี", 3_290],
  ];
  const methods = ["promptpay", "card", "credit"] as const;
  const payers = users.filter((u) => u.totalPaid > 0);
  const payments: AdminPaymentDto[] = [
    {
      id: "PAY-77120",
      at: iso(now - 22 * MIN),
      customer: "กิตติพัฒน์ ศรีสุข",
      item: "ประกาศแนะนำ PH-2291",
      amount: 590,
      method: "promptpay",
      status: "awaiting_review",
    },
    {
      id: "PAY-77118",
      at: iso(now - 2 * HOUR),
      customer: "สุขุมวิท เรียลตี้",
      item: "แพ็กเกจเอเจนซี",
      amount: 3_290,
      method: "card",
      status: "paid",
    },
    {
      id: "PAY-77101",
      at: iso(now - 3 * HOUR),
      customer: "ปวีณา อ.",
      item: "ดันอัตโนมัติ 7 วัน",
      amount: 199,
      method: "credit",
      status: "paid",
    },
    {
      id: "PAY-77064",
      at: iso(now - 14 * HOUR),
      customer: "ศิริพร ก.",
      item: "ปักหมุดหน้าแรก 7 วัน",
      amount: 1_490,
      method: "card",
      status: "refund_requested",
    },
    {
      id: "PAY-76990",
      at: iso(now - 30 * HOUR),
      customer: "ภาคิน ส.",
      item: "ประกาศแนะนำ 14 วัน",
      amount: 590,
      method: "promptpay",
      status: "refund_requested",
    },
  ];
  for (let i = 0; i < 40; i++) {
    const [item, amount] = items[i % items.length];
    payments.push({
      id: `PAY-${76980 - i * 7}`,
      at: iso(now - (36 + i * 9) * HOUR),
      customer: payers[i % payers.length]?.name ?? "ลูกค้า",
      item,
      amount,
      method: methods[i % 3],
      status: i % 17 === 5 ? "failed" : i % 23 === 9 ? "refunded" : "paid",
    });
  }
  return payments;
}

/** Monday of the Bangkok week containing `day`. */
const mondayOf = (day: string) => {
  const weekday = new Date(`${day}T12:00:00+07:00`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
};

/** "2026-11-17" + n days, in Bangkok calendar days. */
export function addDays(day: string, n: number): string {
  const t = Date.parse(`${day}T12:00:00+07:00`) + n * DAY;
  return bangkokDay(new Date(t));
}

const daysBetween = (start: string, end: string) =>
  Math.round((Date.parse(`${end}T12:00:00+07:00`) - Date.parse(`${start}T12:00:00+07:00`)) / DAY);

function seedPins(now: number, settings: PromoSettingsDto): PromoPinDto[] {
  const weekStart = mondayOf(bangkokDay(new Date(now)));
  const listings = sellerSourceListings(140).slice(0, 40);
  const pins: PromoPinDto[] = [];
  const partnerNames = ["ฝ่ายขายโครงการ แอสเตอร์", "ไอคอน เอสเตท", "ซิตี้ โฮม เอเจนซี่", "ริเวอร์ไซด์ เรียลตี้"];
  for (let i = 0; i < settings.partnerReserved; i++) {
    const l = listings[i];
    pins.push({
      id: `PIN-P${i + 1}`,
      listing: {
        code: `PH-${Number(l.id.replace(/\D/g, "")) || 1200 + i}`,
        title: l.title,
        slug: l.slug,
        district: l.district,
      },
      buyer: partnerNames[i],
      start: addDays(weekStart, -3),
      end: addDays(weekStart, 13),
      source: "partner",
    });
  }
  const buyers = ["กิตติพัฒน์ ศ.", "บ้านดี พร็อพเพอร์ตี้", "สุขุมวิท เรียลตี้", "ปวีณา อ.", "ณัฐชา ป.", "ธนพล จ."];
  // Staggered 7-day purchases that keep each day within capacity and the district cap.
  for (let i = 0; i < 60; i++) {
    const l = listings[(i + settings.partnerReserved) % listings.length];
    const start = addDays(weekStart, -6 + ((i * 5) % 17));
    const pin: PromoPinDto = {
      id: `PIN-${1001 + i}`,
      listing: {
        code: `PH-${(Number(l.id.replace(/\D/g, "")) || 900) + i}`,
        title: l.title,
        slug: l.slug,
        district: l.district,
      },
      buyer: buyers[i % buyers.length],
      start,
      end: addDays(start, 6),
      source: "purchase",
    };
    if (!pinConflict(pins, pin, settings)) pins.push(pin);
  }
  return pins;
}

function seedCms(now: number): CmsArticleDto[] {
  return articles.map((a, i) => {
    const body = [...a.body];
    // The E9 board's article: in review, with a listing-cards block.
    const inReview = a.slug === "resale-condo-checklist";
    if (inReview) {
      body.splice(2, 0, {
        type: "listings",
        title: "คอนโดมือสองใกล้ BTS พร้อมพงษ์",
        query: { mode: "buy", type: "condo", station: "E5" },
        limit: 3,
      });
    }
    return {
      id: `ART-${101 + i}`,
      slug: a.slug,
      title: a.title,
      category: a.category,
      tags: [
        a.category === "buying" ? "มือสอง" : "คู่มือ",
        ...(a.related?.query.station ? [a.related.query.station] : []),
      ],
      cover: a.cover,
      seoDescription: a.excerpt.slice(0, 160),
      body,
      status: inReview ? "in_review" : "published",
      reviewer: a.reviewedBy ?? (inReview ? "ทนายความภายนอก" : undefined),
      publishedAt: inReview ? undefined : a.publishedAt,
      updatedAt: inReview ? iso(now - 4 * MIN) : a.updatedAt,
      updatedBy: inReview ? "อรวี" : a.author,
      revisions: [
        {
          id: `${i}-r2`,
          at: inReview ? iso(now - 4 * MIN) : a.updatedAt,
          by: inReview ? "อรวี" : a.author,
          note: "แก้ไขเนื้อหา",
        },
        { id: `${i}-r1`, at: a.publishedAt, by: a.author, note: "สร้างบทความ" },
      ],
    };
  });
}

function seed(now: number): State {
  const users = seedUsers(now);
  const promoSettings: PromoSettingsDto = { priceWeek: 1_490, slotsPerDay: 24, partnerReserved: 4, districtCap: 6 };
  return {
    users,
    banned: [],
    payments: seedPayments(now, users),
    refundRequests: [
      {
        paymentId: "PAY-77064",
        customer: "ศิริพร ก.",
        reason: "ปักหมุดแล้วแต่ประกาศถูกระงับวันที่ 2 ขอคืนตามสัดส่วน",
        amount: 1_277,
        requestedAt: iso(now - 5 * HOUR),
        needsFinance: true,
      },
      {
        paymentId: "PAY-76990",
        customer: "ภาคิน ส.",
        reason: "ซื้อซ้ำ 2 ครั้ง",
        amount: 590,
        requestedAt: iso(now - 26 * HOUR),
        needsFinance: false,
      },
    ],
    refundsDone: { amount: 8_260, count: 11 },
    promoSettings,
    pins: seedPins(now, promoSettings),
    cms: seedCms(now),
  };
}

// --- Users ------------------------------------------------------------------

function statusOf(u: UserSeed): AdminUserStatus {
  if (load().banned.includes(u.id)) return "banned";
  if (userRestriction(u.id)?.status === "suspended") return "suspended";
  return u.pendingKyc ? "pending_kyc" : "active";
}

function toRow(u: UserSeed, s: State): AdminUserRowDto {
  return {
    id: u.id,
    name: u.name,
    contact: u.contact,
    kind: u.kind,
    status: statusOf(u),
    listings: u.listings,
    totalPaid: u.totalPaid,
    joinedAt: u.joinedAt,
    sharedPhone: Boolean(u.phoneGroup && s.users.some((o) => o.id !== u.id && o.phoneGroup === u.phoneGroup)),
  };
}

/** Accounts on the platform, for the page header (most are not in the mock). */
const PLATFORM_TOTAL = 182_406;

export function listAdminUsers(q: ListAdminUsersQuery, now = Date.now()) {
  const s = load();
  const term = q.q?.trim().toLowerCase();
  const group = q.sharedWith && s.users.find((u) => u.id === q.sharedWith)?.phoneGroup;
  const days = q.joined === "7d" ? 7 : q.joined === "30d" ? 30 : q.joined === "90d" ? 90 : undefined;
  const rows = s.users
    .filter((u) => !q.sharedWith || (group && u.phoneGroup === group))
    .filter((u) => !q.kind || q.kind === "all" || u.kind === q.kind)
    .filter((u) => !q.status || q.status === "all" || statusOf(u) === q.status)
    .filter((u) => !days || now - Date.parse(u.joinedAt) <= days * DAY)
    .filter((u) => !term || [u.id, u.name, u.contact].some((v) => v.toLowerCase().includes(term)))
    .sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt))
    .map((u) => toRow(u, s));
  const totalPages = Math.max(1, Math.ceil(rows.length / ADMIN_USERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, q.page ?? 1), totalPages);
  return {
    data: rows.slice((page - 1) * ADMIN_USERS_PAGE_SIZE, page * ADMIN_USERS_PAGE_SIZE),
    meta: { page, limit: ADMIN_USERS_PAGE_SIZE, total: rows.length, totalPages },
    platformTotal: PLATFORM_TOTAL,
  };
}

export function getAdminUser(id: string, now = Date.now()): AdminUserDetailDto | undefined {
  const s = load();
  const u = s.users.find((x) => x.id === id);
  if (!u) return undefined;
  const { moderation, reports } = queueSnapshot();
  const restricted = statusOf(u) === "suspended" || statusOf(u) === "banned";
  const listingItems = [
    ...moderation
      .filter((m) => m.poster.userId === id)
      .map((m) => ({
        code: m.id,
        title: m.listing.title,
        slug: m.listing.slug,
        hidden: restricted || m.status === "returned",
      })),
    ...reports
      .filter((c) => c.reported.userId === id)
      .map((c) => ({
        code: c.listing.code,
        title: c.listing.title,
        slug: c.listing.slug,
        hidden: restricted || c.listing.hidden,
      })),
  ].filter((l, i, all) => all.findIndex((x) => x.code === l.code) === i);
  const restriction = userRestriction(id);
  const today = bangkokDay(new Date(now));
  // The audit log keeps two years; the mock only has today, plus yesterday's seed.
  const activity = [today, addDays(today, -1), addDays(today, -2)]
    .flatMap((day) => listAuditLog(day))
    .filter((e) => e.action.includes(u.name) || e.action.includes(id) || e.note.includes(id));
  return {
    ...toRow(u, s),
    joinedVia: u.joinedVia,
    phoneVerified: u.phoneVerified,
    sharedPhoneWith: s.users
      .filter((o) => o.id !== id && u.phoneGroup && o.phoneGroup === u.phoneGroup)
      .map((o) => ({ id: o.id, name: o.name, status: statusOf(o) })),
    device: u.device,
    networkNote: u.networkNote,
    suspension: restriction,
    listingItems,
    reports: reports
      .filter((c) => c.reported.userId === id)
      .map((c) => ({ id: c.id, title: c.title, status: c.status })),
    payments: s.payments
      .filter((p) => p.customer === u.name)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        at: p.at,
        item: p.item,
        amount: p.amount,
        status: p.status === "awaiting_review" ? "pending" : p.status,
      })),
    activity,
  };
}

export type UserActionResult = { ok: true; user: AdminUserDetailDto } | { ok: false; reason: "missing" | "conflict" };

export function actOnUser(
  id: string,
  action: AdminUserAction,
  admin: AdminUserDto,
  text = "",
  now = Date.now(),
): UserActionResult {
  const s = load();
  const u = s.users.find((x) => x.id === id);
  if (!u) return { ok: false, reason: "missing" };
  const status = statusOf(u);
  if (action === "suspend") {
    if (status === "suspended" || status === "banned") return { ok: false, reason: "conflict" };
    restrictUser(id, { status: "suspended", at: iso(now), by: admin.name, reason: text });
    recordAdminAction(admin, `ระงับบัญชี ${u.name}`, text, now);
  } else if (action === "unsuspend") {
    if (status !== "suspended") return { ok: false, reason: "conflict" };
    liftRestriction(id);
    recordAdminAction(admin, `ยกเลิกการระงับ ${u.name}`, text, now);
  } else if (action === "ban") {
    if (status === "banned") return { ok: false, reason: "conflict" };
    s.banned.push(id);
    restrictUser(id, { status: "banned", at: iso(now), by: admin.name, reason: text });
    recordAdminAction(admin, `แบนถาวร ${u.name}`, text, now);
  } else {
    recordAdminAction(admin, `ส่งข้อความถึง ${u.name}`, text, now);
  }
  save();
  return { ok: true, user: getAdminUser(id, now)! };
}

export function revealPhone(id: string, admin: AdminUserDto, reason: string, now = Date.now()) {
  const u = load().users.find((x) => x.id === id);
  if (!u) return undefined;
  recordAdminAction(admin, `เปิดดูเบอร์เต็ม ${u.name}`, `เหตุผล: ${reason}`, now);
  return `${u.phone.slice(0, 3)}-${u.phone.slice(3, 6)}-${u.phone.slice(6)}`;
}

// --- Revenue ----------------------------------------------------------------

const productShare: Record<RevenueProduct, number> = {
  agent_plan: 0.394,
  featured: 0.304,
  homepage_pin: 0.187,
  bump: 0.115,
};

/** The current month and the two before it ("2026-11", "2026-10", "2026-09"). */
export function revenueMonths(now = Date.now()): string[] {
  const [y, m] = bangkokDay(new Date(now)).split("-").map(Number);
  return [0, 1, 2].map((back) => {
    const total = y * 12 + (m - 1) - back;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}

export function adminRevenue(month: string, now = Date.now()): AdminRevenueDto | undefined {
  const months = revenueMonths(now);
  const index = months.indexOf(month);
  if (index < 0) return undefined;
  const s = load();
  const current = index === 0;
  const today = bangkokDay(new Date(now));
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const through = current ? today : `${month}-${String(lastDay).padStart(2, "0")}`;
  const revenue = [1_047_000, 1_812_400, 1_698_900][index];
  return {
    month,
    through,
    kpis: {
      revenue,
      changePct: [9, 6, -2][index],
      members: { total: [812, 798, 771][index], pro: [731, 720, 699][index], agency: [81, 78, 72][index] },
      churnPct: [3.1, 3.6, 4.4][index],
      churnTargetPct: 4,
      refunds: current
        ? s.refundsDone
        : [
            { amount: 12_480, count: 17 },
            { amount: 9_930, count: 14 },
          ][index - 1],
    },
    byProduct: (Object.keys(productShare) as RevenueProduct[]).map((product) => ({
      product,
      amount: Math.round((revenue * productShare[product]) / 1000) * 1000,
    })),
    refundRequests: current ? s.refundRequests : [],
  };
}

export function listAdminPayments(page = 1) {
  const rows = [...load().payments].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const totalPages = Math.max(1, Math.ceil(rows.length / ADMIN_PAYMENTS_PAGE_SIZE));
  const p = Math.min(Math.max(1, page), totalPages);
  return {
    data: rows.slice((p - 1) * ADMIN_PAYMENTS_PAGE_SIZE, p * ADMIN_PAYMENTS_PAGE_SIZE),
    meta: { page: p, limit: ADMIN_PAYMENTS_PAGE_SIZE, total: rows.length, totalPages },
  };
}

/** Every payment, for "ส่งออกให้บัญชี". */
export const allAdminPayments = () => [...load().payments].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

export type RefundResult = { ok: true } | { ok: false; reason: "missing" | "forbidden" };

/** Finance (or a super admin) approves refunds over ฿1,000 (handoff §6). */
export const canApproveRefund = (admin: AdminUserDto, amount: number) =>
  amount <= REFUND_FINANCE_THRESHOLD || admin.role === "finance" || admin.role === "super_admin";

export function decideRefund(
  paymentId: string,
  decision: "approve" | "reject",
  admin: AdminUserDto,
  note = "",
  now = Date.now(),
): RefundResult {
  const s = load();
  const request = s.refundRequests.find((r) => r.paymentId === paymentId);
  if (!request) return { ok: false, reason: "missing" };
  if (decision === "approve" && !canApproveRefund(admin, request.amount)) return { ok: false, reason: "forbidden" };
  s.refundRequests = s.refundRequests.filter((r) => r !== request);
  const payment = s.payments.find((p) => p.id === paymentId);
  if (payment) payment.status = decision === "approve" ? "refunded" : "paid";
  if (decision === "approve")
    s.refundsDone = { amount: s.refundsDone.amount + request.amount, count: s.refundsDone.count + 1 };
  recordAdminAction(
    admin,
    `${decision === "approve" ? "อนุมัติ" : "ปฏิเสธ"}คืนเงิน ${paymentId} ฿${request.amount.toLocaleString("en-US")}`,
    note,
    now,
  );
  save();
  return { ok: true };
}

// --- Homepage pins ----------------------------------------------------------

const covers = (pin: PromoPinDto, day: string) => pin.start <= day && day <= pin.end;

/** The first day `pin` would not fit, if any: a full day or a district over the cap. */
function pinConflict(pins: PromoPinDto[], pin: PromoPinDto, settings: PromoSettingsDto) {
  const others = pins.filter((p) => p.id !== pin.id);
  const length = daysBetween(pin.start, pin.end);
  for (let i = 0; i <= length; i++) {
    const day = addDays(pin.start, i);
    const active = others.filter((p) => covers(p, day));
    const sameSource = active.filter((p) => p.source === pin.source).length;
    const limit = pin.source === "partner" ? settings.partnerReserved : settings.slotsPerDay - settings.partnerReserved;
    if (sameSource >= limit) return { day, reason: "full" as const };
    if (active.filter((p) => p.listing.district === pin.listing.district).length >= settings.districtCap) {
      return { day, reason: "district" as const };
    }
  }
  return undefined;
}

export function promoWeek(anyDay: string) {
  const s = load();
  const weekStart = mondayOf(anyDay);
  const weekEnd = addDays(weekStart, 6);
  const days: PromoDayDto[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const active = s.pins.filter((p) => covers(p, date));
    return {
      date,
      sold: active.filter((p) => p.source === "purchase").length,
      partner: active.filter((p) => p.source === "partner").length,
      capacity: s.promoSettings.slotsPerDay,
    };
  });
  const pins = s.pins
    .filter((p) => p.start <= weekEnd && p.end >= weekStart)
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  return { weekStart, days, pins, settings: s.promoSettings };
}

export type MovePinResult =
  | { ok: true; pin: PromoPinDto }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "conflict"; day: string; conflict: "full" | "district" };

export function movePin(id: string, start: string, admin: AdminUserDto, now = Date.now()): MovePinResult {
  const s = load();
  const pin = s.pins.find((p) => p.id === id);
  if (!pin) return { ok: false, reason: "missing" };
  const moved = { ...pin, start, end: addDays(start, daysBetween(pin.start, pin.end)) };
  const conflict = pinConflict(s.pins, moved, s.promoSettings);
  if (conflict) return { ok: false, reason: "conflict", day: conflict.day, conflict: conflict.reason };
  Object.assign(pin, moved);
  recordAdminAction(admin, `ย้ายวันปักหมุด ${pin.listing.code}`, `${moved.start} ถึง ${moved.end}`, now);
  save();
  return { ok: true, pin };
}

/** Validation for the pin settings; an empty list means valid. */
export function promoSettingsErrors(v: Partial<PromoSettingsDto>): string[] {
  const errors: string[] = [];
  const int = (x: unknown): x is number => Number.isInteger(x);
  if (!int(v.priceWeek) || v.priceWeek < 100 || v.priceWeek > 100_000) errors.push("priceWeek must be 100–100000");
  if (!int(v.slotsPerDay) || v.slotsPerDay < 1 || v.slotsPerDay > 48) errors.push("slotsPerDay must be 1–48");
  if (!int(v.partnerReserved) || v.partnerReserved < 0 || (int(v.slotsPerDay) && v.partnerReserved >= v.slotsPerDay)) {
    errors.push("partnerReserved must be 0 and below slotsPerDay");
  }
  if (!int(v.districtCap) || v.districtCap < 1 || (int(v.slotsPerDay) && v.districtCap > v.slotsPerDay)) {
    errors.push("districtCap must be 1 to slotsPerDay");
  }
  return errors;
}

export function updatePromoSettings(next: PromoSettingsDto, admin: AdminUserDto, now = Date.now()) {
  const s = load();
  const before = s.promoSettings;
  s.promoSettings = next;
  const changes = (Object.keys(next) as (keyof PromoSettingsDto)[])
    .filter((k) => before[k] !== next[k])
    .map((k) => `${k} ${before[k]} → ${next[k]}`);
  recordAdminAction(admin, "แก้ตั้งค่าช่องปักหมุดหน้าแรก", changes.join(", "), now);
  save();
  return next;
}

// --- CMS --------------------------------------------------------------------

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function listCms(): CmsArticleSummaryDto[] {
  return [...load().cms]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((a) => {
      const summary: Partial<CmsArticleDto> = { ...a };
      delete summary.body;
      delete summary.revisions;
      return summary as CmsArticleSummaryDto;
    });
}

export const getCms = (id: string) => load().cms.find((a) => a.id === id);

export function createCms(admin: AdminUserDto, now = Date.now()): CmsArticleDto {
  const s = load();
  const n = s.cms.length + 1;
  const article: CmsArticleDto = {
    id: `ART-${100 + n + Math.floor(now % 1000)}`,
    slug: `new-article-${n}`,
    title: "บทความใหม่",
    category: "buying",
    tags: [],
    cover: articles[0].cover,
    seoDescription: "",
    body: [{ type: "paragraph", text: "" }],
    status: "draft",
    updatedAt: iso(now),
    updatedBy: admin.name,
    revisions: [{ id: `${n}-r1`, at: iso(now), by: admin.name, note: "สร้างบทความ" }],
  };
  s.cms.push(article);
  recordAdminAction(admin, `สร้างบทความ ${article.id}`, "", now);
  save();
  return article;
}

export function cmsErrors(body: Partial<SaveCmsArticleRequest>, id: string): { errors: string[]; slugTaken: boolean } {
  const errors: string[] = [];
  if (!body.title?.trim() || body.title.length > 120) errors.push("title is required (max 120)");
  if (!body.slug || !SLUG.test(body.slug)) errors.push("slug must be lowercase words joined by hyphens");
  if ((body.seoDescription?.length ?? 0) > 160) errors.push("seoDescription max 160");
  if (!Array.isArray(body.body) || body.body.length === 0) errors.push("body needs at least one block");
  const slugTaken = Boolean(body.slug && load().cms.some((a) => a.id !== id && a.slug === body.slug));
  return { errors, slugTaken };
}

export function saveCms(id: string, body: SaveCmsArticleRequest, admin: AdminUserDto, now = Date.now()) {
  const article = getCms(id);
  if (!article) return undefined;
  Object.assign(article, body, { updatedAt: iso(now), updatedBy: admin.name });
  article.revisions.unshift({ id: `${id}-${now}`, at: iso(now), by: admin.name, note: "บันทึกแบบร่าง" });
  save();
  return article;
}

export function publishCms(id: string, admin: AdminUserDto, at: string | undefined, now = Date.now()) {
  const article = getCms(id);
  if (!article) return undefined;
  const scheduled = at && Date.parse(at) > now;
  article.status = scheduled ? "scheduled" : "published";
  article.scheduledAt = scheduled ? at : undefined;
  article.publishedAt = scheduled ? article.publishedAt : iso(now);
  article.updatedAt = iso(now);
  article.updatedBy = admin.name;
  article.revisions.unshift({
    id: `${id}-${now}`,
    at: iso(now),
    by: admin.name,
    note: scheduled ? `ตั้งเวลาเผยแพร่ ${at}` : "เผยแพร่",
  });
  recordAdminAction(admin, `${scheduled ? "ตั้งเวลาเผยแพร่" : "เผยแพร่"} ${article.id}`, article.title, now);
  save();
  return article;
}

export function resetMockAdminData(now = Date.now()) {
  state = seed(now);
}
