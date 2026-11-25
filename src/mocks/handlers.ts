import type { DefaultBodyType, PathParams } from "msw";
import { http, HttpResponse, type HttpResponseResolver } from "msw/http";
import { delay } from "msw/utils/delay";
import { MOCK_API_BASE_PATH } from "@/lib/api/client";
import {
  ARTICLES_MAX_LIMIT,
  MAX_SAVED_SEARCHES,
  NEARBY_MAX_LIMIT,
  PROJECTS_MAX_LIMIT,
  PROPERTIES_MAX_LIMIT,
  type ApiErrorBody,
  type CreateEnquiryRequest,
  type ChangePasswordRequest,
  type CreateViewingRequest,
  type AvailabilityDto,
  type BulkListingsRequest,
  type ListSellerListingsQuery,
  type OverviewRange,
  type PromoteListingsRequest,
  type SellerListingSort,
  type SellerListingTab,
  SELLER_LISTINGS_MAX_LIMIT,
  type SendMessageRequest,
  type StartThreadRequest,
  type ThreadFilter,
  type UpdateViewingRequest,
  type CreateSavedSearchRequest,
  type NotificationKind,
  type UpdateProfileRequest,
  type UpdateSavedSearchRequest,
  type VerifyPhoneRequest,
  type CreateEnquiryResponse,
  type CreateProjectViewingRequest,
  type CreateProjectViewingResponse,
  COMPARE_MAX,
  FAVORITE_NOTE_MAX,
  type SaveFavoriteResponse,
  type UpdateDraftRequest,
  type UploadPhotoRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type OnboardingRequest,
  type RegisterRequest,
  type ResetPasswordRequest,
  type GetSessionResponse,
  type SessionResponse,
  type VerifyEmailRequest,
  type UpdateFavoriteRequest,
  type ArticleCategory,
  type ListArticlesQuery,
  type ListProjectsQuery,
  type ListPropertiesQuery,
  type ProjectSort,
  type PropertySort,
} from "@/types/api";
import type { ListingMode, ProjectStatus, ProjectType, PropertyType, TransitLineId } from "@/types/property";
import {
  compareListings,
  queryNearbyStations,
  searchProjectPlaces,
  getAgentProfile,
  getProjectDetail,
  getPropertyDetail,
  queryNearbyProjects,
  queryAds,
  queryCategories,
  queryNearbyProperties,
  queryProjects,
  queryProperties,
  queryStations,
} from "./db";
import { getArticle, queryArticles } from "./articles";
import {
  checkPhoto,
  createDraft,
  deleteDraft,
  getDraft,
  getSubmissionForDraft,
  listDrafts,
  promotionOptions,
  publishDraft,
  quota,
  updateDraft,
} from "./drafts";
import { listFavorites, removeFavorite, saveFavorite, updateFavoriteNote } from "./favorites";
import {
  deleteProfile,
  getProfile,
  markPasswordChanged,
  sendPhoneOtp,
  setLinked,
  signOutOtherDevices,
  updateProfile,
  verifyPhone,
} from "./account";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications";
import { createSavedSearch, deleteSavedSearch, listSavedSearches, updateSavedSearch } from "./saved-searches";
import {
  createViewing,
  getThread,
  listAppointments,
  listThreads,
  markThreadRead,
  sendMessage,
  startThread,
  updateViewing,
  viewingSlots,
  type ViewingError,
} from "./inbox";
import { unreadCounts } from "./unread";
import {
  boostOptions,
  bulkUpdateListings,
  getAvailability,
  listLeads,
  listSellerListings,
  promoteListings,
  sellerAccount,
  sellerOverview,
  setAvailability,
} from "./seller";
import { getMockScenario } from "./scenario";
import {
  completeOnboarding,
  changePassword,
  currentUser,
  deleteAccount,
  login,
  logout,
  oauthLogin,
  register,
  requestPasswordReset,
  resetPassword,
  updateAccountNames,
  verifyEmail,
} from "./session";

/** Matches the mock base path on any origin (browser page, jsdom, Node). */
const endpoint = (path: string) => `*${MOCK_API_BASE_PATH}${path}`;

const listingModes: ListingMode[] = ["buy", "rent"];
const propertyTypes: PropertyType[] = ["condo", "house", "townhouse", "land", "commercial"];
const propertySorts: PropertySort[] = ["-postedAt", "postedAt", "-price", "price", "stationDistance"];
const projectStatuses: ProjectStatus[] = ["pre-sale", "under-construction", "ready"];
const projectTypes: ProjectType[] = ["condo", "house", "townhouse"];
const projectSorts: ProjectSort[] = ["-launchedAt", "startingPrice", "-startingPrice", "completionYear"];
const transitLineIds: TransitLineId[] = ["bts-sukhumvit", "bts-silom", "mrt-blue"];
const articleCategoryIds: ArticleCategory[] = ["buying", "renting", "selling", "finance", "location", "new-projects"];

