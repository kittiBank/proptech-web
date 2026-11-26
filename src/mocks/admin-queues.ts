import { compareModeration, compareReports, reasonSeverity, reportReasonTitles } from "@/lib/admin-queues";
import {
  MODERATION_PAGE_SIZE,
  REPORT_AUTO_HIDE,
  type AdminUserDto,
  type KycApplicationDto,
  type KycApplicationStatus,
  type KycDecision,
  type ListModerationQuery,
  type ModerationFlagDto,
  type ModerationItemDto,
  type ModerationReturnReason,
  type ModerationTab,
  type PropertyDto,
  type ReportAction,
  type ReportCaseDto,
  type ReportCaseTab,
} from "@/types/api";
import { recordAdminAction } from "./admin";
import { getPropertyDetail, sellerSourceListings } from "./db";
import { listReports } from "./reports";

/**
 * Admin review queues behind `/admin/moderation`, `/admin/reports` and `/admin/kyc` (E2–E5).
 * Seeded from real mock listings so titles, photos and links match the site. Reports filed on
 * the site (D6) join the report queue. Every decision is written to the audit log. In the
 * browser the state lives in sessionStorage next to the admin session.
 */

const KEY = "propertyhub:mock:admin-queues";
const MIN = 60_000;
const HOUR = 60 * MIN;

interface State {
  moderation: ModerationItemDto[];
  reports: (ReportCaseDto & { source: "seed" | "site" })[];
  kyc: KycApplicationDto[];
  /** Site report ids already folded into cases. */
  syncedReports: string[];
  /** Suspended or banned accounts, shared by reports (E4) and users (E6). */
  restrictions: Record<string, UserRestriction>;
}

export interface UserRestriction {
  status: "suspended" | "banned";
  at: string;
  by: string;
  reason: string;
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
    // Fall through to a fresh seed.
  }
  state ??= seed(Date.now());
  return state;
}

const iso = (t: number) => new Date(t).toISOString();

// --- Seed -------------------------------------------------------------------

/** Listings the queues use; past the ones the seller dashboard mock takes. */
function sourceListings(): PropertyDto[] {
  return sellerSourceListings(140).slice(40);
}

const flag = {
  phone: (photoIndex: number, confidence: number): ModerationFlagDto => ({
    code: "phone_in_photo",
    label: "พบเบอร์ในรูป",
    tone: "danger",
    photoIndex,
    confidence,
    detail: `ระบบพบตัวเลขคล้ายเบอร์โทรในรูปที่ ${photoIndex + 1} ความมั่นใจ ${confidence.toFixed(2)} ให้ดูด้วยตา`,
  }),
  price: (pct: number): ModerationFlagDto => ({
    code: "price_below_market",
    label: `ราคาต่ำกว่าตลาด ${pct}%`,
    tone: "warning",
    detail: `ราคาต่อตารางเมตรต่ำกว่าค่ากลางของย่าน ${pct}%`,
  }),
  duplicate: (n: number): ModerationFlagDto => ({
    code: "duplicate_photos",
    label: `รูปซ้ำกับ ${n} ประกาศ`,
    tone: "danger",
    photoIndex: 0,
    confidence: 0.97,
    detail: `รูปปกตรงกับรูปใน ${n} ประกาศของบัญชีอื่น`,
  }),
  newAccount: (): ModerationFlagDto => ({ code: "new_account", label: "บัญชีอายุ 1 วัน", tone: "warning" }),
  resubmitted: (): ModerationFlagDto => ({ code: "resubmitted", label: "แก้ไขหลังถูกปฏิเสธ", tone: "neutral" }),
};

interface Override {
  poster?: Partial<ModerationItemDto["poster"]>;
  flags?: ModerationFlagDto[];
  promotion?: ModerationItemDto["promotion"];
  waitMinutes: number;
}

