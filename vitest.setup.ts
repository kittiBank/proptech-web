import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { resetMockDrafts } from "@/mocks/drafts";
import { resetMockFavorites } from "@/mocks/favorites";
import { server } from "@/mocks/node";
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
  window.sessionStorage.clear();
  resetNavigation();
});

afterAll(() => server.close());
