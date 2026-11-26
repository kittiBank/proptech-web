import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type {
  AdminPaymentDto,
  AdminUserActionRequest,
  AdminUserResponse,
  CmsArticleResponse,
  GetAdminRevenueResponse,
  GetPromoSlotsResponse,
  ListAdminPaymentsResponse,
  ListAdminUsersQuery,
  ListAdminUsersResponse,
  ListCmsArticlesResponse,
  PromoPinDto,
  PromoSettingsDto,
  PublishCmsArticleRequest,
  RefundDecisionRequest,
  RevealPhoneResponse,
  SaveCmsArticleRequest,
  BulkApproveRequest,
  GetModerationItemResponse,
  KycApplicationResponse,
  KycApplicationStatus,
  KycDecisionRequest,
  ListKycApplicationsResponse,
  ListModerationQuery,
  ListModerationResponse,
  ListReportCasesResponse,
  ModerationDecisionResponse,
  ReportActionRequest,
  ReportCaseResponse,
  ReportCaseTab,
  ReturnListingRequest,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminQueueCountsResponse,
  AdminSessionResponse,
  AdminVerifyRequest,
  CreateAdminInviteRequest,
  CreateAdminInviteResponse,
  GetAdminDashboardResponse,
  GetAdminSessionResponse,
  ListAdminRolesResponse,
  ListAuditLogResponse,
} from "@/types/api";
import { ApiError, apiGet, apiSend } from "./client";

