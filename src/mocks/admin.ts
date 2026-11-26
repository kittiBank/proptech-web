import { bangkokDay } from "@/lib/format";
import { roleLabels, roleSections } from "@/lib/admin";
import {
  ADMIN_IDLE_MINUTES,
  type AdminDashboardDto,
  type AdminRoleDto,
  type AdminRoleId,
  type AdminUserDto,
  type AuditEntryDto,
} from "@/types/api";
import { queueKpis } from "./admin-queues";
import { DEMO_ADMIN } from "./constants";

/**
 * Mock admin accounts, 2FA challenges, the admin session and the audit log (E1, E10, E11).
 * In the browser the session lives in sessionStorage (closing the tab signs out); the rest is
 * in memory. Every sign-in, sign-out and admin action is appended to the audit log.
 */

type AdminAccount = AdminUserDto & { password: string };

const SESSION_KEY = "propertyhub:mock:admin-session";
/** Audit log and pending invites, kept with the session so a reload does not lose them. */
const LOG_KEY = "propertyhub:mock:admin-log";
const CHALLENGE_MINUTES = 5;
const MAX_CODE_ATTEMPTS = 5;
const MINUTE = 60_000;

const accounts: AdminAccount[] = [
  {
    id: "a-1",
    name: "นภัส",
    email: DEMO_ADMIN.email,
    password: DEMO_ADMIN.password,
    role: "super_admin",
    title: "Moderator lead",
  },
  {
    id: "a-2",
    name: "ภูมิ",
    email: "poom@propertyhub.co.th",
    password: DEMO_ADMIN.password,
    role: "moderator",
    title: "Moderator",
  },
  {
    id: "a-3",
    name: "อรวี",
    email: "orawee@propertyhub.co.th",
    password: DEMO_ADMIN.password,
    role: "kyc_reviewer",
    title: "KYC reviewer",
  },
  {
    id: "a-4",
    name: "ภาคิน",
    email: "phakin@propertyhub.co.th",
    password: DEMO_ADMIN.password,
    role: "finance",
    title: "Finance",
  },
  {
    id: "a-5",
    name: "ธีรวัฒน์",
    email: "teerawat@propertyhub.co.th",
    password: DEMO_ADMIN.password,
    role: "super_admin",
    title: "Head of Trust & Safety",
  },
];

/** Headcount per role, including staff the mock has no login for. */
const roleMembers: Record<AdminRoleId, number> = {
  super_admin: 2,
  moderator: 9,
  kyc_reviewer: 3,
  finance: 2,
  revenue: 1,
  editor: 4,
};

const roleDescriptions: Record<AdminRoleId, string> = {
  super_admin: "ทุกอย่าง รวมถึงจัดการสิทธิ์",
  moderator: "ตรวจประกาศ รายงาน ระงับชั่วคราว",
  kyc_reviewer: "ดูเอกสารยืนยันตัวตน อนุมัติ/ปฏิเสธ",
  finance: "รายได้ คืนเงิน ส่งออกบัญชี",
  revenue: "ราคาและช่องโปรโมต",
  editor: "บทความและหน้าเนื้อหา",
};

interface Challenge {
  adminId: string;
  expiresAt: number;
  attempts: number;
}

interface Session {
  adminId: string;
  lastSeenAt: number;
}

let challenges = new Map<string, Challenge>();
let session: Session | null | undefined;
let audit: AuditEntryDto[] = [];
let invited = new Set<string>();
let seq = 0;

const inBrowser = () => typeof window !== "undefined" && process.env.NODE_ENV !== "test";

function loadSession(): Session | null {
  if (session !== undefined) return session;
  try {
    const raw = inBrowser() ? window.sessionStorage.getItem(SESSION_KEY) : null;
    session = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    session = null;
  }
  return session;
}

function saveSession(next: Session | null) {
  session = next;
  try {
    if (!inBrowser()) return;
    if (next) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Memory only.
  }
}

function saveLog() {
  try {
    if (inBrowser()) window.sessionStorage.setItem(LOG_KEY, JSON.stringify({ audit, invited: [...invited], seq }));
  } catch {
    // Memory only.
  }
}

function loadLog(): boolean {
  try {
    const raw = inBrowser() ? window.sessionStorage.getItem(LOG_KEY) : null;
    if (!raw) return false;
    const saved = JSON.parse(raw) as { audit: AuditEntryDto[]; invited: string[]; seq: number };
    audit = saved.audit;
    invited = new Set(saved.invited);
    seq = saved.seq;
    return true;
  } catch {
    return false;
  }
}

