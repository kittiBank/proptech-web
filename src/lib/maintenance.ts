/**
 * Planned maintenance (D10 right). The window comes from env so ops can change it without a
 * deploy of new code: `MAINTENANCE_STARTS_AT` / `MAINTENANCE_ENDS_AT` (ISO). `MAINTENANCE_MODE=on`
 * makes `proxy.ts` serve `/maintenance` with HTTP 503 for every page.
 */

export interface MaintenanceWindow {
  /** ISO date-time. */
  startsAt: string;
  /** ISO date-time. */
  endsAt: string;
}

export type MaintenancePhase = "upcoming" | "active" | "over";

/** Demo window: Sunday 29 Nov 2026, 02:00–04:00 Bangkok time. */
const DEFAULT_WINDOW: MaintenanceWindow = {
  startsAt: "2026-11-29T02:00:00+07:00",
  endsAt: "2026-11-29T04:00:00+07:00",
};

export function maintenanceWindow(env: Record<string, string | undefined> = process.env): MaintenanceWindow {
  const startsAt = env.MAINTENANCE_STARTS_AT?.trim();
  const endsAt = env.MAINTENANCE_ENDS_AT?.trim();
  const valid = (iso?: string): iso is string => Boolean(iso) && !Number.isNaN(Date.parse(iso!));
  return valid(startsAt) && valid(endsAt) ? { startsAt, endsAt } : DEFAULT_WINDOW;
}

export function isMaintenanceMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.MAINTENANCE_MODE?.trim().toLowerCase() === "on";
}

export function maintenancePhase(window: MaintenanceWindow, now: number): MaintenancePhase {
  if (now < Date.parse(window.startsAt)) return "upcoming";
  return now < Date.parse(window.endsAt) ? "active" : "over";
}

/** Whole seconds until the window ends (at least 60), for the 503 `Retry-After` header. */
export function retryAfterSeconds(window: MaintenanceWindow, now: number): number {
  return Math.max(60, Math.ceil((Date.parse(window.endsAt) - now) / 1000));
}

/** 5,040,000 ms → "1 ชม. 24 นาที"; days when over a day; "ไม่ถึง 1 นาที" at the end. Rounds minutes up. */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(Math.max(0, ms) / 60_000);
  if (totalMinutes < 1) return "ไม่ถึง 1 นาที";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return [`${days} วัน`, hours > 0 && `${hours} ชม.`].filter(Boolean).join(" ");
  return [hours > 0 && `${hours} ชม.`, minutes > 0 && `${minutes} นาที`].filter(Boolean).join(" ");
}

const day = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Bangkok",
});
const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

/** "วันอาทิตย์ที่ 29 พ.ย. 02:00 ถึง 04:00 น." (Bangkok time). */
export function formatMaintenanceWindow(window: MaintenanceWindow): string {
  const start = new Date(window.startsAt);
  const end = new Date(window.endsAt);
  const sameDay = day.format(start) === day.format(end);
  return sameDay
    ? `${day.format(start)} ${time.format(start)} ถึง ${time.format(end)} น.`
    : `${day.format(start)} ${time.format(start)} น. ถึง${day.format(end)} ${time.format(end)} น.`;
}
