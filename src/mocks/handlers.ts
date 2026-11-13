import { http, HttpResponse, type HttpResponseResolver } from "msw/http";
import { delay } from "msw/utils/delay";
import { MOCK_API_BASE_PATH } from "@/lib/api/client";
import {
  NEARBY_MAX_LIMIT,
  PROPERTIES_MAX_LIMIT,
  type ApiErrorBody,
  type CreateEnquiryRequest,
  type CreateEnquiryResponse,
  type ListPropertiesQuery,
  type PropertySort,
} from "@/types/api";
import type { ListingMode, PropertyType } from "@/types/property";
import {
  getPropertyDetail,
  queryAds,
  queryCategories,
  queryNearbyProperties,
  queryProjects,
  queryProperties,
  queryStations,
} from "./db";
import { getMockScenario } from "./scenario";

/** Matches the mock base path on any origin (browser page, jsdom, Node). */
const endpoint = (path: string) => `*${MOCK_API_BASE_PATH}${path}`;

const listingModes: ListingMode[] = ["buy", "rent"];
const propertyTypes: PropertyType[] = ["condo", "house", "townhouse", "land", "commercial"];
const propertySorts: PropertySort[] = ["-postedAt", "postedAt", "-price", "price"];

const statusText: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
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

class ValidationError extends Error {
  constructor(readonly messages: string[]) {
    super(messages.join(", "));
  }
}

/** Parses and validates the `GET /properties` query like NestJS's ValidationPipe would. */
export function parsePropertiesQuery(params: URLSearchParams): ListPropertiesQuery {
  const errors: string[] = [];
  const query: ListPropertiesQuery = {};

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

  const pinned = oneOf("pinned", ["true", "false"]);
  if (pinned) query.pinned = pinned === "true";
  query.mode = oneOf("mode", listingModes);
  query.type = oneOf("type", propertyTypes);
  query.sort = oneOf("sort", propertySorts);
  query.q = params.get("q")?.trim() || undefined;
  query.station = params.get("station")?.trim() || undefined;
  query.minPrice = int("minPrice", { min: 0 });
  query.maxPrice = int("maxPrice", { min: 0 });
  query.page = int("page", { min: 1 });
  query.limit = int("limit", { min: 1, max: PROPERTIES_MAX_LIMIT });

  if (errors.length) throw new ValidationError(errors);
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
    withScenario((request) => {
      const status = new URL(request.url).searchParams.get("status");
      return queryProjects(status === "new" ? { status } : {});
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