/** The first rows match the E2 board; the rest are generated. */
const boardRows: Override[] = [
  {
    poster: {
      name: "กิตติพัฒน์ ศรีสุข",
      kind: "agent",
      badge: "นายหน้า Pro",
      accountAgeDays: 1100,
      listings: 64,
      returnedLast90d: 2,
    },
    flags: [flag.phone(6, 0.62)],
    promotion: { label: "แนะนำ", amount: 590 },
    waitMinutes: 38,
  },
  {
    poster: { name: "ปวีณา อินทรสุวรรณ", kind: "owner", badge: "เจ้าของ" },
    flags: [flag.phone(2, 0.88)],
    waitMinutes: 72,
  },
  {
    poster: { name: "สุขุมวิท เรียลตี้", kind: "agent", badge: "นายหน้า Pro" },
    flags: [flag.price(38)],
    waitMinutes: 125,
  },
  {
    poster: {
      userId: "user_88213",
      name: "user_88213",
      kind: "owner",
      badge: "เจ้าของ (ใหม่)",
      accountAgeDays: 1,
      listings: 4,
      kycApproved: false,
    },
    flags: [flag.duplicate(8), flag.newAccount()],
    waitMinutes: 151,
  },
  { poster: { name: "วรวุฒิ ทองดี", kind: "owner", badge: "เจ้าของ" }, waitMinutes: 46 },
  {
    poster: { name: "ธนพล เจริญรัตน์", kind: "owner", badge: "เจ้าของ" },
    flags: [flag.resubmitted()],
    waitMinutes: 22,
  },
];

function checksFor(flags: ModerationFlagDto[]): ModerationItemDto["checks"] {
  const has = (code: ModerationFlagDto["code"]) => flags.some((f) => f.code === code);
  return [
    { id: "photos", label: "รูปไม่มีเบอร์ ลายน้ำ หรือโลโก้เว็บอื่น", passed: !has("phone_in_photo") },
    { id: "price", label: "ราคาอยู่ในช่วงตลาดของโครงการ", passed: !has("price_below_market") },
    { id: "location", label: "ที่อยู่และหมุดตรงกับโครงการ", passed: true },
    { id: "text", label: "หัวข้อและรายละเอียดไม่มีข้อมูลติดต่อ", passed: true },
    { id: "unique", label: "ไม่ซ้ำกับประกาศอื่นของผู้ใช้", passed: !has("duplicate_photos") },
  ];
}

function moderationItem(
  p: PropertyDto,
  i: number,
  status: ModerationTab,
  now: number,
  o?: Override,
): ModerationItemDto {
  const listing = getPropertyDetail(p.slug)!;
  const generatedFlags: ModerationFlagDto[] =
    i % 7 === 3 ? [flag.phone(1, 0.71)] : i % 9 === 4 ? [flag.price(24)] : i % 13 === 6 ? [flag.newAccount()] : [];
  const flags = o?.flags ?? generatedFlags;
  const agent = p.agent.kind === "agent";
  // Pending ages spread over 3 hours so a few break the 2-hour SLA.
  const wait = o?.waitMinutes ?? 8 + ((i * 37) % 112);
  return {
    id: listing.code,
    status,
    listing,
    marketBand: flags.some((f) => f.code === "price_below_market") ? "below" : "market",
    poster: {
      userId: `user_${10000 + i * 73}`,
      name: p.agent.name,
      kind: agent ? "agent" : "owner",
      badge: agent ? "นายหน้า" : "เจ้าของ",
      accountAgeDays: 40 + ((i * 53) % 900),
      listings: agent ? 6 + (i % 30) : 1 + (i % 3),
      returnedLast90d: i % 4 === 0 ? 1 : 0,
      reportsCount: 0,
      kycApproved: agent,
      ...o?.poster,
    },
    promotion:
      o?.promotion ??
      (i === 9 ? { label: "ดันอัตโนมัติ", amount: 199 } : i === 17 ? { label: "แนะนำ", amount: 590 } : undefined),
    flags,
    checks: checksFor(flags),
    submittedAt: iso(now - wait * MIN),
  };
}

