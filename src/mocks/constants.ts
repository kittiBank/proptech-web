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

/** The one-time code the mock "SMS" sends when verifying a phone number. */
export const MOCK_OTP_CODE = "123456";

/** Mock admin sign-in (E11): a super admin, then the authenticator code. */
export const DEMO_ADMIN = { email: "napat@propertyhub.co.th", password: "Admin1234", code: "246810" } as const;