const statusText: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  403: "Forbidden",
  402: "Payment Required",
  409: "Conflict",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

/** Error response in the NestJS `HttpException` shape. */
export function errorResponse(statusCode: number, message: string | string[]) {
  return HttpResponse.json<ApiErrorBody>(
    { statusCode, message, error: statusText[statusCode] ?? "Error" },
    { status: statusCode },
  );
}

class NotFoundError extends Error {}

class UnauthorizedError extends Error {}

type SessionBody = SessionResponse | ApiErrorBody;

const unauthorized = () => errorResponse(401, "Sign in required");

function viewingError(error: ViewingError) {
  const map = {
    not_found: [404, "Not found"],
    forbidden: [403, "Only the buyer can request a viewing"],
    conflict: [409, "Another request is still open"],
    invalid: [400, "Invalid slot or party size"],
  } as const;
  return errorResponse(map[error][0], map[error][1]);
}

function requireUser() {
  const user = currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads a JSON body; `{}` when it is missing or malformed so field checks report it. */
async function readBody<T>(request: Request): Promise<Partial<T>> {
  return ((await request.json().catch(() => null)) ?? {}) as Partial<T>;
}

/** Simulated latency plus the `error` scenario, for write endpoints. */
async function writeScenario() {
  await delay(200);
  return getMockScenario() === "error" ? errorResponse(500, "Mock server error") : undefined;
}

class ValidationError extends Error {
  constructor(readonly messages: string[]) {
    super(messages.join(", "));
  }
}

/** Query-string readers that collect validation errors like NestJS's ValidationPipe. */
function queryReader(params: URLSearchParams) {
  const errors: string[] = [];
  const oneOf = <T extends string>(key: string, allowed: readonly T[]): T | undefined => {
    const value = params.get(key);
    if (value === null || value === "") return undefined;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    errors.push(`${key} must be one of: ${allowed.join(", ")}`);
  };
  const int = (key: string, { min, max }: { min: number; max?: number }): number | undefined => {
    const value = params.get(key);
    if (value === null || value === "") return undefined;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || (max !== undefined && n > max)) {
      errors.push(`${key} must be an integer ${max === undefined ? `>= ${min}` : `between ${min} and ${max}`}`);
      return undefined;
    }
    return n;
  };
  const bool = (key: string): boolean | undefined => {
    const value = oneOf(key, ["true", "false"]);
    return value === undefined ? undefined : value === "true";
  };
  const done = () => {
    if (errors.length) throw new ValidationError(errors);
  };
  return { oneOf, int, bool, done };
}

/** Parses and validates the `GET /properties` query like NestJS's ValidationPipe would. */
export function parsePropertiesQuery(params: URLSearchParams): ListPropertiesQuery {
  const { oneOf, int, bool, done } = queryReader(params);
  const query: ListPropertiesQuery = {};
  query.pinned = bool("pinned");
  query.mode = oneOf("mode", listingModes);
  query.type = oneOf("type", propertyTypes);
  query.sort = oneOf("sort", propertySorts);
  query.q = params.get("q")?.trim() || undefined;
  query.station = params.get("station")?.trim() || undefined;
  query.project = params.get("project")?.trim() || undefined;
  query.agent = params.get("agent")?.trim() || undefined;
  query.minPrice = int("minPrice", { min: 0 });
  query.maxPrice = int("maxPrice", { min: 0 });
  query.minBedrooms = int("minBedrooms", { min: 0 });
  query.minArea = int("minArea", { min: 0 });
  query.maxArea = int("maxArea", { min: 0 });
  query.page = int("page", { min: 1 });
  query.limit = int("limit", { min: 1, max: PROPERTIES_MAX_LIMIT });
  done();
  return query;
}

/** Parses and validates the `GET /projects` query. */
export function parseProjectsQuery(params: URLSearchParams): ListProjectsQuery {
  const { oneOf, int, bool, done } = queryReader(params);
  const query: ListProjectsQuery = {
    status: oneOf("status", projectStatuses),
    type: oneOf("type", projectTypes),
    line: oneOf("line", transitLineIds),
    minPrice: int("minPrice", { min: 0 }),
    maxPrice: int("maxPrice", { min: 0 }),
    featured: bool("featured"),
    sort: oneOf("sort", projectSorts),
    page: int("page", { min: 1 }),
    limit: int("limit", { min: 1, max: PROJECTS_MAX_LIMIT }),
  };
  done();
  return query;
}