/** Admin app endpoints, queries and keys, kept apart from the site's `endpoints.ts` / `queries.ts`. */
export const adminApi = {
  /** POST /admin/auth/login — step 1, returns a 2FA challenge. */
  login: (body: AdminLoginRequest) => apiSend<AdminLoginResponse>("POST", "/admin/auth/login", body),
  /** POST /admin/auth/2fa — step 2, starts the admin session. */
  verify: (body: AdminVerifyRequest) => apiSend<AdminSessionResponse>("POST", "/admin/auth/2fa", body),
  /** GET /admin/auth/me */
  getSession: (signal?: AbortSignal) => apiGet<GetAdminSessionResponse>("/admin/auth/me", undefined, { signal }),
  /** POST /admin/auth/logout */
  logout: () => apiSend<void>("POST", "/admin/auth/logout"),
  /** GET /admin/queue-counts */
  queueCounts: (signal?: AbortSignal) => apiGet<AdminQueueCountsResponse>("/admin/queue-counts", undefined, { signal }),
  /** GET /admin/dashboard */
  dashboard: (signal?: AbortSignal) => apiGet<GetAdminDashboardResponse>("/admin/dashboard", undefined, { signal }),
  /** GET /admin/roles */
  roles: (signal?: AbortSignal) => apiGet<ListAdminRolesResponse>("/admin/roles", undefined, { signal }),
  /** GET /admin/audit-log?date= */
  auditLog: (date: string, signal?: AbortSignal) =>
    apiGet<ListAuditLogResponse>("/admin/audit-log", { date }, { signal }),
  /** POST /admin/invites */
  invite: (body: CreateAdminInviteRequest) => apiSend<CreateAdminInviteResponse>("POST", "/admin/invites", body),

  /** GET /admin/moderation */
  moderation: (query: ListModerationQuery, signal?: AbortSignal) =>
    apiGet<ListModerationResponse>("/admin/moderation", { ...query }, { signal }),
  /** GET /admin/moderation/:id */
  moderationItem: (id: string, signal?: AbortSignal) =>
    apiGet<GetModerationItemResponse>(`/admin/moderation/${encodeURIComponent(id)}`, undefined, { signal }),
  /** POST /admin/moderation/:id/approve */
  approveListing: (id: string) =>
    apiSend<ModerationDecisionResponse>("POST", `/admin/moderation/${encodeURIComponent(id)}/approve`),
  /** POST /admin/moderation/:id/return */
  returnListing: (id: string, body: ReturnListingRequest) =>
    apiSend<ModerationDecisionResponse>("POST", `/admin/moderation/${encodeURIComponent(id)}/return`, body),
  /** POST /admin/moderation/approve */
  bulkApprove: (body: BulkApproveRequest) =>
    apiSend<{ data: { approved: number } }>("POST", "/admin/moderation/approve", body),

  /** GET /admin/reports?tab= */
  reports: (tab: ReportCaseTab, signal?: AbortSignal) =>
    apiGet<ListReportCasesResponse>("/admin/reports", { tab }, { signal }),
  /** POST /admin/reports/:id/actions */
  actOnReport: (id: string, body: ReportActionRequest) =>
    apiSend<ReportCaseResponse>("POST", `/admin/reports/${encodeURIComponent(id)}/actions`, body),

  /** GET /admin/kyc?tab= */
  kyc: (tab: KycApplicationStatus, signal?: AbortSignal) =>
    apiGet<ListKycApplicationsResponse>("/admin/kyc", { tab }, { signal }),
  /** POST /admin/kyc/:id/view — logged in the audit log. */
  viewKyc: (id: string, reason: string) =>
    apiSend<KycApplicationResponse>("POST", `/admin/kyc/${encodeURIComponent(id)}/view`, { reason }),
  /** POST /admin/kyc/:id/decision */
  decideKyc: (id: string, body: KycDecisionRequest) =>
    apiSend<KycApplicationResponse>("POST", `/admin/kyc/${encodeURIComponent(id)}/decision`, body),

  /** GET /admin/users */
  users: (query: ListAdminUsersQuery, signal?: AbortSignal) =>
    apiGet<ListAdminUsersResponse>("/admin/users", { ...query }, { signal }),
  /** GET /admin/users/:id */
  user: (id: string, signal?: AbortSignal) =>
    apiGet<AdminUserResponse>(`/admin/users/${encodeURIComponent(id)}`, undefined, { signal }),
  /** POST /admin/users/:id/actions */
  actOnUser: (id: string, body: AdminUserActionRequest) =>
    apiSend<AdminUserResponse>("POST", `/admin/users/${encodeURIComponent(id)}/actions`, body),
  /** POST /admin/users/:id/reveal-phone — logged. */
  revealPhone: (id: string, reason: string) =>
    apiSend<RevealPhoneResponse>("POST", `/admin/users/${encodeURIComponent(id)}/reveal-phone`, { reason }),

  /** GET /admin/revenue?month= */
  revenue: (month: string | undefined, signal?: AbortSignal) =>
    apiGet<GetAdminRevenueResponse>("/admin/revenue", { month }, { signal }),
  /** GET /admin/payments?page= */
  payments: (page: number, signal?: AbortSignal) =>
    apiGet<ListAdminPaymentsResponse>("/admin/payments", { page }, { signal }),
  /** GET /admin/payments?all=true — for the accounting export. */
  allPayments: () => apiGet<{ data: AdminPaymentDto[] }>("/admin/payments", { all: true }),
  /** POST /admin/refunds/:paymentId */
  decideRefund: (paymentId: string, body: RefundDecisionRequest) =>
    apiSend<void>("POST", `/admin/refunds/${encodeURIComponent(paymentId)}`, body),

  /** GET /admin/promo-slots?week= */
  promoSlots: (week: string | undefined, signal?: AbortSignal) =>
    apiGet<GetPromoSlotsResponse>("/admin/promo-slots", { week }, { signal }),
  /** POST /admin/promo-slots/pins/:id/move */
  movePin: (id: string, start: string) =>
    apiSend<{ data: PromoPinDto }>("POST", `/admin/promo-slots/pins/${encodeURIComponent(id)}/move`, { start }),
  /** PUT /admin/promo-slots/settings */
  updatePromoSettings: (body: PromoSettingsDto) =>
    apiSend<{ data: PromoSettingsDto }>("PUT", "/admin/promo-slots/settings", body),

  /** GET /admin/cms */
  cmsArticles: (signal?: AbortSignal) => apiGet<ListCmsArticlesResponse>("/admin/cms", undefined, { signal }),
  /** POST /admin/cms — a new draft. */
  createCmsArticle: () => apiSend<CmsArticleResponse>("POST", "/admin/cms"),
  /** GET /admin/cms/:id */
  cmsArticle: (id: string, signal?: AbortSignal) =>
    apiGet<CmsArticleResponse>(`/admin/cms/${encodeURIComponent(id)}`, undefined, { signal }),
  /** PUT /admin/cms/:id */
  saveCmsArticle: (id: string, body: SaveCmsArticleRequest) =>
    apiSend<CmsArticleResponse>("PUT", `/admin/cms/${encodeURIComponent(id)}`, body),
  /** POST /admin/cms/:id/publish */
  publishCmsArticle: (id: string, body: PublishCmsArticleRequest) =>
    apiSend<CmsArticleResponse>("POST", `/admin/cms/${encodeURIComponent(id)}/publish`, body),
};

const MINUTE = 60_000;

