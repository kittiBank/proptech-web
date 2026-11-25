"use client";

import { useSyncExternalStore } from "react";

/**
 * Cookie consent (D7). Necessary cookies are always on; analytics and
 * marketing stay off until the visitor allows them. The choice is kept in
 * localStorage for 12 months, then we ask again. Scripts that need consent
 * check `hasConsent()` before loading.
 */

export type ConsentCategory = "analytics" | "marketing";

export interface Consent {
  version: number;
  analytics: boolean;
  marketing: boolean;
  /** ISO date of the choice. */
  decidedAt: string;
}

export const CONSENT_KEY = "propertyhub:cookie-consent";
export const CONSENT_VERSION = 1;
const MAX_AGE_MS = 365 * 86_400_000;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let prefsOpen = false;

function storage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** A stored choice that is still valid, or `null` when we should ask. */
export function parseConsent(raw: string | null | undefined, now = Date.now()): Consent | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<Consent>;
    if (c.version !== CONSENT_VERSION || typeof c.decidedAt !== "string") return null;
    if (now - Date.parse(c.decidedAt) > MAX_AGE_MS) return null;
    return {
      version: c.version,
      analytics: c.analytics === true,
      marketing: c.marketing === true,
      decidedAt: c.decidedAt,
    };
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cached: Consent | null = null;

function read(): Consent | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(CONSENT_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseConsent(raw);
  }
  return cached;
}

export function saveConsent(choice: Pick<Consent, ConsentCategory>) {
  const value: Consent = { version: CONSENT_VERSION, ...choice, decidedAt: new Date().toISOString() };
  try {
    storage()?.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    // Private mode: the choice lasts for this page view.
    cachedRaw = JSON.stringify(value);
    cached = value;
  }
  prefsOpen = false;
  emit();
}

export const acceptAll = () => saveConsent({ analytics: true, marketing: true });
export const rejectNonEssential = () => saveConsent({ analytics: false, marketing: false });

export function setPreferencesOpen(open: boolean) {
  prefsOpen = open;
  emit();
}

/** Whether a category may run now (false until the visitor allows it). */
export const hasConsent = (category: ConsentCategory) => read()?.[category] === true;

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === CONSENT_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** `undefined` while rendering on the server (no banner in the HTML), `null` when not decided yet. */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export function usePreferencesOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => prefsOpen,
    () => false,
  );
}

/** Tests: forget the cached choice. */
export function resetConsentCache() {
  cachedRaw = undefined;
  cached = null;
  prefsOpen = false;
}