function seedModeration(now: number): ModerationItemDto[] {
  const listings = sourceListings();
  const items: ModerationItemDto[] = [];
  // 38 pending (E1/E2), then returned, spot checks and today's decisions.
  listings.slice(0, 38).forEach((p, i) => items.push(moderationItem(p, i, "pending", now, boardRows[i])));
  listings.slice(38, 44).forEach((p, i) => {
    const item = moderationItem(p, 38 + i, "returned", now, { waitMinutes: 300 + i * 40, flags: [flag.phone(1, 0.9)] });
    item.decision = {
      outcome: "returned",
      reasons: ["contact_in_photo"],
      message: "รูปที่ 2 มีเบอร์โทร กรุณาลบหรือครอปรูปออก",
      by: "ภูมิ",
      at: iso(now - (200 + i * 30) * MIN),
    };
    items.push(item);
  });
  listings
    .slice(44, 49)
    .forEach((p, i) =>
      items.push(moderationItem(p, 44 + i, "spot_check", now, { waitMinutes: 60 + i * 25, flags: [] })),
    );
  listings.slice(49, 57).forEach((p, i) => {
    const item = moderationItem(p, 49 + i, "done", now, { waitMinutes: 180 + i * 20 });
    item.decision = {
      outcome: "approved",
      reasons: [],
      message: "",
      by: i % 2 ? "ภูมิ" : "นภัส",
      at: iso(now - (60 + i * 15) * MIN),
    };
    items.push(item);
  });
  return items;
}

function seedReports(now: number): State["reports"] {
  const listings = sourceListings().slice(60);
  const c = (
    i: number,
    reason: ReportCaseDto["reason"],
    title: string,
    reportCount: number,
    minutes: number,
    extra: Partial<ReportCaseDto> = {},
  ): State["reports"][number] => {
    const p = listings[i];
    const listing = getPropertyDetail(p.slug)!;
    return {
      id: `RP-${5521 + i}`,
      source: "seed",
      severity: reasonSeverity[reason],
      status: "open",
      reason,
      title,
      listing: { code: listing.code, slug: p.slug, title: p.title, hidden: reportCount >= REPORT_AUTO_HIDE },
      reported: {
        userId: `user_${20000 + i * 31}`,
        name: p.agent.name,
        accountAgeDays: 30 + i * 41,
        listings: 2 + i,
        suspended: false,
      },
      reportCount,
      systemFlag: false,
      reporters: { count: reportCount, verified: reportCount },
      quotes: [],
      evidenceMessages: 0,
      openedAt: iso(now - minutes * MIN),
      ...extra,
    };
  };
  const scammer = { userId: "user_88213", name: "user_88213", accountAgeDays: 1, listings: 4, suspended: false };
  return [
    c(0, "scam", "มิจฉาชีพ: ขอโอนมัดจำก่อนดูห้อง", 3, 25, {
      reported: scammer,
      quotes: [
        {
          text: "ให้โอนมัดจำ 10,000 ผ่าน LINE ก่อน บอกว่ามีคนจองต่อคิว",
          at: iso(now - 25 * MIN),
          reporter: "ผู้แจ้ง #1",
        },
        { text: "ส่งเลขบัญชีส่วนตัวมาในแชต ไม่ยอมนัดดูห้อง", at: iso(now - 18 * MIN), reporter: "ผู้แจ้ง #2" },
      ],
      evidenceMessages: 2,
      assignee: "นภัส",
    }),
    c(1, "duplicate", "ใช้รูปของประกาศอื่น", 1, 60, { reported: scammer, systemFlag: true }),
    c(2, "scam", "มิจฉาชีพ: อ้างเป็นเจ้าของแต่ไม่มีโฉนด", 2, 95),
    c(3, "unavailable", "ขายไปแล้วแต่ยังเปิดประกาศ", 2, 5 * 60),
    c(4, "inaccurate", "ขนาดห้องไม่ตรงกับที่ระบุ", 1, 8 * 60),
    c(5, "inaccurate", "ราคาไม่ตรงกับที่คุยในแชต", 1, 26 * 60, { severity: "low" }),
    c(6, "other", "ผู้ลงประกาศตอบแชตไม่สุภาพ", 1, 30 * 60),
    c(7, "inaccurate", "รูปไม่ใช่ห้องจริง", 1, 10 * 60, { status: "awaiting_reporter" }),
    c(8, "unavailable", "ปล่อยเช่าไปแล้ว", 1, 20 * 60, { status: "awaiting_reporter" }),
    c(9, "other", "ข้อมูลส่วนกลางไม่ครบ", 1, 40 * 60, { status: "awaiting_reporter" }),
    c(10, "scam", "ขอค่าดูห้องล่วงหน้า", 4, 3 * 24 * 60, {
      status: "resolved",
      resolution: { action: "suspend", by: "นภัส", at: iso(now - 2 * 24 * HOUR), note: "ยืนยันจากแชต 3 ราย" },
    }),
    c(11, "inaccurate", "ราคาเปลี่ยนแต่ไม่แก้ประกาศ", 1, 4 * 24 * 60, {
      status: "dismissed",
      resolution: { action: "dismiss", by: "ภูมิ", at: iso(now - 3 * 24 * HOUR), note: "ผู้ลงแก้ราคาแล้ว" },
    }),
  ];
}

