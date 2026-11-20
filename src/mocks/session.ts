import type { OAuthProvider, OnboardingRequest, UserDto } from "@/types/api";
import { DEMO_ACCOUNT, MOCK_RESET_TOKEN, MOCK_VERIFY_TOKEN } from "./constants";

/**
 * Mock accounts and the signed-in session, behind `/auth/*` and `/me`.
 *
 * In the browser, accounts live in localStorage and the session in
 * localStorage ("remember me") or sessionStorage (until the tab closes), like
 * a persistent vs. session cookie. Tests and Node keep everything in memory.
 */

type Account = UserDto & { password: string };

const USERS_KEY = "propertyhub:mock:users";
const SESSION_KEY = "propertyhub:mock:session";

const demoUser: Account = {
  id: "u-1",
  firstName: "สมหญิง",
  lastName: "ใจดี",
  email: DEMO_ACCOUNT.email,
  password: DEMO_ACCOUNT.password,
  emailVerified: true,
  onboarded: true,
  role: "seeker",
};

const inBrowser = () => typeof window !== "undefined" && process.env.NODE_ENV !== "test";

function store(kind: "local" | "session"): Storage | undefined {
  try {
    return inBrowser() ? (kind === "local" ? window.localStorage : window.sessionStorage) : undefined;
  } catch {
    return undefined;
  }
}

let accounts: Account[] | undefined;
let sessionUserId: string | null | undefined;
/** Account that asked for a password reset most recently; the mock reset link applies to it. */
let resetFor: string | undefined;

function loadAccounts(): Account[] {
  if (accounts) return accounts;
  try {
    const raw = store("local")?.getItem(USERS_KEY);
    accounts = raw ? (JSON.parse(raw) as Account[]) : [{ ...demoUser }];
  } catch {
    accounts = [{ ...demoUser }];
  }
  return accounts;
}

function saveAccounts() {
  try {
    store("local")?.setItem(USERS_KEY, JSON.stringify(accounts ?? []));
  } catch {
    // Storage unavailable: accounts last until reload.
  }
}

function loadSession(): string | null {
  if (sessionUserId !== undefined) return sessionUserId;
  sessionUserId = store("local")?.getItem(SESSION_KEY) ?? store("session")?.getItem(SESSION_KEY) ?? null;
  return sessionUserId;
}

function setSession(userId: string | null, remember = true) {
  sessionUserId = userId;
  try {
    store("local")?.removeItem(SESSION_KEY);
    store("session")?.removeItem(SESSION_KEY);
    if (userId) store(remember ? "local" : "session")?.setItem(SESSION_KEY, userId);
  } catch {
    // Memory only.
  }
}

function toDto(account: Account): UserDto {
  const user: Partial<Account> = { ...account };
  delete user.password;
  return user as UserDto;
}
const normalise = (email: string) => email.trim().toLowerCase();

export function currentUser(): UserDto | undefined {
  const id = loadSession();
  const account = id ? loadAccounts().find((a) => a.id === id) : undefined;
  return account && toDto(account);
}

export function login(email: string, password: string, remember: boolean): UserDto | undefined {
  const account = loadAccounts().find((a) => a.email === normalise(email) && a.password === password);
  if (!account) return undefined;
  setSession(account.id, remember);
  return toDto(account);
}

/** `undefined` = the email is already registered. */
export function register(input: { firstName: string; lastName: string; email: string; password: string }) {
  const list = loadAccounts();
  if (list.some((a) => a.email === normalise(input.email))) return undefined;
  const account: Account = {
    id: `u-${Date.now().toString(36)}`,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: normalise(input.email),
    password: input.password,
    emailVerified: false,
    onboarded: false,
  };
  list.push(account);
  saveAccounts();
  setSession(account.id);
  return toDto(account);
}

/** Google/LINE: signs in that provider's mock account, creating it on first use. */
export function oauthLogin(provider: OAuthProvider): UserDto {
  const email = `${provider}.user@example.com`;
  const list = loadAccounts();
  let account = list.find((a) => a.email === email);
  if (!account) {
    account = {
      id: `u-${provider}`,
      firstName: "ผู้ใช้",
      lastName: provider === "google" ? "Google" : "LINE",
      email,
      password: "",
      emailVerified: true,
      onboarded: false,
    };
    list.push(account);
    saveAccounts();
  }
  setSession(account.id);
  return toDto(account);
}

export function logout() {
  setSession(null);
}

/** Marks the signed-in user's email verified. `false` = bad token or nobody signed in. */
export function verifyEmail(token: string): UserDto | false {
  const id = loadSession();
  const account = loadAccounts().find((a) => a.id === id);
  if (token !== MOCK_VERIFY_TOKEN || !account) return false;
  account.emailVerified = true;
  saveAccounts();
  return toDto(account);
}

export function requestPasswordReset(email: string) {
  resetFor = loadAccounts().find((a) => a.email === normalise(email))?.id;
}

/** `false` = bad token, or no reset was requested for a known account. */
export function resetPassword(token: string, password: string): boolean {
  const account = loadAccounts().find((a) => a.id === resetFor);
  if (token !== MOCK_RESET_TOKEN || !account) return false;
  account.password = password;
  resetFor = undefined;
  saveAccounts();
  // Saving a new password signs out every device.
  setSession(null);
  return true;
}

export function completeOnboarding(input: OnboardingRequest): UserDto | undefined {
  const id = loadSession();
  const account = loadAccounts().find((a) => a.id === id);
  if (!account) return undefined;
  Object.assign(
    account,
    { onboarded: true },
    input.role && { role: input.role },
    input.preferences && { preferences: input.preferences },
  );
  saveAccounts();
  return toDto(account);
}

/** Tests: fresh accounts (demo user only) and signed out, or signed in as the demo user. */
export function resetMockSession({ signedIn = false } = {}) {
  accounts = [{ ...demoUser }];
  sessionUserId = signedIn ? demoUser.id : null;
  resetFor = undefined;
}

/** Renames the signed-in account (profile page). */
export function updateAccountNames(userId: string, names: { firstName?: string; lastName?: string }) {
  const account = loadAccounts().find((a) => a.id === userId);
  if (!account) return;
  if (names.firstName) account.firstName = names.firstName;
  if (names.lastName) account.lastName = names.lastName;
  saveAccounts();
}

/** `false` when the current password is wrong. */
export function changePassword(userId: string, current: string, next: string): boolean {
  const account = loadAccounts().find((a) => a.id === userId);
  if (!account || account.password !== current) return false;
  account.password = next;
  saveAccounts();
  return true;
}

/** Deletes the account and signs out (PDPA "ลบบัญชี"). */
export function deleteAccount(userId: string) {
  accounts = loadAccounts().filter((a) => a.id !== userId);
  saveAccounts();
  setSession(null);
}