const toDto = ({ id, name, email, role, title }: AdminAccount): AdminUserDto => ({ id, name, email, role, title });

function record(actor: AdminAccount, action: string, note = "", now = Date.now()) {
  audit.unshift({
    id: `AU-${(++seq).toString().padStart(5, "0")}`,
    at: new Date(now).toISOString(),
    actor: { name: actor.name, role: actor.role },
    action,
    note,
  });
  saveLog();
}

/** Today's earlier activity, at fixed Bangkok times (E10). */
function seedAudit(now = Date.now()) {
  const day = bangkokDay(new Date(now));
  const at = (hhmm: string) => new Date(`${day}T${hhmm}:00+07:00`).toISOString();
  const entries: [string, AdminRoleId, string, string, string][] = [
    ["11:08", "super_admin", "นภัส", "ระงับบัญชี user_88213", "RP-5521"],
    ["11:02", "super_admin", "นภัส", "ตีกลับ PH-2290 รูปมีเบอร์", ""],
    ["10:51", "kyc_reviewer", "อรวี", "เปิดดูเอกสาร KYC-3304", "เหตุผล: ตรวจตามคิว"],
    ["10:40", "finance", "ภาคิน", "อนุมัติคืนเงิน PAY-76941 ฿590", ""],
    ["09:30", "super_admin", "ธีรวัฒน์", "เพิ่มสิทธิ์ Moderator ให้ ภูมิ", ""],
  ];
  audit = entries
    .map(([time, role, name, action, note], i) => ({
      id: `AU-SEED-${i + 1}`,
      at: at(time),
      actor: { name, role },
      action,
      note,
    }))
    // Seed times later than now would read as the future.
    .filter((e) => Date.parse(e.at) <= now);
}

// --- Auth -------------------------------------------------------------------

export type AdminLoginResult =
  { ok: true; challengeId: string; name: string; email: string; expiresAt: string } | { ok: false };

export function startAdminLogin(email: string, password: string, now = Date.now()): AdminLoginResult {
  const account = accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || account.password !== password) return { ok: false };
  const challengeId = `ch-${now.toString(36)}-${(++seq).toString(36)}`;
  const expiresAt = now + CHALLENGE_MINUTES * MINUTE;
  challenges.set(challengeId, { adminId: account.id, expiresAt, attempts: 0 });
  return {
    ok: true,
    challengeId,
    name: account.name,
    email: account.email,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export type AdminVerifyResult =
  { ok: true; admin: AdminUserDto } | { ok: false; reason: "wrong_code" | "locked" | "expired"; attemptsLeft?: number };

export function verifyAdminCode(challengeId: string, code: string, now = Date.now()): AdminVerifyResult {
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.expiresAt <= now) return { ok: false, reason: "expired" };
  const account = accounts.find((a) => a.id === challenge.adminId)!;
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "locked" };
  if (code !== DEMO_ADMIN.code) {
    challenge.attempts += 1;
    if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
      record(account, "ล็อกการยืนยัน 2FA หลังใส่รหัสผิด 5 ครั้ง", "", now);
      return { ok: false, reason: "locked" };
    }
    return { ok: false, reason: "wrong_code", attemptsLeft: MAX_CODE_ATTEMPTS - challenge.attempts };
  }
  challenges.delete(challengeId);
  saveSession({ adminId: account.id, lastSeenAt: now });
  record(account, "เข้าสู่ระบบ", "2FA: แอป Authenticator", now);
  return { ok: true, admin: toDto(account) };
}

/** The signed-in admin, or null when signed out or idle too long. Each call counts as activity. */
export function currentAdmin(now = Date.now()): AdminUserDto | null {
  const s = loadSession();
  if (!s) return null;
  if (now - s.lastSeenAt > ADMIN_IDLE_MINUTES * MINUTE) {
    saveSession(null);
    return null;
  }
  const account = accounts.find((a) => a.id === s.adminId);
  if (!account) return null;
  saveSession({ ...s, lastSeenAt: now });
  return toDto(account);
}

export function adminLogout(now = Date.now()) {
  const s = loadSession();
  const account = s && accounts.find((a) => a.id === s.adminId);
  if (account) record(account, "ออกจากระบบ", "", now);
  saveSession(null);
}