const thaiNames = [
  ["วรวุฒิ ทองดี", "อิสระ", "นาย"],
  ["ชนิดา วงศ์ทอง", "บ้านดี พร็อพเพอร์ตี้", "นางสาว"],
  ["อนุชา แก้วใส", "อิสระ", "นาย"],
  ["มาลัย สุขเจริญ", "ไอคอน เอสเตท", "นางสาว"],
  ["ปิยะพงษ์ ศรีวงศ์", "อิสระ", "นาย"],
  ["สุดารัตน์ มีสุข", "ซิตี้ โฮม เอเจนซี่", "นางสาว"],
  ["กมล ใจงาม", "อิสระ", "นางสาว"],
  ["ธีรภัทร นาคสวัสดิ์", "ริเวอร์ไซด์ เรียลตี้", "นาย"],
  ["พิมพ์ชนก รุ่งเรือง", "อิสระ", "นางสาว"],
  ["ณัฐวุฒิ บุญมา", "อิสระ", "นาย"],
  ["อรอุมา ทองคำ", "สุขุมวิท เรียลตี้", "นางสาว"],
  ["ศุภชัย เพชรดี", "อิสระ", "นาย"],
  ["จิราพร แสงทอง", "อิสระ", "นางสาว"],
  ["ภานุวัฒน์ สายบุญ", "ไอคอน เอสเตท", "นาย"],
  ["รัชนี วงศ์ใหญ่", "อิสระ", "นางสาว"],
  ["สมศักดิ์ ดีมาก", "อิสระ", "นาย"],
  ["อัญชลี ศรีสุข", "บ้านดี พร็อพเพอร์ตี้", "นางสาว"],
  ["ประเสริฐ ทองแท้", "อิสระ", "นาย"],
  ["นภา ใจดี", "อิสระ", "นางสาว"],
  ["เกียรติศักดิ์ วงศ์ดี", "ซิตี้ โฮม เอเจนซี่", "นาย"],
  ["วิภาวรรณ สุขใจ", "อิสระ", "นางสาว"],
];

