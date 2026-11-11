/**
 * Mock API behaviour switch, for checking loading, error and empty states by hand.
 *
 * Add `?mock=<scenario>` to any page URL while the mock API is active:
 *   default  realistic latency (100–400 ms), normal data
 *   slow     every response takes 3 s
 *   error    every endpoint answers 500
 *   flaky    about half the responses answer 503 (shows retries working)
 *   empty    every list comes back empty
 *
 * The choice is read once when the worker starts; reload to change it.
 * Tests call `setMockScenario` directly or override handlers with `server.use`.
 */
export const mockScenarios = ["default", "slow", "error", "flaky", "empty"] as const;
export type MockScenario = (typeof mockScenarios)[number];

let current: MockScenario = "default";

export function getMockScenario(): MockScenario {
  return current;
}

export function setMockScenario(next: MockScenario) {
  current = next;
}

export function parseMockScenario(value: string | null | undefined): MockScenario {
  return mockScenarios.find((s) => s === value) ?? "default";
}