/** Writes an admin action to the audit log (every queue decision calls this). */
export function recordAdminAction(by: AdminUserDto, action: string, note = "", now = Date.now()) {
  const actor = accounts.find((a) => a.id === by.id);
  if (actor) record(actor, action, note, now);
}

// --- Data -------------------------------------------------------------------

export function listAdminRoles(): AdminRoleDto[] {
  return (Object.keys(roleLabels) as AdminRoleId[]).map((id) => ({
    id,
    name: roleLabels[id],
    description: roleDescriptions[id],
    members: roleMembers[id],
    sections: roleSections[id],
  }));
}

/** `date` is a Bangkok day, "2026-11-26". */
export function listAuditLog(date: string): AuditEntryDto[] {
  return audit.filter((e) => bangkokDay(new Date(e.at)) === date);
}

export type InviteResult = { ok: true; expiresAt: string } | { ok: false; reason: "exists" };

export function inviteAdmin(by: AdminUserDto, email: string, role: AdminRoleId, now = Date.now()): InviteResult {
  const key = email.trim().toLowerCase();
  if (accounts.some((a) => a.email === key) || invited.has(key)) return { ok: false, reason: "exists" };
  invited.add(key);
  saveLog();
  const actor = accounts.find((a) => a.id === by.id)!;
  record(actor, `เชิญ ${key} เป็น ${roleLabels[role]}`, "รอยืนยันอีเมลและตั้ง 2FA", now);
  return { ok: true, expiresAt: new Date(now + 7 * 24 * 60 * MINUTE).toISOString() };
}

/** Listings queued per hour today (up to the current hour) and the 4-week average for the same weekday. */
const todayByHour = [19, 13, 8, 6, 5, 10, 22, 45, 74, 83, 98, 93, 80, 72, 66, 77, 90, 103, 114, 108, 84, 62, 43, 30];
const averageByHour = [21, 14, 9, 6, 5, 11, 24, 43, 70, 80, 92, 89, 78, 70, 64, 75, 88, 101, 112, 106, 82, 61, 42, 29];

export function adminDashboard(now = Date.now()): AdminDashboardDto {
  const hourNow = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Bangkok" }).format(now),
  );
  return {
    updatedAt: new Date(Math.floor(now / (5 * MINUTE)) * 5 * MINUTE).toISOString(),
    kpis: {
      ...queueKpis(now),
      revenueToday: { amount: 48_320, changePct: 12, comparedTo: "วันเดียวกันสัปดาห์ก่อน" },
      newListings: { count: 612, autoApprovedPct: 71 },
      newUsers: { count: 1_904, agents: 38 },
    },
    hourly: averageByHour.map((average, hour) => ({
      hour,
      count: hour <= hourNow ? todayByHour[hour] : null,
      average,
    })),
    alerts: [
      {
        id: "al-1",
        severity: "high",
        title: "บัญชีต้องสงสัย: 9 ประกาศใช้รูปชุดเดียวกัน",
        detail: "ผู้ใช้ 3 บัญชี เบอร์เดียวกัน",
        section: "users",
      },
      {
        id: "al-2",
        severity: "medium",
        title: "ประกาศแนะนำย่านอโศกเต็ม 5 วันติด",
        detail: "พิจารณาเพิ่มช่องหรือขึ้นราคา",
        section: "promo-slots",
      },
      { id: "al-3", severity: "low", title: "คืนเงิน 2 รายการรออนุมัติ", detail: "รวม ฿1,180", section: "revenue" },
    ],
    team: [
      { adminId: "a-1", name: "นภัส", reviewed: 142, avgMinutes: 4, disputedPct: 2.1 },
      { adminId: "a-2", name: "ภูมิ", reviewed: 118, avgMinutes: 6, disputedPct: 3.4 },
      { adminId: "a-3", name: "อรวี", reviewed: 97, avgMinutes: 5, disputedPct: 1.0 },
    ],
    automation: {
      autoApprovedPct: 71,
      spotCheckPct: 5,
      toReviewerPct: 26,
      autoRejectedPct: 3,
      autoRejectReasons: ["รูปซ้ำ", "เบอร์ในรูป"],
      accuracyPct: 96.4,
    },
  };
}

export function resetMockAdmin(now = Date.now()) {
  challenges = new Map();
  invited = new Set();
  saveSession(null);
  seq = 0;
  seedAudit(now);
}

if (!loadLog()) seedAudit();