export const adminKeys = {
  all: ["admin"] as const,
  session: ["admin", "session"] as const,
  queueCounts: ["admin", "queue-counts"] as const,
  dashboard: ["admin", "dashboard"] as const,
  roles: ["admin", "roles"] as const,
  auditLog: (date: string) => ["admin", "audit-log", date] as const,
  moderation: ["admin", "moderation"] as const,
  moderationList: (query: ListModerationQuery) => ["admin", "moderation", "list", query] as const,
  moderationItem: (id: string) => ["admin", "moderation", "item", id] as const,
  reports: (tab: ReportCaseTab) => ["admin", "reports", tab] as const,
  kyc: (tab: KycApplicationStatus) => ["admin", "kyc", tab] as const,
  users: ["admin", "users"] as const,
  userList: (query: ListAdminUsersQuery) => ["admin", "users", "list", query] as const,
  user: (id: string) => ["admin", "users", "detail", id] as const,
  revenue: (month: string | undefined) => ["admin", "revenue", month ?? "current"] as const,
  payments: (page: number) => ["admin", "payments", page] as const,
  promo: (week: string | undefined) => ["admin", "promo-slots", week ?? "current"] as const,
  cms: ["admin", "cms"] as const,
  cmsArticle: (id: string) => ["admin", "cms", id] as const,
};

/** After a decision: the queues, their counts and the dashboard all change. */
export const afterDecisionKeys = [adminKeys.queueCounts, adminKeys.dashboard, ["admin", "audit-log"]] as const;

export const adminSessionQuery = queryOptions({
  queryKey: adminKeys.session,
  queryFn: async ({ signal }) => {
    try {
      return (await adminApi.getSession(signal)).data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: MINUTE,
});

export const adminQueueCountsQuery = queryOptions({
  queryKey: adminKeys.queueCounts,
  queryFn: ({ signal }) => adminApi.queueCounts(signal),
  refetchInterval: MINUTE,
});

/** E1 figures refresh every 5 minutes. */
export const adminDashboardQuery = queryOptions({
  queryKey: adminKeys.dashboard,
  queryFn: ({ signal }) => adminApi.dashboard(signal),
  refetchInterval: 5 * MINUTE,
});

export const adminRolesQuery = queryOptions({
  queryKey: adminKeys.roles,
  queryFn: ({ signal }) => adminApi.roles(signal),
});

export const auditLogQuery = (date: string) =>
  queryOptions({
    queryKey: adminKeys.auditLog(date),
    queryFn: ({ signal }) => adminApi.auditLog(date, signal),
  });

export const moderationListQuery = (query: ListModerationQuery) =>
  queryOptions({
    queryKey: adminKeys.moderationList(query),
    queryFn: ({ signal }) => adminApi.moderation(query, signal),
    placeholderData: keepPreviousData,
  });

export const moderationItemQuery = (id: string) =>
  queryOptions({
    queryKey: adminKeys.moderationItem(id),
    queryFn: ({ signal }) => adminApi.moderationItem(id, signal),
  });

export const reportCasesQuery = (tab: ReportCaseTab) =>
  queryOptions({
    queryKey: adminKeys.reports(tab),
    queryFn: ({ signal }) => adminApi.reports(tab, signal),
  });

export const kycApplicationsQuery = (tab: KycApplicationStatus) =>
  queryOptions({
    queryKey: adminKeys.kyc(tab),
    queryFn: ({ signal }) => adminApi.kyc(tab, signal),
  });

export const adminUsersQuery = (query: ListAdminUsersQuery) =>
  queryOptions({
    queryKey: adminKeys.userList(query),
    queryFn: ({ signal }) => adminApi.users(query, signal),
    placeholderData: keepPreviousData,
  });

export const adminUserQuery = (id: string) =>
  queryOptions({ queryKey: adminKeys.user(id), queryFn: ({ signal }) => adminApi.user(id, signal) });

export const adminRevenueQuery = (month: string | undefined) =>
  queryOptions({
    queryKey: adminKeys.revenue(month),
    queryFn: ({ signal }) => adminApi.revenue(month, signal),
    placeholderData: keepPreviousData,
  });

export const adminPaymentsQuery = (page: number) =>
  queryOptions({
    queryKey: adminKeys.payments(page),
    queryFn: ({ signal }) => adminApi.payments(page, signal),
    placeholderData: keepPreviousData,
  });

export const promoSlotsQuery = (week: string | undefined) =>
  queryOptions({
    queryKey: adminKeys.promo(week),
    queryFn: ({ signal }) => adminApi.promoSlots(week, signal),
    placeholderData: keepPreviousData,
  });

export const cmsArticlesQuery = queryOptions({
  queryKey: adminKeys.cms,
  queryFn: ({ signal }) => adminApi.cmsArticles(signal),
});

export const cmsArticleQuery = (id: string) =>
  queryOptions({ queryKey: adminKeys.cmsArticle(id), queryFn: ({ signal }) => adminApi.cmsArticle(id, signal) });