function seedKyc(now: number): KycApplicationDto[] {
  const statuses: KycApplicationStatus[] = [
    ...Array<KycApplicationStatus>(12).fill("pending"),
    ...Array<KycApplicationStatus>(4).fill("needs_info"),
    ...Array<KycApplicationStatus>(3).fill("approved"),
    ...Array<KycApplicationStatus>(2).fill("rejected"),
  ];
  const submittedHours = [19, 15, 9, 4, 3, 2.5, 2, 1.5, 1, 0.8, 0.5, 0.2];
  return statuses.map((status, i) => {
    const [name, affiliation, title] = thaiNames[i];
    // One pending applicant whose birth date and face do not match, so the review has a hard case.
    const mismatch = i === 6;
    const dob = `${(i % 27) + 1} มี.ค. 25${30 + (i % 9)}`;
    const decided = status !== "pending";
    return {
      id: `KYC-${3310 - i}`,
      userId: `user_${30000 + i * 17}`,
      name,
      affiliation,
      attempt: i === 2 ? 2 : 1,
      status,
      submittedAt: iso(now - (submittedHours[i] ?? 24 + i) * HOUR),
      idCard: {
        ocrName: `${title}${name}`,
        idMasked: `1-xxxx-xxxxx-${10 + i}-3`,
        expiresYear: 2572 + (i % 4),
      },
      faceMatch: mismatch ? 0.71 : 0.9 + (i % 9) / 100,
      checks: [
        { label: "ชื่อ นามสกุล", entered: name, fromDocument: name, result: "match", resultLabel: "ตรง" },
        mismatch
          ? {
              label: "วันเกิด",
              entered: dob,
              fromDocument: `${(i % 27) + 2} มี.ค. 25${30 + (i % 9)}`,
              result: "mismatch",
              resultLabel: "ไม่ตรง",
            }
          : { label: "วันเกิด", entered: dob, fromDocument: dob, result: "match", resultLabel: "ตรง" },
        { label: "บัตรซ้ำกับบัญชีอื่น", entered: "ไม่พบ", result: "pass", resultLabel: "ผ่าน" },
        affiliation === "อิสระ"
          ? { label: "สังกัดบริษัท", entered: "ไม่ได้แนบ (อิสระ)", result: "optional", resultLabel: "ไม่บังคับ" }
          : {
              label: "สังกัดบริษัท",
              entered: affiliation,
              fromDocument: "หนังสือรับรองบริษัท",
              result: "match",
              resultLabel: "ตรง",
            },
      ],
      ...(decided && {
        decidedAt: iso(now - (30 + i) * HOUR),
        decidedBy: "อรวี",
        note:
          status === "needs_info"
            ? "เซลฟีไม่ชัด กรุณาถ่ายใหม่ในที่สว่าง"
            : status === "rejected"
              ? "เอกสารไม่ตรงกับผู้สมัคร"
              : undefined,
      }),
    };
  });
}

function seed(now: number): State {
  const reports = seedReports(now);
  for (const c of reports) if (c.resolution?.action === "suspend") c.reported.suspended = true;
  return {
    moderation: seedModeration(now),
    reports,
    kyc: seedKyc(now),
    syncedReports: [],
    // The scam case closed two days ago suspended its account.
    restrictions: {
      [reports.find((c) => c.resolution?.action === "suspend")!.reported.userId]: {
        status: "suspended",
        at: iso(now - 2 * 24 * HOUR),
        by: "นภัส",
        reason: "มิจฉาชีพ ขอค่าดูห้องล่วงหน้า",
      },
    },
  };
}

// --- Moderation -------------------------------------------------------------

const pendingLike = (s: ModerationTab) => s === "pending" || s === "spot_check";

export function listModeration(q: ListModerationQuery) {
  const { moderation } = load();
  const tab = q.tab ?? "pending";
  const counts = { pending: 0, returned: 0, spot_check: 0, done: 0 } satisfies Record<ModerationTab, number>;
  for (const i of moderation) counts[i.status] += 1;
  const rows = moderation
    .filter((i) => i.status === tab)
    .filter((i) => (q.flags === "flagged" ? i.flags.length > 0 : q.flags === "clean" ? i.flags.length === 0 : true))
    .filter((i) => !q.poster || q.poster === "all" || i.poster.kind === q.poster)
    .filter((i) => !q.paid || Boolean(i.promotion))
    .sort(
      tab === "done" || tab === "returned"
        ? (a, b) => Date.parse(b.decision?.at ?? b.submittedAt) - Date.parse(a.decision?.at ?? a.submittedAt)
        : compareModeration(q.sort ?? "paid_first"),
    );
  const totalPages = Math.max(1, Math.ceil(rows.length / MODERATION_PAGE_SIZE));
  const page = Math.min(Math.max(1, q.page ?? 1), totalPages);
  return {
    data: rows.slice((page - 1) * MODERATION_PAGE_SIZE, page * MODERATION_PAGE_SIZE),
    meta: { page, limit: MODERATION_PAGE_SIZE, total: rows.length, totalPages },
    counts,
  };
}

/** The review order used by "เริ่มตรวจต่อเนื่อง": pending, paid first, then oldest. */
function reviewOrder(status: ModerationTab = "pending") {
  return load()
    .moderation.filter((i) => i.status === status)
    .sort(compareModeration("paid_first"));
}

