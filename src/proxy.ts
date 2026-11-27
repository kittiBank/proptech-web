import { NextResponse, type NextRequest } from "next/server";
import { listingAvailability } from "@/lib/api/server";
import { adminRewrite, isAdminRequest } from "@/lib/admin";
import { contact } from "@/data/navigation";
import { legacySearchRedirect } from "@/lib/search-params";
import { isMaintenanceMode, maintenancePageHtml, maintenanceWindow, retryAfterSeconds } from "@/lib/maintenance";

const LISTING_PATH = /^\/property\/([^/]+)\/?$/;
const MAINTENANCE_PATH = "/maintenance";
/** Matches no route, so Next renders `not-found.tsx` (D8) with a real 404. */
const NOT_FOUND_PATH = "/_not-found";

/**
 * Runs before every page:
 * - `ADMIN_HOST`: the admin subdomain is served from `/admin/*`, which the public host hides (FE-20).
 *
 * And sets HTTP statuses that pages cannot: with Cache Components the static shell streams with
 * 200 before the data is known, so the check has to happen here, before rendering.
 * - `MAINTENANCE_MODE=on`: every site page answers the standalone D10 page with 503 and
 *   `Retry-After`; `/maintenance` previews it. The admin app stays up. The proxy returns this
 *   response itself because Next ignores a rewrite's `status` in production.
 * - Unknown listings: 404 with D8.
 * - `/buy` and `/rent`: permanent redirect to `/search` with the mode and filters (FE-23).
 *
 * Closed listings (D9) still answer 200 with `noindex`: a rewrite's status is ignored once the
 * page streams, and a 410 would mean proxying the HTML through a second request.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const adminHost = process.env.ADMIN_HOST;

  const admin = adminRewrite(host, pathname, adminHost);
  if (admin === "not-found") return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  if (admin) {
    const url = request.nextUrl.clone();
    url.pathname = admin.to;
    return NextResponse.rewrite(url);
  }

  const maintenance = isMaintenanceMode() && !isAdminRequest(host, pathname, adminHost);
  if (maintenance || pathname === MAINTENANCE_PATH) {
    const now = Date.now();
    const schedule = maintenanceWindow();
    return new Response(maintenancePageHtml(schedule, now, contact.line), {
      // `/maintenance` on its own is a preview of the page.
      status: maintenance ? 503 : 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        ...(maintenance && { "Retry-After": String(retryAfterSeconds(schedule, now)) }),
      },
    });
  }

  const legacy = legacySearchRedirect(pathname, request.nextUrl.searchParams);
  if (legacy) return NextResponse.redirect(new URL(legacy, request.url), 308);

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
