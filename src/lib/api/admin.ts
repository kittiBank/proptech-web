import { queryOptions } from "@tanstack/react-query";
import type {
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
};

const MINUTE = 60_000;

export const adminKeys = {
  all: ["admin"] as const,
  session: ["admin", "session"] as const,
  queueCounts: ["admin", "queue-counts"] as const,
  dashboard: ["admin", "dashboard"] as const,
  roles: ["admin", "roles"] as const,
  auditLog: (date: string) => ["admin", "audit-log", date] as const,
};

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