const sellerTabs: SellerListingTab[] = ["all", "published", "pending_review", "rejected", "draft", "expired", "closed"];
const sellerSorts: SellerListingSort[] = ["-views", "-leads", "-updatedAt", "expiresAt"];

/** Parses and validates the `GET /me/listings` query. */
export function parseSellerListingsQuery(params: URLSearchParams): ListSellerListingsQuery {
  const { oneOf, int, done } = queryReader(params);
  const query: ListSellerListingsQuery = {
    status: oneOf("status", sellerTabs),
    q: params.get("q")?.trim() || undefined,
    mode: oneOf("mode", listingModes),
    sort: oneOf("sort", sellerSorts),
    page: int("page", { min: 1 }),
    limit: int("limit", { min: 1, max: SELLER_LISTINGS_MAX_LIMIT }),
    ids: params.get("ids")?.trim() || undefined,
  };
  done();
  return query;
}

/** Parses and validates the `GET /articles` query. */
export function parseArticlesQuery(params: URLSearchParams): ListArticlesQuery {
  const { oneOf, int, bool, done } = queryReader(params);
  const query: ListArticlesQuery = {
    category: oneOf("category", articleCategoryIds),
    q: params.get("q")?.trim() || undefined,
    featured: bool("featured"),
    page: int("page", { min: 1 }),
    limit: int("limit", { min: 1, max: ARTICLES_MAX_LIMIT }),
  };
  done();
  return query;
}

/**
 * Wraps a resolver with simulated latency and the active failure scenario,
 * so every endpoint behaves consistently under `?mock=slow|error|flaky|empty`.
 */
function withScenario(
  resolve: (request: Request, params: Record<string, string | readonly string[] | undefined>) => unknown,
): HttpResponseResolver {
  return async ({ request, params }) => {
    const scenario = getMockScenario();
    await delay(scenario === "slow" ? 3000 : undefined);

    if (scenario === "error") return errorResponse(500, "Mock server error");
    if (scenario === "flaky" && Math.random() < 0.5) return errorResponse(503, "Mock service temporarily unavailable");

    try {
      const body = resolve(request, params) as { data: unknown[]; meta?: { limit: number; page: number } };
      if (scenario === "empty" && Array.isArray(body.data)) {
        return HttpResponse.json(
          body.meta ? { data: [], meta: { ...body.meta, total: 0, totalPages: 1 } } : { data: [] },
        );
      }
      return HttpResponse.json(body);
    } catch (error) {
      if (error instanceof ValidationError) return errorResponse(400, error.messages);
      if (error instanceof NotFoundError) return errorResponse(404, error.message);
      if (error instanceof UnauthorizedError) return unauthorized();
      throw error;
    }
  };
}

