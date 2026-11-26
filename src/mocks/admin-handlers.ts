import type { DefaultBodyType, PathParams } from "msw";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { canOpen, roleLabels } from "@/lib/admin";
import { bangkokDay } from "@/lib/format";
import type {
  AdminPaymentDto,
  AdminUserAction,
  AdminUserActionRequest,
  AdminUserKind,
  AdminUserResponse,
  AdminUserStatus,
  CmsArticleResponse,
  GetAdminRevenueResponse,
  GetPromoSlotsResponse,
  ListAdminPaymentsResponse,
  ListAdminUsersResponse,
  ListCmsArticlesResponse,
  MovePinConflict,
  MovePinRequest,
  PublishCmsArticleRequest,
  RefundDecisionRequest,
  RevealPhoneResponse,
  SaveCmsArticleRequest,
  UpdatePromoSettingsRequest,
  BulkApproveRequest,
  GetModerationItemResponse,
  KycApplicationResponse,
  KycApplicationStatus,
  KycDecision,
  KycDecisionRequest,
  ListKycApplicationsResponse,
  ListModerationResponse,
  ListReportCasesResponse,
  ModerationDecisionResponse,
  ModerationReturnReason,
  ModerationSort,
  ModerationTab,
  ReportAction,
  ReportActionRequest,
  ReportCaseResponse,
  ReportCaseTab,
  ReturnListingRequest,
  ViewKycDocumentsRequest,
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
  currentAdmin,
  inviteAdmin,
  listAdminRoles,
  listAuditLog,
  startAdminLogin,
  verifyAdminCode,
} from "./admin";
import {
  actOnReport,
  approveListing,
  bulkApprove,
  decideKyc,
  getModerationItem,
  listKycApplications,
  listModeration,
  listReportCases,
  queueCounts,
  returnListing,
  viewKycDocuments,
} from "./admin-queues";
import {
  actOnUser,
  adminRevenue,
  allAdminPayments,
  cmsErrors,
  createCms,
  decideRefund,
  getAdminUser,
  getCms,
  listAdminPayments,
  listAdminUsers,
  listCms,
  movePin,
  promoSettingsErrors,
  promoWeek,
  publishCms,
  revealPhone,
  revenueMonths,
  saveCms,
  updatePromoSettings,
} from "./admin-data";
import { endpoint, errorResponse, readBody, writeScenario } from "./http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const moderationTabs: readonly ModerationTab[] = ["pending", "returned", "spot_check", "done"];
const moderationSorts: readonly ModerationSort[] = ["paid_first", "oldest", "newest"];
const returnReasons: readonly ModerationReturnReason[] = [
  "contact_in_photo",
  "price",
  "incomplete",
  "duplicate",
  "scam",
];
const reportTabs: readonly ReportCaseTab[] = ["open", "awaiting_reporter", "closed"];
const reportActions: readonly ReportAction[] = ["suspend", "hide_listing", "warn", "dismiss", "request_info"];
const kycTabs: readonly KycApplicationStatus[] = ["pending", "needs_info", "approved", "rejected"];
const kycDecisions: readonly KycDecision[] = ["approve", "reject", "request_info"];
const userKinds: readonly (AdminUserKind | "all")[] = ["all", "seeker", "owner", "agent", "agent_pro", "agency"];
const userStatuses: readonly (AdminUserStatus | "all")[] = ["all", "active", "suspended", "banned", "pending_kyc"];
const userActions: readonly AdminUserAction[] = ["suspend", "unsuspend", "ban", "message"];
const DAY_PARAM = /^\d{4}-\d{2}-\d{2}$/;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const decisionError = (reason: "missing" | "decided") =>
  reason === "missing" ? errorResponse(404, "Not found") : errorResponse(409, "Already decided by another reviewer");

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
    return HttpResponse.json<AdminQueueCountsResponse>({ data: queueCounts() });
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

  // --- Moderation (E2, E3) ---
  http.get(endpoint("/admin/moderation"), async ({ request }) => {
    await delay(200);
    const admin = requireAdmin("moderation");
    if (admin instanceof Response) return admin;
    const q = new URL(request.url).searchParams;
    const tab = pick(q.get("tab"), moderationTabs, "pending");
    return HttpResponse.json<ListModerationResponse>(
      listModeration({
        tab,
        flags: pick(q.get("flags"), ["any", "flagged", "clean"] as const, "any"),
        poster: pick(q.get("poster"), ["all", "agent", "owner"] as const, "all"),
        paid: q.get("paid") === "true",
        sort: pick(q.get("sort"), moderationSorts, "paid_first"),
        page: Number(q.get("page")) || 1,
      }),
    );
  }),

  http.post<PathParams, DefaultBodyType>(endpoint("/admin/moderation/approve"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("moderation");
    if (admin instanceof Response) return admin;
    const body = await readBody<BulkApproveRequest>(request);
    if (!Array.isArray(body.ids) || body.ids.length === 0) return errorResponse(400, ["ids must be a non-empty array"]);
    return HttpResponse.json({ data: { approved: bulkApprove(body.ids, admin) } });
  }),

  http.get<{ id: string }>(endpoint("/admin/moderation/:id"), async ({ params }) => {
    await delay(150);
    const admin = requireAdmin("moderation");
    if (admin instanceof Response) return admin;
    const result = getModerationItem(params.id);
    if (!result) return errorResponse(404, `Listing ${params.id} is not in the review queue`);
    return HttpResponse.json<GetModerationItemResponse>(result);
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/moderation/:id/approve"), async ({ params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("moderation");
    if (admin instanceof Response) return admin;
    const result = approveListing(params.id, admin);
    if (!result.ok) return decisionError(result.reason);
    return HttpResponse.json<ModerationDecisionResponse>({ data: result.item, nextId: result.nextId });
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/moderation/:id/return"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("moderation");
    if (admin instanceof Response) return admin;
    const body = await readBody<ReturnListingRequest>(request);
    const reasons = (Array.isArray(body.reasons) ? body.reasons : []).filter((r): r is ModerationReturnReason =>
      returnReasons.includes(r as ModerationReturnReason),
    );
    const errors: string[] = [];
    if (reasons.length === 0) errors.push("reasons must include at least one reason");
    if (!body.message?.trim()) errors.push("message is required");
    if (errors.length) return errorResponse(400, errors);
    const result = returnListing(params.id, admin, reasons, body.message!.trim());
    if (!result.ok) return decisionError(result.reason);
    return HttpResponse.json<ModerationDecisionResponse>({ data: result.item, nextId: result.nextId });
  }),

  // --- Reports (E4) ---
  http.get(endpoint("/admin/reports"), async ({ request }) => {
    await delay(200);
    const admin = requireAdmin("reports");
    if (admin instanceof Response) return admin;
    const tab = pick(new URL(request.url).searchParams.get("tab"), reportTabs, "open");
    return HttpResponse.json<ListReportCasesResponse>(listReportCases(tab));
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/reports/:id/actions"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("reports");
    if (admin instanceof Response) return admin;
    const body = await readBody<ReportActionRequest>(request);
    if (!body.action || !reportActions.includes(body.action)) return errorResponse(400, ["action is invalid"]);
    const result = actOnReport(params.id, body.action, admin, body.note?.trim() ?? "");
    if (!result.ok)
      return result.reason === "missing"
        ? errorResponse(404, "Report not found")
        : errorResponse(409, "The report is already closed");
    return HttpResponse.json<ReportCaseResponse>({ data: result.case });
  }),

  // --- KYC (E5) ---
  http.get(endpoint("/admin/kyc"), async ({ request }) => {
    await delay(200);
    const admin = requireAdmin("kyc");
    if (admin instanceof Response) return admin;
    const tab = pick(new URL(request.url).searchParams.get("tab"), kycTabs, "pending");
    return HttpResponse.json<ListKycApplicationsResponse>(listKycApplications(tab));
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/kyc/:id/view"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("kyc");
    if (admin instanceof Response) return admin;
    const body = await readBody<ViewKycDocumentsRequest>(request);
    if (!body.reason?.trim()) return errorResponse(400, ["reason is required"]);
    const application = viewKycDocuments(params.id, admin, body.reason.trim());
    if (!application) return errorResponse(404, "Application not found");
    return HttpResponse.json<KycApplicationResponse>({ data: application });
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/kyc/:id/decision"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("kyc");
    if (admin instanceof Response) return admin;
    const body = await readBody<KycDecisionRequest>(request);
    if (!body.decision || !kycDecisions.includes(body.decision)) return errorResponse(400, ["decision is invalid"]);
    if (body.decision !== "approve" && !body.note?.trim())
      return errorResponse(400, ["note is required to reject or ask for more"]);
    const result = decideKyc(params.id, body.decision, admin, body.note?.trim() ?? "");
    if (!result.ok) return decisionError(result.reason);
    return HttpResponse.json<KycApplicationResponse>({ data: result.application });
  }),

  // --- Users (E6) ---
  http.get(endpoint("/admin/users"), async ({ request }) => {
    await delay(200);
    const admin = requireAdmin("users");
    if (admin instanceof Response) return admin;
    const q = new URL(request.url).searchParams;
    return HttpResponse.json<ListAdminUsersResponse>(
      listAdminUsers({
        kind: pick(q.get("kind"), userKinds, "all"),
        status: pick(q.get("status"), userStatuses, "all"),
        joined: pick(q.get("joined"), ["all", "7d", "30d", "90d"] as const, "all"),
        q: q.get("q") ?? undefined,
        sharedWith: q.get("sharedWith") ?? undefined,
        page: Number(q.get("page")) || 1,
      }),
    );
  }),

  http.get<{ id: string }>(endpoint("/admin/users/:id"), async ({ params }) => {
    await delay(150);
    const admin = requireAdmin("users");
    if (admin instanceof Response) return admin;
    const user = getAdminUser(params.id);
    if (!user) return errorResponse(404, "User not found");
    return HttpResponse.json<AdminUserResponse>({ data: user });
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/users/:id/actions"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("users");
    if (admin instanceof Response) return admin;
    const body = await readBody<AdminUserActionRequest>(request);
    if (!body.action || !userActions.includes(body.action)) return errorResponse(400, ["action is invalid"]);
    const text = (body.action === "message" ? body.message : body.reason)?.trim() ?? "";
    if ((body.action === "suspend" || body.action === "ban") && !text)
      return errorResponse(400, ["reason is required"]);
    if (body.action === "message" && !text) return errorResponse(400, ["message is required"]);
    const result = actOnUser(params.id, body.action, admin, text);
    if (!result.ok)
      return result.reason === "missing"
        ? errorResponse(404, "User not found")
        : errorResponse(409, "Not allowed for this status");
    return HttpResponse.json<AdminUserResponse>({ data: result.user });
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/users/:id/reveal-phone"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("users");
    if (admin instanceof Response) return admin;
    const body = await readBody<{ reason: string }>(request);
    if (!body.reason?.trim()) return errorResponse(400, ["reason is required"]);
    const phone = revealPhone(params.id, admin, body.reason.trim());
    if (!phone) return errorResponse(404, "User not found");
    return HttpResponse.json<RevealPhoneResponse>({ data: { phone } });
  }),

  // --- Revenue (E7) ---
  http.get(endpoint("/admin/revenue"), async ({ request }) => {
    await delay(200);
    const admin = requireAdmin("revenue");
    if (admin instanceof Response) return admin;
    const months = revenueMonths();
    const month = new URL(request.url).searchParams.get("month") ?? months[0];
    const data = adminRevenue(month);
    if (!data) return errorResponse(404, "No data for that month");
    return HttpResponse.json<GetAdminRevenueResponse>({ data, months });
  }),

  http.get(endpoint("/admin/payments"), async ({ request }) => {
    await delay(150);
    const admin = requireAdmin("revenue");
    if (admin instanceof Response) return admin;
    const q = new URL(request.url).searchParams;
    if (q.get("all") === "true") return HttpResponse.json<{ data: AdminPaymentDto[] }>({ data: allAdminPayments() });
    return HttpResponse.json<ListAdminPaymentsResponse>(listAdminPayments(Number(q.get("page")) || 1));
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/refunds/:id"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("revenue");
    if (admin instanceof Response) return admin;
    const body = await readBody<RefundDecisionRequest>(request);
    if (body.decision !== "approve" && body.decision !== "reject") return errorResponse(400, ["decision is invalid"]);
    const result = decideRefund(params.id, body.decision, admin, body.note?.trim() ?? "");
    if (!result.ok) {
      return result.reason === "missing"
        ? errorResponse(409, "The refund request is already decided")
        : errorResponse(403, "Refunds over ฿1,000 need Finance");
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Homepage pins (E8) ---
  http.get(endpoint("/admin/promo-slots"), async ({ request }) => {
    await delay(200);
    const admin = requireAdmin("promo-slots");
    if (admin instanceof Response) return admin;
    const week = new URL(request.url).searchParams.get("week");
    return HttpResponse.json<GetPromoSlotsResponse>({
      data: promoWeek(week && DAY_PARAM.test(week) ? week : bangkokDay(new Date())),
    });
  }),

  http.post<{ id: string }, DefaultBodyType>(
    endpoint("/admin/promo-slots/pins/:id/move"),
    async ({ params, request }) => {
      const failed = await writeScenario();
      if (failed) return failed;
      const admin = requireAdmin("promo-slots");
      if (admin instanceof Response) return admin;
      const body = await readBody<MovePinRequest>(request);
      if (!body.start || !DAY_PARAM.test(body.start)) return errorResponse(400, ["start must be YYYY-MM-DD"]);
      const result = movePin(params.id, body.start, admin);
      if (result.ok) return HttpResponse.json({ data: result.pin });
      if (result.reason === "missing") return errorResponse(404, "Pin not found");
      return HttpResponse.json<MovePinConflict>(
        {
          statusCode: 409,
          message: `No room on ${result.day}`,
          error: "Conflict",
          day: result.day,
          reason: result.conflict,
        },
        { status: 409 },
      );
    },
  ),

  http.put<PathParams, DefaultBodyType>(endpoint("/admin/promo-slots/settings"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("promo-slots");
    if (admin instanceof Response) return admin;
    const body = await readBody<UpdatePromoSettingsRequest>(request);
    const errors = promoSettingsErrors(body);
    if (errors.length) return errorResponse(400, errors);
    return HttpResponse.json({ data: updatePromoSettings(body as UpdatePromoSettingsRequest, admin) });
  }),

  // --- CMS (E9) ---
  http.get(endpoint("/admin/cms"), async () => {
    await delay(150);
    const admin = requireAdmin("cms");
    if (admin instanceof Response) return admin;
    return HttpResponse.json<ListCmsArticlesResponse>({ data: listCms() });
  }),

  http.post(endpoint("/admin/cms"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("cms");
    if (admin instanceof Response) return admin;
    return HttpResponse.json<CmsArticleResponse>({ data: createCms(admin) }, { status: 201 });
  }),

  http.get<{ id: string }>(endpoint("/admin/cms/:id"), async ({ params }) => {
    await delay(150);
    const admin = requireAdmin("cms");
    if (admin instanceof Response) return admin;
    const article = getCms(params.id);
    if (!article) return errorResponse(404, "Article not found");
    return HttpResponse.json<CmsArticleResponse>({ data: article });
  }),

  http.put<{ id: string }, DefaultBodyType>(endpoint("/admin/cms/:id"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("cms");
    if (admin instanceof Response) return admin;
    if (!getCms(params.id)) return errorResponse(404, "Article not found");
    const body = await readBody<SaveCmsArticleRequest>(request);
    const { errors, slugTaken } = cmsErrors(body, params.id);
    if (errors.length) return errorResponse(400, errors);
    if (slugTaken) return errorResponse(409, "Slug is already used by another article");
    return HttpResponse.json<CmsArticleResponse>({ data: saveCms(params.id, body as SaveCmsArticleRequest, admin)! });
  }),

  http.post<{ id: string }, DefaultBodyType>(endpoint("/admin/cms/:id/publish"), async ({ params, request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const admin = requireAdmin("cms");
    if (admin instanceof Response) return admin;
    const body = await readBody<PublishCmsArticleRequest>(request);
    if (body.at && Number.isNaN(Date.parse(body.at))) return errorResponse(400, ["at must be an ISO date-time"]);
    const article = publishCms(params.id, admin, body.at);
    if (!article) return errorResponse(404, "Article not found");
    return HttpResponse.json<CmsArticleResponse>({ data: article });
  }),
];
