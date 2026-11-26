import { HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { MOCK_API_BASE_PATH } from "@/lib/api/client";
import type { ApiErrorBody } from "@/types/api";
import { getMockScenario } from "./scenario";

/** Shared helpers for the MSW handler files. */

/** Matches the mock base path on any origin (browser page, jsdom, Node). */
export const endpoint = (path: string) => `*${MOCK_API_BASE_PATH}${path}`;

const statusText: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  403: "Forbidden",
  402: "Payment Required",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
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

/** Reads a JSON body; `{}` when it is missing or malformed so field checks report it. */
export async function readBody<T>(request: Request): Promise<Partial<T>> {
  return ((await request.json().catch(() => null)) ?? {}) as Partial<T>;
}

/** Simulated latency plus the `error` scenario, for write endpoints. */
export async function writeScenario() {
  await delay(200);
  return getMockScenario() === "error" ? errorResponse(500, "Mock server error") : undefined;
}