export const handlers = [
  http.get(
    endpoint("/properties"),
    withScenario((request) => queryProperties(parsePropertiesQuery(new URL(request.url).searchParams))),
  ),
  http.get(
    endpoint("/properties/:slug"),
    withScenario((_request, params) => {
      const detail = getPropertyDetail(String(params.slug));
      if (!detail) throw new NotFoundError(`Property "${String(params.slug)}" not found`);
      return { data: detail };
    }),
  ),
  http.get(
    endpoint("/properties/:slug/nearby"),
    withScenario((request, params) => {
      const raw = new URL(request.url).searchParams.get("limit");
      const limit = raw ? Number(raw) : undefined;
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > NEARBY_MAX_LIMIT)) {
        throw new ValidationError([`limit must be an integer between 1 and ${NEARBY_MAX_LIMIT}`]);
      }
      const result = queryNearbyProperties(String(params.slug), { limit });
      if (!result) throw new NotFoundError(`Property "${String(params.slug)}" not found`);
      return result;
    }),
  ),
  http.post<{ slug: string }, CreateEnquiryRequest, CreateEnquiryResponse | ApiErrorBody>(
    endpoint("/properties/:slug/enquiries"),
    async ({ request, params }) => {
      await delay();
      if (getMockScenario() === "error") return errorResponse(500, "Mock server error");
      if (!getPropertyDetail(params.slug)) return errorResponse(404, "Property not found");
      const body = (await request.json().catch(() => null)) as Partial<CreateEnquiryRequest> | null;
      const errors: string[] = [];
      if (!body?.name?.trim()) errors.push("name should not be empty");
      if (!body?.phone || !/^0\d{8,9}$/.test(body.phone.replace(/\D/g, "")))
        errors.push("phone must be a Thai phone number");
      if (!body?.message?.trim()) errors.push("message should not be empty");
      if (errors.length) return errorResponse(400, errors);
      return HttpResponse.json<CreateEnquiryResponse>(
        { data: { id: `enq-${Date.now().toString(36)}`, createdAt: new Date().toISOString() } },
        { status: 201 },
      );
    },
  ),
  http.get(
    endpoint("/agents/:slug"),
    withScenario((_request, params) => {
      const profile = getAgentProfile(String(params.slug));
      if (!profile) throw new NotFoundError(`Agent "${String(params.slug)}" not found`);
      return { data: profile };
    }),
  ),
  http.get(
    endpoint("/projects"),
    withScenario((request) => queryProjects(parseProjectsQuery(new URL(request.url).searchParams))),
  ),
  http.get(
    endpoint("/projects/:slug"),
    withScenario((_request, params) => {
      const detail = getProjectDetail(String(params.slug));
      if (!detail) throw new NotFoundError(`Project "${String(params.slug)}" not found`);
      return { data: detail };
    }),
  ),
  http.get(
    endpoint("/projects/:slug/nearby"),
    withScenario((request, params) => {
      const { int, done } = queryReader(new URL(request.url).searchParams);
      const limit = int("limit", { min: 1, max: 12 });
      done();
      const result = queryNearbyProjects(String(params.slug), limit);
      if (!result) throw new NotFoundError(`Project "${String(params.slug)}" not found`);
      return result;
    }),
  ),
  http.post<{ slug: string }, CreateProjectViewingRequest, CreateProjectViewingResponse | ApiErrorBody>(
    endpoint("/projects/:slug/viewings"),
    async ({ request, params }) => {
      await delay();
      if (getMockScenario() === "error") return errorResponse(500, "Mock server error");
      if (!getProjectDetail(params.slug)) return errorResponse(404, "Project not found");
      const body = (await request.json().catch(() => null)) as Partial<CreateProjectViewingRequest> | null;
      const errors: string[] = [];
      if (!body?.name?.trim()) errors.push("name should not be empty");
      if (!body?.phone || !/^0\d{8,9}$/.test(body.phone.replace(/\D/g, "")))
        errors.push("phone must be a Thai phone number");
      if (!body?.date || Number.isNaN(Date.parse(body.date))) errors.push("date must be an ISO date");
      if (errors.length) return errorResponse(400, errors);
      return HttpResponse.json<CreateProjectViewingResponse>(
        { data: { id: `pv-${Date.now().toString(36)}`, createdAt: new Date().toISOString() } },
        { status: 201 },
      );
    },
  ),
  // --- Auth -------------------------------------------------------------
  http.get(endpoint("/auth/me"), async () => {
    await delay(80);
    return HttpResponse.json<GetSessionResponse>({ data: currentUser() ?? null });
  }),
  http.post<PathParams, DefaultBodyType, SessionBody>(endpoint("/auth/login"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const body = await readBody<LoginRequest>(request);
    if (!body.email || !body.password) return errorResponse(400, ["email and password are required"]);
    const user = login(body.email, body.password, body.remember ?? true);
    return user ? HttpResponse.json<SessionResponse>({ data: user }) : errorResponse(401, "Invalid email or password");
  }),
  http.post<PathParams, DefaultBodyType, SessionBody>(endpoint("/auth/register"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const body = await readBody<RegisterRequest>(request);
    const errors: string[] = [];
    if (!body.firstName?.trim()) errors.push("firstName should not be empty");
    if (!body.lastName?.trim()) errors.push("lastName should not be empty");
    if (!body.email || !EMAIL.test(body.email)) errors.push("email must be an email");
    if (!body.password || body.password.length < 8 || !/\d/.test(body.password))
      errors.push("password must be at least 8 characters and contain a number");
    if (body.acceptTerms !== true) errors.push("acceptTerms must be true");
    if (errors.length) return errorResponse(400, errors);
    const user = register(body as RegisterRequest);
    return user
      ? HttpResponse.json<SessionResponse>({ data: user }, { status: 201 })
      : errorResponse(409, "Email already registered");
  }),
  http.post<{ provider: string }>(endpoint("/auth/oauth/:provider"), async ({ params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    if (params.provider !== "google" && params.provider !== "line") return errorResponse(404, "Unknown provider");
    return HttpResponse.json<SessionResponse>({ data: oauthLogin(params.provider) });
  }),
  http.post(endpoint("/auth/logout"), async () => {
    await delay(80);
    logout();
    return new HttpResponse(null, { status: 204 });
  }),
  http.post<PathParams, DefaultBodyType, SessionBody>(endpoint("/auth/verify-email"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const { token } = await readBody<VerifyEmailRequest>(request);
    if (!currentUser()) return unauthorized();
    const user = verifyEmail(token ?? "");
    return user ? HttpResponse.json<SessionResponse>({ data: user }) : errorResponse(400, "Invalid or expired token");
  }),
  http.post(endpoint("/auth/resend-verification"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    return currentUser() ? new HttpResponse(null, { status: 202 }) : unauthorized();
  }),
  http.post(endpoint("/auth/forgot-password"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const { email } = await readBody<ForgotPasswordRequest>(request);
    if (!email || !EMAIL.test(email)) return errorResponse(400, ["email must be an email"]);
    requestPasswordReset(email);
    return new HttpResponse(null, { status: 202 });
  }),
  http.post(endpoint("/auth/reset-password"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const { token, password } = await readBody<ResetPasswordRequest>(request);
    if (!password || password.length < 8 || !/\d/.test(password))
      return errorResponse(400, ["password must be at least 8 characters and contain a number"]);
    return resetPassword(token ?? "", password)
      ? new HttpResponse(null, { status: 204 })
      : errorResponse(400, "Invalid or expired token");
  }),
  http.patch<PathParams, DefaultBodyType, SessionBody>(endpoint("/me/onboarding"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = completeOnboarding(await readBody<OnboardingRequest>(request));
    return user ? HttpResponse.json<SessionResponse>({ data: user }) : unauthorized();
  }),
  // --- Saved searches and badges ------------------------------------------
  http.get(
    endpoint("/me/saved-searches"),
    withScenario(() => ({ data: listSavedSearches(requireUser().id) })),
  ),
  http.post(endpoint("/me/saved-searches"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const body = await readBody<CreateSavedSearchRequest>(request);
    const errors: string[] = [];
    if (!body.name?.trim()) errors.push("name should not be empty");
    if (typeof body.query !== "string" || !new URLSearchParams(body.query).get("mode"))
      errors.push("query must be a search query string with a mode");
    if (errors.length) return errorResponse(400, errors);
    const result = createSavedSearch(user.id, { name: body.name!.trim(), query: body.query! });
    if (result.kind === "limit") return errorResponse(409, `You can keep at most ${MAX_SAVED_SEARCHES} saved searches`);
    return HttpResponse.json({ data: result.search }, { status: result.kind === "created" ? 201 : 200 });
  }),
  http.patch(endpoint("/me/saved-searches/:id"), async ({ request, params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const updated = updateSavedSearch(user.id, String(params.id), await readBody<UpdateSavedSearchRequest>(request));
    return updated ? HttpResponse.json({ data: updated }) : errorResponse(404, "Saved search not found");
  }),
  http.delete(endpoint("/me/saved-searches/:id"), async ({ params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    return deleteSavedSearch(user.id, String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : errorResponse(404, "Saved search not found");
  }),
  // --- Account: profile, security, privacy ---------------------------------
  http.get(
    endpoint("/me/profile"),
    withScenario(() => ({ data: getProfile(requireUser()) })),
  ),
  http.patch(endpoint("/me/profile"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const body = await readBody<UpdateProfileRequest>(request);
    const errors: string[] = [];
    if (body.firstName !== undefined && !body.firstName.trim()) errors.push("firstName should not be empty");
    if (body.lastName !== undefined && !body.lastName.trim()) errors.push("lastName should not be empty");
    if (body.phone && !/^0\d{8,9}$/.test(body.phone)) errors.push("phone must be a Thai phone number");
    if (typeof body.avatarUrl === "string" && body.avatarUrl.length > 7_000_000)
      errors.push("avatar must be 5 MB or less");
    if (errors.length) return errorResponse(400, errors);
    updateAccountNames(user.id, { firstName: body.firstName?.trim(), lastName: body.lastName?.trim() });
    updateProfile(user, body);
    return HttpResponse.json({ data: getProfile(currentUser()!) });
  }),
  http.post(endpoint("/me/phone/otp"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    return sendPhoneOtp(user)
      ? new HttpResponse(null, { status: 202 })
      : errorResponse(400, "Add a phone number first");
  }),
  http.post(endpoint("/me/phone/verify"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const { code } = await readBody<VerifyPhoneRequest>(request);
    if (!verifyPhone(user, String(code ?? ""))) return errorResponse(400, "Invalid or expired code");
    return HttpResponse.json({ data: getProfile(user) });
  }),
  http.post(endpoint("/me/password"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const body = await readBody<ChangePasswordRequest>(request);
    if (!body.newPassword || body.newPassword.length < 8) return errorResponse(400, "newPassword is too short");
    if (!changePassword(user.id, body.currentPassword ?? "", body.newPassword))
      return errorResponse(400, "currentPassword is incorrect");
    markPasswordChanged(user);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(endpoint("/me/linked/:provider"), async ({ params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const provider = String(params.provider);
    if (provider !== "google" && provider !== "line") return errorResponse(404, "Unknown provider");
    setLinked(user, provider, true);
    return HttpResponse.json({ data: getProfile(user) });
  }),
  http.delete(endpoint("/me/linked/:provider"), async ({ params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const provider = String(params.provider);
    if (provider !== "google" && provider !== "line") return errorResponse(404, "Unknown provider");
    setLinked(user, provider, false);
    return HttpResponse.json({ data: getProfile(user) });
  }),
  http.post(endpoint("/me/sessions/revoke-others"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    signOutOtherDevices(user);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(endpoint("/me/data-export"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    return currentUser() ? new HttpResponse(null, { status: 202 }) : unauthorized();
  }),
  http.delete(endpoint("/me"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    deleteProfile(user.id);
    deleteAccount(user.id);
    return new HttpResponse(null, { status: 204 });
  }),
  // --- Messages and viewings ------------------------------------------------
  http.get(
    endpoint("/me/threads"),
    withScenario((request) => {
      const filter = new URL(request.url).searchParams.get("filter") as ThreadFilter | null;
      return { data: listThreads(requireUser().id, filter ?? "all") };
    }),
  ),
  http.post(endpoint("/me/threads"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const { to } = await readBody<StartThreadRequest>(request);
    const thread = typeof to === "string" ? startThread(user.id, to) : undefined;
    return thread ? HttpResponse.json({ data: thread }) : errorResponse(404, "Recipient not found");
  }),
  http.get(
    endpoint("/me/threads/:id"),
    withScenario((_request, params) => {
      const detail = getThread(requireUser().id, String(params.id));
      if (!detail) throw new NotFoundError("Thread not found");
      return { data: detail };
    }),
  ),
  http.post(endpoint("/me/threads/:id/read"), async ({ params }) => {
    const user = currentUser();
    if (!user) return unauthorized();
    return markThreadRead(user.id, String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : errorResponse(404, "Thread not found");
  }),
  http.post(endpoint("/me/threads/:id/messages"), async ({ request, params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const { text } = await readBody<SendMessageRequest>(request);
    if (typeof text !== "string" || !text.trim()) return errorResponse(400, "text should not be empty");
    if (text.length > 2000) return errorResponse(400, "text must be 2000 characters or less");
    const message = sendMessage(user.id, String(params.id), text.trim());
    return message ? HttpResponse.json({ data: message }, { status: 201 }) : errorResponse(404, "Thread not found");
  }),
  http.get(
    endpoint("/me/threads/:id/slots"),
    withScenario((_request, params) => {
      const slots = viewingSlots(requireUser().id, String(params.id));
      if (!slots) throw new NotFoundError("Thread has no listing to view");
      return { data: slots };
    }),
  ),
  http.post(endpoint("/me/threads/:id/viewings"), async ({ request, params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const result = createViewing(
      user.id,
      String(params.id),
      (await readBody<CreateViewingRequest>(request)) as CreateViewingRequest,
    );
    return typeof result === "string" ? viewingError(result) : HttpResponse.json({ data: result }, { status: 201 });
  }),
  http.get(
    endpoint("/me/viewings"),
    withScenario(() => ({ data: listAppointments(requireUser().id) })),
  ),
  http.patch(endpoint("/me/viewings/:id"), async ({ request, params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const result = updateViewing(
      user.id,
      String(params.id),
      (await readBody<UpdateViewingRequest>(request)) as UpdateViewingRequest,
    );
    return typeof result === "string" ? viewingError(result) : HttpResponse.json({ data: result });
  }),
  // --- Seller dashboard ----------------------------------------------------
  http.get(
    endpoint("/me/seller"),
    withScenario(() => ({ data: sellerAccount(requireUser().id) })),
  ),
  http.get(
    endpoint("/me/seller/overview"),
    withScenario((request) => {
      const { oneOf, done } = queryReader(new URL(request.url).searchParams);
      const days = oneOf("days", ["14", "30", "90"]);
      done();
      return { data: sellerOverview(requireUser().id, Number(days ?? 14) as OverviewRange) };
    }),
  ),
  http.get(
    endpoint("/me/listings"),
    withScenario((request) =>
      listSellerListings(requireUser().id, parseSellerListingsQuery(new URL(request.url).searchParams)),
    ),
  ),
  http.post(endpoint("/me/listings/bulk"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const body = await readBody<BulkListingsRequest>(request);
    if (!Array.isArray(body.ids) || !body.ids.length || (body.action !== "renew" && body.action !== "close"))
      return errorResponse(400, ["ids should not be empty", "action must be one of: renew, close"]);
    return HttpResponse.json({ data: bulkUpdateListings(user.id, body as BulkListingsRequest) });
  }),
  http.get(
    endpoint("/me/boost-options"),
    withScenario(() => ({ data: boostOptions(requireUser().id) })),
  ),
  http.post(endpoint("/me/listings/promote"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const result = promoteListings(
      user.id,
      (await readBody<PromoteListingsRequest>(request)) as PromoteListingsRequest,
    );
    return result.ok ? HttpResponse.json({ data: result.data }) : errorResponse(result.status, result.message);
  }),
  http.get(
    endpoint("/me/leads"),
    withScenario(() => ({ data: listLeads(requireUser().id) })),
  ),
  http.get(
    endpoint("/me/availability"),
    withScenario(() => ({ data: getAvailability(requireUser().id) })),
  ),
  http.put(endpoint("/me/availability"), async ({ request }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const saved = setAvailability(user.id, await readBody<AvailabilityDto>(request));
    return saved ? HttpResponse.json({ data: saved }) : errorResponse(400, "start must be before end");
  }),
  // --- Notifications -------------------------------------------------------
  http.get(
    endpoint("/me/notifications"),
    withScenario((request) => {
      const kind = new URL(request.url).searchParams.get("kind") as NotificationKind | null;
      return { data: listNotifications(requireUser().id, kind ?? undefined) };
    }),
  ),
  http.post(endpoint("/me/notifications/read-all"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    markAllNotificationsRead(user.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.patch(endpoint("/me/notifications/:id"), async ({ params }) => {
    const user = currentUser();
    if (!user) return unauthorized();
    return markNotificationRead(user.id, String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : errorResponse(404, "Notification not found");
  }),
  http.get(
    endpoint("/me/unread-counts"),
    withScenario(() => ({ data: unreadCounts(requireUser().id) })),
  ),
  // --- Post a listing ----------------------------------------------------
  http.get(
    endpoint("/me/drafts"),
    withScenario(() => ({ data: listDrafts(requireUser().id) })),
  ),
  http.post(endpoint("/me/drafts"), async () => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    return HttpResponse.json(
      { data: createDraft(user.id, user.role === "agent" ? "agent" : "owner") },
      { status: 201 },
    );
  }),
  http.get(
    endpoint("/me/drafts/:id"),
    withScenario((_request, params) => {
      const draft = getDraft(requireUser().id, String(params.id));
      if (!draft) throw new NotFoundError("Draft not found");
      return { data: draft };
    }),
  ),
  http.patch(endpoint("/me/drafts/:id"), async ({ request, params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const draft = updateDraft(user.id, String(params.id), await readBody<UpdateDraftRequest>(request));
    return draft ? HttpResponse.json({ data: draft }) : errorResponse(404, "Draft not found");
  }),
  http.delete(endpoint("/me/drafts/:id"), async ({ params }) => {
    const user = currentUser();
    if (!user) return unauthorized();
    deleteDraft(user.id, String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(endpoint("/me/drafts/:id/photos"), async ({ request, params }) => {
    // Uploads take a moment; the UI shows progress meanwhile.
    await delay(600);
    if (getMockScenario() === "error") return errorResponse(500, "Mock server error");
    const user = currentUser();
    if (!user) return unauthorized();
    if (!getDraft(user.id, String(params.id))) return errorResponse(404, "Draft not found");
    const body = await readBody<UploadPhotoRequest>(request);
    if (!body.name || !body.mimeType || !body.preview)
      return errorResponse(400, ["name, mimeType and preview are required"]);
    return HttpResponse.json({ data: checkPhoto(body as UploadPhotoRequest) }, { status: 201 });
  }),
  http.post(endpoint("/me/drafts/:id/publish"), async ({ params }) => {
    const failed = await writeScenario();
    if (failed) return failed;
    const user = currentUser();
    if (!user) return unauthorized();
    const result = publishDraft(user.id, String(params.id));
    return result.ok ? HttpResponse.json(result.body, { status: 201 }) : errorResponse(result.status, result.message);
  }),
  http.get(
    endpoint("/me/drafts/:id/submission"),
    withScenario((_request, params) => {
      const submission = getSubmissionForDraft(requireUser().id, String(params.id));
      if (!submission) throw new NotFoundError("Not published");
      return { data: submission };
    }),
  ),
  http.get(
    endpoint("/me/listing-quota"),
    withScenario(() => ({ data: quota(requireUser().id) })),
  ),
  http.get(
    endpoint("/promotions"),
    withScenario(() => ({ data: promotionOptions() })),
  ),
  http.get(
    endpoint("/places/projects"),
    withScenario((request) => searchProjectPlaces(new URL(request.url).searchParams.get("q") ?? "")),
  ),
  http.get(
    endpoint("/stations/nearby"),
    withScenario((request) => {
      const params = new URL(request.url).searchParams;
      const lat = Number(params.get("lat"));
      const lng = Number(params.get("lng"));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !params.get("lat") || !params.get("lng")) {
        throw new ValidationError(["lat and lng must be numbers"]);
      }
      return queryNearbyStations({ lat, lng });
    }),
  ),
  // --- Favorites ---------------------------------------------------------
  http.get(
    endpoint("/me/favorites"),
    withScenario(() => {
      requireUser();
      return { data: listFavorites() };
    }),
  ),
  http.put<{ propertyId: string }, never, SaveFavoriteResponse | ApiErrorBody>(
    endpoint("/me/favorites/:propertyId"),
    async ({ params }) => {
      await delay(120);
      if (getMockScenario() === "error") return errorResponse(500, "Mock server error");
      if (!currentUser()) return unauthorized();
      const result = saveFavorite(params.propertyId);
      if (!result) return errorResponse(404, "Property not found");
      return HttpResponse.json<SaveFavoriteResponse>({ data: result.favorite }, { status: result.created ? 201 : 200 });
    },
  ),
  http.patch<{ propertyId: string }, UpdateFavoriteRequest, SaveFavoriteResponse | ApiErrorBody>(
    endpoint("/me/favorites/:propertyId"),
    async ({ request, params }) => {
      await delay(120);
      if (getMockScenario() === "error") return errorResponse(500, "Mock server error");
      if (!currentUser()) return unauthorized();
      const body = (await request.json().catch(() => null)) as Partial<UpdateFavoriteRequest> | null;
      if (typeof body?.note !== "string" || body.note.length > FAVORITE_NOTE_MAX) {
        return errorResponse(400, [`note must be a string of at most ${FAVORITE_NOTE_MAX} characters`]);
      }
      const favorite = updateFavoriteNote(params.propertyId, body.note.trim());
      if (!favorite) return errorResponse(404, "Not in favorites");
      return HttpResponse.json<SaveFavoriteResponse>({ data: favorite });
    },
  ),
  http.delete<{ propertyId: string }>(endpoint("/me/favorites/:propertyId"), async ({ params }) => {
    await delay(120);
    if (getMockScenario() === "error") return errorResponse(500, "Mock server error");
    if (!currentUser()) return unauthorized();
    removeFavorite(params.propertyId);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(
    endpoint("/compare"),
    withScenario((request) => {
      const ids = (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length === 0 || ids.length > COMPARE_MAX) {
        throw new ValidationError([`ids must list 1 to ${COMPARE_MAX} listing ids`]);
      }
      return compareListings([...new Set(ids)]);
    }),
  ),
  // --- Guides ------------------------------------------------------------
  http.get(
    endpoint("/articles"),
    withScenario((request) => queryArticles(parseArticlesQuery(new URL(request.url).searchParams))),
  ),
  http.get(
    endpoint("/articles/:slug"),
    withScenario((_request, params) => {
      const article = getArticle(String(params.slug));
      if (!article) throw new NotFoundError(`Article "${String(params.slug)}" not found`);
      return { data: article };
    }),
  ),
  http.get(endpoint("/stations"), withScenario(queryStations)),
  http.get(endpoint("/categories"), withScenario(queryCategories)),
  http.get(
    endpoint("/ads"),
    withScenario((request) => {
      const placement = new URL(request.url).searchParams.get("placement");
      if (placement !== "home-feed") throw new ValidationError(["placement must be one of: home-feed"]);
      return queryAds({ placement });
    }),
  ),
];

/** Handy for tests: `server.use(failingHandler("/properties"))`. */
export function failingHandler(path: string, status = 500) {
  return http.get(endpoint(path), () => errorResponse(status, "Mock failure"));
}
