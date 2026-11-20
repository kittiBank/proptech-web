import type { NotificationMatrix, ProfileDto, SignedInDevice, UpdateProfileRequest, UserDto } from "@/types/api";
import { MOCK_OTP_CODE } from "./constants";

/**
 * Profile extras and settings for each account, behind `/me/profile` and
 * friends. Names and email live on the session account; everything else is
 * here. localStorage in the browser, memory under tests.
 */

type Extras = Omit<ProfileDto, "firstName" | "lastName" | "email" | "emailVerified"> & { pendingPhone?: string };

const KEY = "propertyhub:mock:profiles";
let store: Record<string, Extras> | undefined;

const storage = () => {
  try {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "test" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function load() {
  if (store) return store;
  try {
    store = JSON.parse(storage()?.getItem(KEY) ?? "{}") as Record<string, Extras>;
  } catch {
    store = {};
  }
  return store;
}

function persist() {
  try {
    storage()?.setItem(KEY, JSON.stringify(store));
  } catch {
    // Memory only.
  }
}

export const defaultNotifications = (): NotificationMatrix => ({
  saved_search: { email: true, line: true, web: true },
  price_drop: { email: true, line: true, web: true },
  message: { email: true, line: false, web: true },
  listing_closed: { email: false, line: false, web: true },
  new_project: { email: false, line: false, web: true },
});

function demoDevices(): SignedInDevice[] {
  return [
    { id: "d-1", name: "MacBook Air, Chrome", current: true, lastActiveAt: new Date().toISOString() },
    { id: "d-2", name: "iPhone, Safari", current: false, lastActiveAt: "2026-11-19T20:15:00.000Z" },
  ];
}

/** First look at an account: the demo user starts with a phone to verify, as in B7. */
function extrasFor(user: UserDto): Extras {
  const all = load();
  all[user.id] ??= {
    phone: user.id === "u-1" ? "0812345678" : undefined,
    phoneVerified: false,
    language: "th",
    linked: { google: user.id === "u-1" ? user.email : undefined, line: false },
    passwordChangedAt: "2026-08-20T09:00:00.000Z",
    devices: demoDevices(),
    notifications: defaultNotifications(),
    marketingOptIn: false,
  };
  return all[user.id];
}

export function getProfile(user: UserDto): ProfileDto {
  const { pendingPhone: _pending, ...extras } = extrasFor(user);
  void _pending;
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    emailVerified: user.emailVerified,
    ...extras,
  };
}

export function updateProfile(user: UserDto, patch: UpdateProfileRequest) {
  const extras = extrasFor(user);
  if (patch.phone !== undefined && patch.phone !== extras.phone) {
    extras.phone = patch.phone || undefined;
    extras.phoneVerified = false;
  }
  if (patch.lineId !== undefined) extras.lineId = patch.lineId.trim() || undefined;
  if (patch.language) extras.language = patch.language;
  if (patch.avatarUrl !== undefined) extras.avatarUrl = patch.avatarUrl ?? undefined;
  if (patch.notifications) extras.notifications = { ...extras.notifications, ...patch.notifications };
  if (patch.marketingOptIn !== undefined) extras.marketingOptIn = patch.marketingOptIn;
  persist();
}

/** "Sends" an OTP to the profile phone. `false` when there is no phone to verify. */
export function sendPhoneOtp(user: UserDto): boolean {
  const extras = extrasFor(user);
  if (!extras.phone) return false;
  extras.pendingPhone = extras.phone;
  return true;
}

export function verifyPhone(user: UserDto, code: string): boolean {
  const extras = extrasFor(user);
  if (!extras.pendingPhone || extras.pendingPhone !== extras.phone || code !== MOCK_OTP_CODE) return false;
  extras.phoneVerified = true;
  extras.pendingPhone = undefined;
  persist();
  return true;
}

export function markPasswordChanged(user: UserDto) {
  extrasFor(user).passwordChangedAt = new Date().toISOString();
  persist();
}

export function setLinked(user: UserDto, provider: "google" | "line", linked: boolean) {
  const extras = extrasFor(user);
  if (provider === "google") extras.linked.google = linked ? user.email : undefined;
  else extras.linked.line = linked;
  persist();
}

export function signOutOtherDevices(user: UserDto) {
  const extras = extrasFor(user);
  extras.devices = extras.devices.filter((d) => d.current);
  persist();
}

export function deleteProfile(userId: string) {
  delete load()[userId];
  persist();
}

export function resetMockAccount() {
  store = {};
}
