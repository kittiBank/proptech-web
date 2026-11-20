import type { NotificationDto, NotificationKind } from "@/types/api";

/**
 * In-app notifications (B19) behind `/me/notifications`. Each account starts
 * with the demo feed; read state is kept per account. localStorage in the
 * browser, memory under tests.
 */

const KEY = "propertyhub:mock:notifications";
let store: Record<string, NotificationDto[]> | undefined;

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
    store = JSON.parse(storage()?.getItem(KEY) ?? "{}") as Record<string, NotificationDto[]>;
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

/** Relative to "now" so "today" always has something. */
function demoFeed(now = Date.now()): NotificationDto[] {
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  return [
    {
      id: "n-1",
      kind: "viewing",
      title: "ยืนยันนัดดูห้องแล้ว",
      detail: "ส. 22 พ.ย. 10:00 · 2 ห้องนอน ใกล้ EmQuartier",
      href: "/account/appointments",
      createdAt: hoursAgo(1),
      read: false,
    },
    {
      id: "n-2",
      kind: "price_drop",
      title: "ราคาลด ฿300,000 ในรายการโปรด",
      detail: "2 ห้องนอน ใกล้ EmQuartier ตอนนี้ ฿9.2 ล้าน",
      href: "/account/favorites",
      createdAt: hoursAgo(3),
      read: false,
    },
    {
      id: "n-3",
      kind: "new_match",
      title: "ประกาศใหม่ 4 รายการ ตรงกับ “เช่าคอนโด ใกล้ BTS อารีย์”",
      detail: "ราคา ฿12,000 ถึง ฿20,000/เดือน",
      href: "/search?mode=rent&type=condo&station=N5",
      createdAt: hoursAgo(5),
      read: true,
    },
    {
      id: "n-4",
      kind: "listing_closed",
      title: "ประกาศในรายการโปรดถูกปิด",
      detail: "สตูดิโอ ตกแต่งครบ ทองหล่อ ปล่อยเช่าแล้ว",
      href: "/account/favorites",
      createdAt: hoursAgo(30),
      read: true,
    },
    {
      id: "n-5",
      kind: "new_project",
      title: "โครงการใหม่ใกล้สถานีที่คุณสนใจ",
      detail: "แอสเตอร์ สาทร เปิดจองรอบพิเศษ",
      href: "/projects/aster-sathorn",
      createdAt: hoursAgo(24 * 6),
      read: true,
    },
    {
      id: "n-6",
      kind: "viewing",
      title: "คำขอนัดหมดอายุ",
      detail: "ผู้ลงประกาศไม่ได้ตอบภายใน 24 ชม. ลองเลือกเวลาใหม่",
      href: "/account/appointments",
      createdAt: hoursAgo(24 * 8),
      read: true,
    },
  ];
}

function feed(userId: string) {
  const all = load();
  all[userId] ??= demoFeed();
  return all[userId];
}

export function listNotifications(userId: string, kind?: NotificationKind): NotificationDto[] {
  return feed(userId)
    .filter((n) => !kind || n.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(userId: string) {
  return feed(userId).filter((n) => !n.read).length;
}

/** `false` when the notification does not exist. */
export function markNotificationRead(userId: string, id: string): boolean {
  const n = feed(userId).find((x) => x.id === id);
  if (!n) return false;
  n.read = true;
  persist();
  return true;
}

export function markAllNotificationsRead(userId: string) {
  feed(userId).forEach((n) => (n.read = true));
  persist();
}

/** Adds a notification (other mocks, e.g. a confirmed viewing in FE-14). */
export function pushNotification(userId: string, n: Omit<NotificationDto, "id" | "createdAt" | "read">) {
  feed(userId).unshift({ ...n, id: `n-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), read: false });
  persist();
}

export function resetMockNotifications() {
  store = {};
}
