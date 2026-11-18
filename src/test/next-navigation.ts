import { vi } from "vitest";

/**
 * Shared stand-in for `next/navigation` (registered in vitest.setup.ts).
 * Tests set the URL with `setSearchParams` / `setPathname` and assert on
 * `router.push` / `router.replace`.
 */
export const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() };

let searchParams = new URLSearchParams();
let pathname = "/";
let params: Record<string, string> = {};

export function setParams(next: Record<string, string>) {
  params = next;
}

export function setSearchParams(query: string) {
  searchParams = new URLSearchParams(query);
}

export function setPathname(path: string) {
  pathname = path;
}

export function resetNavigation() {
  Object.values(router).forEach((fn) => fn.mockReset());
  searchParams = new URLSearchParams();
  pathname = "/";
  params = {};
}

export const useRouter = () => router;
export const useSearchParams = () => searchParams;
export const usePathname = () => pathname;
export const useParams = () => params;
export const redirect = vi.fn();
export const notFound = vi.fn();