export function getModerationItem(id: string) {
  const item = load().moderation.find((i) => i.id === id);
  if (!item) return undefined;
  const order = reviewOrder(item.status === "spot_check" ? "spot_check" : "pending");
  const index = order.findIndex((i) => i.id === id);
  return {
    data: item,
    queue: {
      position: index + 1,
      total: order.length,
      prevId: index > 0 ? order[index - 1].id : undefined,
      nextId: index >= 0 ? order[index + 1]?.id : order[0]?.id,
    },
  };
}

export type DecisionResult =
  { ok: true; item: ModerationItemDto; nextId?: string } | { ok: false; reason: "missing" | "decided" };

/** The item after `id` in the review order taken before the decision (wrapping to the start). */
function nextAfter(order: ModerationItemDto[], id: string) {
  const index = order.findIndex((i) => i.id === id);
  const rest = [...order.slice(index + 1), ...order.slice(0, index)];
  return rest.find((i) => i.status === "pending" || i.status === "spot_check")?.id;
}

export function approveListing(id: string, admin: AdminUserDto, now = Date.now()): DecisionResult {
  const item = load().moderation.find((i) => i.id === id);
  if (!item) return { ok: false, reason: "missing" };
  if (!pendingLike(item.status)) return { ok: false, reason: "decided" };
  const from = item.status;
  const order = reviewOrder(from);
  item.status = "done";
  item.decision = { outcome: "approved", reasons: [], message: "", by: admin.name, at: iso(now) };
  recordAdminAction(
    admin,
    from === "spot_check" ? `ยืนยันผลสุ่มตรวจ ${id}` : `อนุมัติ ${id}`,
    item.promotion ? `เริ่มโปรโมต ${item.promotion.label} ฿${item.promotion.amount}` : "",
    now,
  );
  save();
  return { ok: true, item, nextId: nextAfter(order, id) };
}

export function returnListing(
  id: string,
  admin: AdminUserDto,
  reasons: ModerationReturnReason[],
  message: string,
  now = Date.now(),
): DecisionResult {
  const item = load().moderation.find((i) => i.id === id);
  if (!item) return { ok: false, reason: "missing" };
  if (!pendingLike(item.status)) return { ok: false, reason: "decided" };
  const order = reviewOrder(item.status);
  item.status = "returned";
  item.decision = { outcome: "returned", reasons, message, by: admin.name, at: iso(now) };
  recordAdminAction(admin, `ตีกลับ ${id}`, message, now);
  // Suspected scams go to the safety team as a high-severity report.
  if (reasons.includes("scam")) {
    const s = load();
    s.reports.push({
      id: `RP-M-${id}`,
      source: "seed",
      severity: "high",
      status: "open",
      reason: "scam",
      title: `ส่งจากการตรวจประกาศ: ${item.listing.title}`,
      listing: { code: id, slug: item.listing.slug, title: item.listing.title, hidden: true },
      reported: {
        userId: item.poster.userId,
        name: item.poster.name,
        accountAgeDays: item.poster.accountAgeDays,
        listings: item.poster.listings,
        suspended: false,
      },
      reportCount: 0,
      systemFlag: true,
      reporters: { count: 0, verified: 0 },
      quotes: [{ text: message, at: iso(now), reporter: `ผู้ตรวจ ${admin.name}` }],
      evidenceMessages: 0,
      openedAt: iso(now),
    });
  }
  save();
  return { ok: true, item, nextId: nextAfter(order, id) };
}

export function bulkApprove(ids: string[], admin: AdminUserDto, now = Date.now()): number {
  return ids.filter((id) => approveListing(id, admin, now).ok).length;
}

// --- Reports ----------------------------------------------------------------

