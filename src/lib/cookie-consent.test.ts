import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_KEY,
  acceptAll,
  hasConsent,
  parseConsent,
  rejectNonEssential,
  resetConsentCache,
  saveConsent,
} from "./cookie-consent";

afterEach(() => {
  window.localStorage.removeItem(CONSENT_KEY);
  resetConsentCache();
});

describe("cookie consent", () => {
  const now = Date.parse("2026-11-25T00:00:00Z");

  it("reads only a current, recent choice", () => {
    const fresh = JSON.stringify({ version: 1, analytics: true, marketing: false, decidedAt: "2026-06-01T00:00:00Z" });
    expect(parseConsent(fresh, now)).toMatchObject({ analytics: true, marketing: false });
    const old = JSON.stringify({ version: 1, analytics: true, marketing: true, decidedAt: "2025-10-01T00:00:00Z" });
    expect(parseConsent(old, now)).toBeNull();
    expect(parseConsent(JSON.stringify({ version: 0, decidedAt: "2026-06-01T00:00:00Z" }), now)).toBeNull();
    expect(parseConsent("not json", now)).toBeNull();
    expect(parseConsent(null, now)).toBeNull();
  });

  it("keeps non-essential cookies off until allowed", () => {
    expect(hasConsent("analytics")).toBe(false);
    rejectNonEssential();
    expect(hasConsent("analytics")).toBe(false);
    saveConsent({ analytics: true, marketing: false });
    expect(hasConsent("analytics")).toBe(true);
    expect(hasConsent("marketing")).toBe(false);
    acceptAll();
    expect(hasConsent("marketing")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(CONSENT_KEY)!)).toMatchObject({ version: 1, marketing: true });
  });
});
