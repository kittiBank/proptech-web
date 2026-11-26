import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type {
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