/** Folds reports filed on the site (D6) into cases, one open case per listing. */
function syncSiteReports() {
  const s = load();
  let changed = false;
  for (const r of listReports()) {
    if (s.syncedReports.includes(r.id)) continue;
    s.syncedReports.push(r.id);
    changed = true;
    let c = s.reports.find((x) => x.source === "site" && x.listing.slug === r.slug && x.status === "open");
    if (!c) {
      const listing = getPropertyDetail(r.slug);
      if (!listing) continue;
      c = {
        id: `RP-${String(6000 + s.reports.length)}`,
        source: "site",
        severity: reasonSeverity[r.reason],
        status: "open",
        reason: r.reason,
        title: reportReasonTitles[r.reason],
        listing: { code: listing.code, slug: r.slug, title: listing.title, hidden: false },
        reported: {
          userId: `user_${r.slug}`,
          name: listing.poster.name,
          accountAgeDays: 120,
          listings: listing.poster.activeListings,
          suspended: false,
        },
        reportCount: 0,
        systemFlag: false,
        reporters: { count: 0, verified: 0 },
        quotes: [],
        evidenceMessages: 0,
        openedAt: r.createdAt,
      };
      s.reports.push(c);
    }
    c.reportCount += 1;
    c.reporters = { count: c.reporters.count + 1, verified: c.reporters.verified };
    if (reasonSeverity[r.reason] === "high") c.severity = "high";
    if (r.details) c.quotes.push({ text: r.details, at: r.createdAt, reporter: `ผู้แจ้ง #${c.reportCount}` });
    if (c.reportCount >= REPORT_AUTO_HIDE) c.listing.hidden = true;
  }
  if (changed) save();
}

const tabOf = (status: ReportCaseDto["status"]): ReportCaseTab =>
  status === "open" ? "open" : status === "awaiting_reporter" ? "awaiting_reporter" : "closed";

function toCase(c: State["reports"][number]): ReportCaseDto {
  const copy: Partial<State["reports"][number]> = { ...c };
  delete copy.source;
  return copy as ReportCaseDto;
}

export function listReportCases(tab: ReportCaseTab) {
  syncSiteReports();
  const { reports } = load();
  const counts = { open: 0, awaiting_reporter: 0, closed: 0 } satisfies Record<ReportCaseTab, number>;
  for (const c of reports) counts[tabOf(c.status)] += 1;
  const rows = reports.filter((c) => tabOf(c.status) === tab);
  rows.sort(
    tab === "closed"
      ? (a, b) => Date.parse(b.resolution?.at ?? b.openedAt) - Date.parse(a.resolution?.at ?? a.openedAt)
      : compareReports,
  );
  return { data: rows.map(toCase), counts };
}

export type ReportActionResult = { ok: true; case: ReportCaseDto } | { ok: false; reason: "missing" | "closed" };

const actionAudit: Record<ReportAction, string> = {
  suspend: "ระงับบัญชี",
  hide_listing: "ซ่อนประกาศ",
  warn: "ส่งคำเตือนถึง",
  dismiss: "ปิดรายงานไม่พบความผิด",
  request_info: "ขอข้อมูลเพิ่มจากผู้แจ้ง",
};

export function actOnReport(
  id: string,
  action: ReportAction,
  admin: AdminUserDto,
  note = "",
  now = Date.now(),
): ReportActionResult {
  const s = load();
  const c = s.reports.find((x) => x.id === id);
  if (!c) return { ok: false, reason: "missing" };
  if (tabOf(c.status) === "closed") return { ok: false, reason: "closed" };
  if (action === "request_info") {
    c.status = "awaiting_reporter";
  } else {
    c.status = action === "dismiss" ? "dismissed" : "resolved";
    c.resolution = { action, by: admin.name, at: iso(now), note };
  }
  c.assignee ??= admin.name;
  if (action === "hide_listing" || action === "suspend") c.listing.hidden = true;
  if (action === "suspend") {
    restrictUser(c.reported.userId, {
      status: "suspended",
      at: iso(now),
      by: admin.name,
      reason: `${c.title} (${c.id})`,
    });
  }
  const target =
    action === "suspend" || action === "warn"
      ? `${actionAudit[action]} ${c.reported.name}`
      : action === "hide_listing"
        ? `${actionAudit[action]} ${c.listing.code}`
        : actionAudit[action];
  recordAdminAction(admin, target, [c.id, note].filter(Boolean).join(" · "), now);
  save();
  return { ok: true, case: toCase(c) };
}

/** Users suspended from a report; the users page (FE-22) reads this. */
export const suspendedUsers = () =>
  Object.entries(load().restrictions)
    .filter(([, r]) => r.status === "suspended")
    .map(([id]) => id);

export const userRestriction = (userId: string): UserRestriction | undefined => load().restrictions[userId];

