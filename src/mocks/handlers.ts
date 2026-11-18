import type { DefaultBodyType, PathParams } from "msw";
import { http, HttpResponse, type HttpResponseResolver } from "msw/http";
import { delay } from "msw/utils/delay";
import { MOCK_API_BASE_PATH } from "@/lib/api/client";
import {
  NEARBY_MAX_LIMIT,
  PROJECTS_MAX_LIMIT,
  PROPERTIES_MAX_LIMIT,
  type ApiErrorBody,
  type CreateEnquiryRequest,
  type CreateEnquiryResponse,
  type CreateProjectViewingRequest,
  type CreateProjectViewingResponse,
  COMPARE_MAX,
  FAVORITE_NOTE_MAX,
  type SaveFavoriteResponse,
  type ForgotPasswordRequest,
  type LoginRequest,
  type OnboardingRequest,
  type RegisterRequest,
  type ResetPasswordRequest,
  type SessionResponse,
  type VerifyEmailRequest,
  type UpdateFavoriteRequest,
  type ListProjectsQuery,
  type ListPropertiesQuery,
  type ProjectSort,
  type PropertySort,
} from "@/types/api";
import type { ListingMode, ProjectStatus, ProjectType, PropertyType, TransitLineId } from "@/types/property";
import {
  compareListings,
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
import { listFavorites, removeFavorite, saveFavorite, updateFavoriteNote } from "./favorites";
import { getMockScenario } from "./scenario";
import {
  completeOnboarding,
  currentUser,
  login,
  logout,
  oauthLogin,
  register,
  requestPasswordReset,
  resetPassword,
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

const statusText: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  409: "Conflict",
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
  http.get<PathParams, DefaultBodyType, SessionBody>(endpoint("/auth/me"), async () => {
    await delay(80);
    const user = currentUser();
    return user ? HttpResponse.json<SessionResponse>({ data: user }) : unauthorized();
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
