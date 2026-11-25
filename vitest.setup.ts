import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { dismissToast } from "@/components/ui/toast";
import { resetMockAccount } from "@/mocks/account";
import { resetMockInbox } from "@/mocks/inbox";
import { resetMockDrafts } from "@/mocks/drafts";
import { resetMockFavorites } from "@/mocks/favorites";
import { server } from "@/mocks/node";
import { resetMockNotifications } from "@/mocks/notifications";
import { resetMockSavedSearches } from "@/mocks/saved-searches";
import { resetMockSeller } from "@/mocks/seller";
import { resetMockBilling } from "@/mocks/billing";
import { resetMockKyc } from "@/mocks/kyc";
import { resetMockSession } from "@/mocks/session";
import { setMockScenario } from "@/mocks/scenario";
import { resetNavigation } from "@/test/next-navigation";

vi.mock("next/navigation", () => import("@/test/next-navigation"));

// jsdom has no matchMedia; report "no match" for every query (e.g. motion is allowed).
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// jsdom has no layout; scrolling is a no-op.
Element.prototype.scrollIntoView ??= () => {};

// Every test talks to the same mock API as the browser; fail loudly on unmocked requests.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  setMockScenario("default");
  resetMockFavorites();
  resetMockSession();
  resetMockDrafts();
  resetMockSavedSearches();
  resetMockAccount();
  resetMockNotifications();
  resetMockInbox();
  resetMockSeller();
  resetMockBilling();
  resetMockKyc();
  window.sessionStorage.clear();
  resetNavigation();
  dismissToast();
});

afterAll(() => server.close());
