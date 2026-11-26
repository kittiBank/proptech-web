import { NextResponse, type NextRequest } from "next/server";
import { listingAvailability } from "@/lib/api/server";
import { isMaintenanceMode, maintenanceWindow, retryAfterSeconds } from "@/lib/maintenance";

const LISTING_PATH = /^\/property\/([^/]+)\/?$/;
const MAINTENANCE_PATH = "/maintenance";
/** Matches no route, so Next renders `not-found.tsx` (D8) with a real 404. */
const NOT_FOUND_PATH = "/_not-found-listing";

/**
 * HTTP statuses that pages cannot set: with Cache Components the static shell streams with
 * 200 before the data is known, so the check has to happen here, before rendering.
 * - `MAINTENANCE_MODE=on`: every page shows `/maintenance` with 503 and `Retry-After` (D10).
 * - Unknown listings: 404 with D8.
 *
 * Closed listings (D9) still answer 200 with `noindex`: a rewrite's status is ignored once the
 * page streams, and a 410 would mean proxying the HTML through a second request.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMaintenanceMode()) {
    if (pathname === MAINTENANCE_PATH) return;
    const url = request.nextUrl.clone();
    url.pathname = MAINTENANCE_PATH;
    url.search = "";
    return NextResponse.rewrite(url, {
      status: 503,
      headers: { "Retry-After": String(retryAfterSeconds(maintenanceWindow(), Date.now())) },
    });
  }

  const slug = LISTING_PATH.exec(pathname)?.[1];
  // If the API is down, let the page load and show its own error state.
  if (slug && (await listingAvailability(decodeURIComponent(slug)).catch(() => "live")) === "missing") {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }
}

export const config = {
  // Pages only: not build assets, files with an extension (images, the MSW worker) or the mock API.
  matcher: ["/((?!_next/|mock-api/|.*\\.[^/]+$).*)"],
};
