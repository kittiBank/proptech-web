import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { parseMockScenario, setMockScenario } from "./scenario";

/**
 * Browser entry for the mock API. Loaded lazily by `lib/api/client.ts` only
 * when NEXT_PUBLIC_API_URL is unset. The worker script is
 * `public/mockServiceWorker.js` (regenerate with `pnpm exec msw init public`).
 */
export async function startMockWorker() {
  setMockScenario(parseMockScenario(new URLSearchParams(window.location.search).get("mock")));
  const worker = setupWorker(...handlers);
  await worker.start({
    // Images, fonts and Next.js assets go straight to the network.
    onUnhandledFrame: "bypass",
    quiet: process.env.NODE_ENV === "production",
  });
}
