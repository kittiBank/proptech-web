import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/mocks/node";
import { setMockScenario } from "@/mocks/scenario";

// Every test talks to the same mock API as the browser; fail loudly on unmocked requests.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  setMockScenario("default");
});

afterAll(() => server.close());
