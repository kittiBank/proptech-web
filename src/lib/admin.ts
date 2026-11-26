import { toCsv } from "@/lib/csv";
import type { AdminRoleId, AdminSection, AuditEntryDto } from "@/types/api";

/**
 * Admin app basics shared by the UI and the mock API: roles, who may open which area, and paths.
 *
 * The admin app lives at `/admin/*` in this Next app. On its own subdomain (`ADMIN_HOST`),
 * `proxy.ts` maps `/x` to `/admin/x`; build with `NEXT_PUBLIC_ADMIN_BASE_PATH=` (empty) there so
 * links read `/x` too.
 */

export const ADMIN_BASE_PATH = (process.env.NEXT_PUBLIC_ADMIN_BASE_PATH ?? "/admin").replace(/\/+$/, "");

const at = (path: string) => `${ADMIN_BASE_PATH}${path}` || "/";

export const adminRoutes = {
  login: (next?: string) => at("/login") + (next ? `?${new URLSearchParams({ next })}` : ""),
  dashboard: at(""),
  moderation: at("/moderation"),
  listingReview: (listingId: string) => at(`/moderation/${encodeURIComponent(listingId)}`),
  reports: at("/reports"),
  kyc: at("/kyc"),
  users: at("/users"),
  revenue: at("/revenue"),
  promoSlots: at("/promo-slots"),
  cms: at("/cms"),
  roles: at("/settings/roles"),
};

export const sectionHref: Record<AdminSection, string> = {
  dashboard: adminRoutes.dashboard,
  moderation: adminRoutes.moderation,
  reports: adminRoutes.reports,
  kyc: adminRoutes.kyc,
  users: adminRoutes.users,
  revenue: adminRoutes.revenue,
  "promo-slots": adminRoutes.promoSlots,
  cms: adminRoutes.cms,
  roles: adminRoutes.roles,
};

export const roleLabels: Record<AdminRoleId, string> = {
  super_admin: "Super admin",
  moderator: "Moderator",
  kyc_reviewer: "KYC reviewer",
  finance: "Finance",
  revenue: "Revenue",
  editor: "Editor",
};

/** Areas each role may open. The dashboard is for everyone; roles and audit only for super admins. */
export const roleSections: Record<AdminRoleId, AdminSection[]> = {
  super_admin: ["dashboard", "moderation", "reports", "kyc", "users", "revenue", "promo-slots", "cms", "roles"],
  moderator: ["dashboard", "moderation", "reports", "users"],
  kyc_reviewer: ["dashboard", "kyc"],
  finance: ["dashboard", "revenue"],
  revenue: ["dashboard", "revenue", "promo-slots"],
  editor: ["dashboard", "cms"],
};

export function canOpen(role: AdminRoleId, section: AdminSection): boolean {
  return roleSections[role].includes(section);
}

/** The area a path belongs to (base path already stripped or not), for the nav and access checks. */
export function sectionOf(pathname: string): AdminSection {
  const rest = pathname.startsWith(ADMIN_BASE_PATH) ? pathname.slice(ADMIN_BASE_PATH.length) : pathname;
  const first = rest.split("/").filter(Boolean)[0];
  if (!first) return "dashboard";
  if (first === "settings") return "roles";
  const match = (Object.keys(sectionHref) as AdminSection[]).find((s) => s === first);
  return match ?? "dashboard";
}

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

/**
 * Where `proxy.ts` sends a request, given `ADMIN_HOST` (e.g. "admin.propertyhub.example"):
 * - on the admin host, `/x` is served from `/admin/x` (and `/admin/x` as is);
 * - elsewhere, `/admin/*` is hidden (`"not-found"`) once an admin host is configured;
 * - without `ADMIN_HOST` (local, preview) nothing changes and the app is at `/admin`.
 */
export function adminRewrite(
  host: string | null,
  pathname: string,
  adminHost: string | undefined,
): { to: string } | "not-found" | null {
  const target = adminHost?.trim().toLowerCase();
  if (!target) return null;
  const hostname = host?.split(":")[0].toLowerCase();
  if (hostname === target) {
    // Links built with the default `/admin` base path already point at the right page.
    return isAdminPath(pathname) ? null : { to: `/admin${pathname === "/" ? "" : pathname}` };
  }
  return isAdminPath(pathname) ? "not-found" : null;
}

/** Admin pages stay up during site maintenance, so staff can work. */
export function isAdminRequest(host: string | null, pathname: string, adminHost: string | undefined): boolean {
  const target = adminHost?.trim().toLowerCase();
  return isAdminPath(pathname) || Boolean(target && host?.split(":")[0].toLowerCase() === target);
}

/** Only same-app admin paths are allowed as a post-login target. */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return adminRoutes.dashboard;
  const inApp = ADMIN_BASE_PATH ? raw === ADMIN_BASE_PATH || raw.startsWith(`${ADMIN_BASE_PATH}/`) : true;
  return inApp && !raw.startsWith(adminRoutes.login()) ? raw : adminRoutes.dashboard;
}

/** Strips everything but digits, max 6: what the 2FA box accepts (paste-friendly). */
export function normalizeTotp(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

const auditTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

/** "11:08" in Bangkok time, as the audit log shows it. */
export const formatAuditTime = (iso: string) => auditTime.format(new Date(iso));

/** E10 "ส่งออก": the day's audit log as CSV (Bangkok date and time). */
export function auditLogCsv(date: string, entries: AuditEntryDto[]): string {
  return toCsv(
    ["วันที่", "เวลา", "ผู้ทำ", "บทบาท", "การกระทำ", "หมายเหตุ", "รหัสบันทึก"],
    entries.map((e) => [date, formatAuditTime(e.at), e.actor.name, roleLabels[e.actor.role], e.action, e.note, e.id]),
  );
}
