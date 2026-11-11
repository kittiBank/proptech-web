import { http, HttpResponse, type HttpResponseResolver } from "msw/http";
import { delay } from "msw/utils/delay";
import { MOCK_API_BASE_PATH } from "@/lib/api/client";
import { PROPERTIES_MAX_LIMIT, type ApiErrorBody, type ListPropertiesQuery, type PropertySort } from "@/types/api";
import type { ListingMode, PropertyType } from "@/types/property";
import { queryCategories, queryProjects, queryProperties, queryStations } from "./db";
import { getMockScenario } from "./scenario";

/** Matches the mock base path on any origin (browser page, jsdom, Node). */
const endpoint = (path: string) => `*${MOCK_API_BASE_PATH}${path}`;

const listingModes: ListingMode[] = ["buy", "rent"];
const propertyTypes: PropertyType[] = ["condo", "house", "townhouse", "land", "commercial"];
const propertySorts: PropertySort[] = ["-postedAt", "postedAt", "-price", "price"];

const statusText: Record<number, string> = {
  400: "Bad Request",
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
function withScenario(resolve: (request: Request) => unknown): HttpResponseResolver {
  return async ({ request }) => {
    const scenario = getMockScenario();
    await delay(scenario === "slow" ? 3000 : undefined);

    if (scenario === "error") return errorResponse(500, "Mock server error");
    if (scenario === "flaky" && Math.random() < 0.5) return errorResponse(503, "Mock service temporarily unavailable");

    try {
      const body = resolve(request) as { data: unknown[]; meta?: { limit: number; page: number } };
      if (scenario === "empty") {
        return HttpResponse.json(
          body.meta ? { data: [], meta: { ...body.meta, total: 0, totalPages: 1 } } : { data: [] },
        );
      }
      return HttpResponse.json(body);
    } catch (error) {
      if (error instanceof ValidationError) return errorResponse(400, error.messages);
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
    endpoint("/projects"),
    withScenario((request) => {
      const status = new URL(request.url).searchParams.get("status");
      return queryProjects(status === "new" ? { status } : {});
    }),
  ),
  http.get(endpoint("/stations"), withScenario(queryStations)),
  http.get(endpoint("/categories"), withScenario(queryCategories)),
];

/** Handy for tests: `server.use(failingHandler("/properties"))`. */
export function failingHandler(path: string, status = 500) {
  return http.get(endpoint(path), () => errorResponse(status, "Mock failure"));
}
