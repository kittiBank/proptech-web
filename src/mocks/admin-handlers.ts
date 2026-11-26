import type { DefaultBodyType, PathParams } from "msw";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { canOpen, roleLabels } from "@/lib/admin";
import { bangkokDay } from "@/lib/format";
import type {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminQueueCountsResponse,
  AdminRoleId,
  AdminSection,
  AdminSessionResponse,
  AdminUserDto,
  AdminVerifyRequest,
  CreateAdminInviteRequest,
  CreateAdminInviteResponse,
  GetAdminDashboardResponse,
  GetAdminSessionResponse,
  ListAdminRolesResponse,
  ListAuditLogResponse,
} from "@/types/api";
import {
  adminDashboard,
  adminLogout,
  adminQueueCounts,
  currentAdmin,
  inviteAdmin,
  listAdminRoles,
  listAuditLog,
  startAdminLogin,
  verifyAdminCode,
} from "./admin";
import { endpoint, errorResponse, readBody, writeScenario } from "./http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** 401 when there is no admin session (or it timed out), 403 when the role may not open `section`. */
function requireAdmin(section?: AdminSection): AdminUserDto | Response {
  const admin = currentAdmin();
  if (!admin) return errorResponse(401, "Admin sign-in required");
  if (section && !canOpen(admin.role, section)) return errorResponse(403, "Your role cannot open this area");
  return admin;
}

/** Admin app endpoints (`/admin/*`), separate from the site session. */
export const adminHandlers = [
  http.post<PathParams, DefaultBodyType>(endpoint("/admin/auth/login"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const body = await readBody<AdminLoginRequest>(request);
    if (!body.email || !body.password) return errorResponse(400, ["email and password are required"]);
    const result = startAdminLogin(body.email, body.password);
    if (!result.ok) return errorResponse(401, "Invalid email or password");
    const { challengeId, name, email, expiresAt } = result;
    return HttpResponse.json<AdminLoginResponse>({ data: { challengeId, method: "totp", name, email, expiresAt } });
  }),

  http.post<PathParams, DefaultBodyType>(endpoint("/admin/auth/2fa"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const body = await readBody<AdminVerifyRequest>(request);
    if (!body.challengeId || !body.code || !/^\d{6}$/.test(body.code)) {
      return errorResponse(400, ["challengeId and a 6-digit code are required"]);
    }
    const result = verifyAdminCode(body.challengeId, body.code);
    if (result.ok) return HttpResponse.json<AdminSessionResponse>({ data: result.admin });
    if (result.reason === "expired") return errorResponse(410, "The sign-in attempt expired, start again");
    if (result.reason === "locked") return errorResponse(429, "Too many wrong codes, start again");
    return errorResponse(401, `Wrong code, ${result.attemptsLeft} attempts left`);
  }),

  http.get(endpoint("/admin/auth/me"), async () => {
    await delay(80);
    return HttpResponse.json<GetAdminSessionResponse>({ data: currentAdmin() });
  }),

  http.post(endpoint("/admin/auth/logout"), async () => {
    await delay(80);
    adminLogout();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(endpoint("/admin/queue-counts"), async () => {
    await delay(120);
    const admin = requireAdmin();
    if (admin instanceof Response) return admin;
    return HttpResponse.json<AdminQueueCountsResponse>({ data: adminQueueCounts() });
  }),

  http.get(endpoint("/admin/dashboard"), async () => {
    await delay(250);
    const admin = requireAdmin("dashboard");
    if (admin instanceof Response) return admin;
    return HttpResponse.json<GetAdminDashboardResponse>({ data: adminDashboard() });
  }),

  http.get(endpoint("/admin/roles"), async () => {
    await delay(150);
    const admin = requireAdmin("roles");
    if (admin instanceof Response) return admin;
    return HttpResponse.json<ListAdminRolesResponse>({ data: listAdminRoles() });
  }),

  http.get(endpoint("/admin/audit-log"), async ({ request }) => {
    await delay(150);
    const admin = requireAdmin("roles");
    if (admin instanceof Response) return admin;
    const date = new URL(request.url).searchParams.get("date") ?? bangkokDay(new Date());
    if (!DAY.test(date)) return errorResponse(400, ["date must be YYYY-MM-DD"]);
    return HttpResponse.json<ListAuditLogResponse>({ data: listAuditLog(date) });
  }),

  http.post<PathParams, DefaultBodyType>(endpoint("/admin/invites"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("roles");
    if (admin instanceof Response) return admin;
    const body = await readBody<CreateAdminInviteRequest>(request);
    const errors: string[] = [];
    if (!body.email || !EMAIL.test(body.email)) errors.push("email must be a valid email");
    if (!body.role || !(body.role in roleLabels)) errors.push("role is invalid");
    if (errors.length) return errorResponse(400, errors);
    const result = inviteAdmin(admin, body.email!, body.role as AdminRoleId);
    if (!result.ok) return errorResponse(409, "This email is already an admin or invited");
    return HttpResponse.json<CreateAdminInviteResponse>(
      { data: { email: body.email!.trim().toLowerCase(), role: body.role!, expiresAt: result.expiresAt } },
      { status: 201 },
    );
  }),
];
