/**
 * Thin data-access seam. Today every call resolves mock data; once the NestJS
 * API is live, set NEXT_PUBLIC_API_URL and replace the bodies in
 * `properties.ts` with `apiGet<T>(path)` calls — the signatures stay the same.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}
