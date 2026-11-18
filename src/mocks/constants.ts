/**
 * Mock-only values the UI shows as hints while the mock API is active
 * (`MockHint`). Kept apart from the mock modules so importing them pulls in
 * no MSW code.
 */

/** Signs in on the mock login page. */
export const DEMO_ACCOUNT = { email: "somying@example.com", password: "Password1" } as const;

/** Tokens the mock "emails" carry; any other token is invalid. */
export const MOCK_VERIFY_TOKEN = "mock-verify";
export const MOCK_RESET_TOKEN = "mock-reset";