/** Suspends or bans an account: its report cases show it and its listings hide. */
export function restrictUser(userId: string, restriction: UserRestriction) {
  const s = load();
  s.restrictions[userId] = restriction;
  for (const c of s.reports) {
    if (c.reported.userId !== userId) continue;
    c.reported.suspended = true;
    c.listing.hidden = true;
  }
  save();
}

export function liftRestriction(userId: string) {
  const s = load();
  delete s.restrictions[userId];
  for (const c of s.reports) if (c.reported.userId === userId) c.reported.suspended = false;
  save();
}

/** Read-only view of the queues, for the users page (E6). */
export function queueSnapshot(): Readonly<Pick<State, "moderation" | "reports" | "kyc">> {
  const { moderation, reports, kyc } = load();
  return { moderation, reports, kyc };
}

// --- KYC --------------------------------------------------------------------

export function listKycApplications(status: KycApplicationStatus) {
  const { kyc } = load();
  const counts = { pending: 0, needs_info: 0, approved: 0, rejected: 0 } satisfies Record<KycApplicationStatus, number>;
  for (const k of kyc) counts[k.status] += 1;
  const rows = kyc
    .filter((k) => k.status === status)
    .sort((a, b) =>
      status === "pending"
        ? Date.parse(a.submittedAt) - Date.parse(b.submittedAt)
        : Date.parse(b.decidedAt ?? b.submittedAt) - Date.parse(a.decidedAt ?? a.submittedAt),
    );
  return { data: rows, counts };
}

export function viewKycDocuments(id: string, admin: AdminUserDto, reason: string, now = Date.now()) {
  const k = load().kyc.find((x) => x.id === id);
  if (!k) return undefined;
  recordAdminAction(admin, `เปิดดูเอกสาร ${id}`, `เหตุผล: ${reason}`, now);
  return k;
}

export type KycDecisionResult =
  { ok: true; application: KycApplicationDto } | { ok: false; reason: "missing" | "decided" };

const decisionStatus: Record<KycDecision, KycApplicationStatus> = {
  approve: "approved",
  reject: "rejected",
  request_info: "needs_info",
};
const decisionAudit: Record<KycDecision, string> = {
  approve: "อนุมัติ",
  reject: "ปฏิเสธ",
  request_info: "ขอเอกสารเพิ่ม",
};

export function decideKyc(
  id: string,
  decision: KycDecision,
  admin: AdminUserDto,
  note = "",
  now = Date.now(),
): KycDecisionResult {
  const k = load().kyc.find((x) => x.id === id);
  if (!k) return { ok: false, reason: "missing" };
  if (k.status !== "pending") return { ok: false, reason: "decided" };
  Object.assign(k, {
    status: decisionStatus[decision],
    decidedAt: iso(now),
    decidedBy: admin.name,
    note: note || undefined,
  });
  recordAdminAction(admin, `${decisionAudit[decision]} ${id} ${k.name}`, note, now);
  save();
  return { ok: true, application: k };
}

// --- Counts -----------------------------------------------------------------

export function queueCounts() {
  syncSiteReports();
  const s = load();
  return {
    moderation: s.moderation.filter((i) => i.status === "pending").length,
    reports: s.reports.filter((c) => c.status === "open").length,
    kyc: s.kyc.filter((k) => k.status === "pending").length,
  };
}

/** Figures the dashboard (E1) shows for the queues. */
export function queueKpis(now = Date.now()) {
  const s = load();
  const pending = s.moderation.filter((i) => i.status === "pending");
  const open = s.reports.filter((c) => c.status === "open");
  const kyc = s.kyc.filter((k) => k.status === "pending");
  const oldestKyc = Math.min(now, ...kyc.map((k) => Date.parse(k.submittedAt)));
  return {
    pendingListings: {
      count: pending.length,
      overSla: pending.filter((i) => now - Date.parse(i.submittedAt) > 2 * HOUR).length,
    },
    openReports: { count: open.length, scam: open.filter((c) => c.reason === "scam").length },
    pendingKyc: { count: kyc.length, oldestHours: Math.floor((now - oldestKyc) / HOUR) },
  };
}

export function resetMockAdminQueues(now = Date.now()) {
  state = seed(now);
}
