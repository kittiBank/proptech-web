import type { ApiErrorBody } from "@/types/api";

/**
 * Thin HTTP client for the PropertyHub API.
 *
 * - NEXT_PUBLIC_API_URL set   → requests go to that origin (the NestJS API).
 * - NEXT_PUBLIC_API_URL unset → requests go to `/mock-api` on this site and are
 *   answered in the browser by MSW (`src/mocks`). Nothing else changes.
 *
 * NEXT_PUBLIC_ values are inlined at build time, so the mock branch (and the
 * MSW bundle it imports) is dropped from builds that point at a real API.
 */
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export const MOCK_API_BASE_PATH = "/mock-api";
export const API_BASE_URL = configuredApiUrl || MOCK_API_BASE_PATH;

/** Non-2xx response. `body` follows the NestJS error shape when the server sent one. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, path: string) {
    const detail = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    super(`${path} failed with ${status}${detail ? `: ${detail}` : ""}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

let mockWorkerReady: Promise<void> | undefined;

/** Starts the MSW worker once, before the first mock request leaves the page. */
function waitForMockApi(): Promise<void> | undefined {
  // Reads the env var directly so the build can fold it and drop the MSW chunk.
  if (process.env.NEXT_PUBLIC_API_URL) return;
  // Server render: queries only run in the browser. Tests: msw/node is set up in vitest.setup.ts.
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") return;
  mockWorkerReady ??= import("@/mocks/browser")
    .then(({ startMockWorker }) => startMockWorker())
    .catch((error: unknown) => {
      // Let the next request try again (e.g. after the user retries).
      mockWorkerReady = undefined;
      throw error;
    });
  return mockWorkerReady;
}

export function buildApiUrl(path: string, query?: QueryParams): URL {
  const base = /^https?:\/\//.test(API_BASE_URL)
    ? API_BASE_URL
    : `${globalThis.location?.origin ?? "http://localhost"}${API_BASE_URL}`;
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

export async function apiGet<T>(path: string, query?: QueryParams, init?: RequestInit): Promise<T> {
  await waitForMockApi();
  const res = await fetch(buildApiUrl(path, query), {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body, `GET ${path}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<TResponse, TBody>(path: string, body: TBody, init?: RequestInit): Promise<TResponse> {
  await waitForMockApi();
  const res = await fetch(buildApiUrl(path), {
    ...init,
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, errorBody, `POST ${path}`);
  }
  return (await res.json()) as TResponse;
}
