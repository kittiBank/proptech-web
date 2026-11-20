import type { ListingMode } from "@/types/property";

const thb = new Intl.NumberFormat("th-TH");

/** 6,900,000 → "6.9 ล้าน", 25,000 → "25,000" */
export function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    const rounded = millions >= 100 ? Math.round(millions) : Math.round(millions * 100) / 100;
    return `${thb.format(rounded)} ล้าน`;
  }
  return thb.format(price);
}

export function formatListingPrice(price: number, mode: ListingMode): string {
  return mode === "rent" ? `฿${formatPrice(price)}/เดือน` : `฿${formatPrice(price)}`;
}

export function formatNumber(value: number): string {
  return thb.format(value);
}

export function formatPricePerSqm(value: number): string {
  return `฿${thb.format(value)}/ตร.ม.`;
}

/** Mock data is dated relative to this day; pass the real date once listings come from the API. */
export const MOCK_TODAY = new Date("2026-11-10");

export function formatRelativeDays(isoDate: string, now: Date = MOCK_TODAY): string {
  const days = Math.max(0, Math.round((now.getTime() - new Date(isoDate).getTime()) / 86_400_000));
  if (days === 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันที่แล้ว`;
  return `${Math.round(days / 7)} สัปดาห์ที่แล้ว`;
}

/** "เมื่อสักครู่", "5 นาทีที่แล้ว", "3 ชั่วโมงที่แล้ว", "2 วันที่แล้ว", "3 เดือนที่แล้ว", "1 ปีที่แล้ว". */
export function formatTimeAgo(isoDate: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(isoDate).getTime()) / 60_000));
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "เมื่อวาน" : `${days} วันที่แล้ว`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} เดือนที่แล้ว`;
  return `${Math.round(months / 12)} ปีที่แล้ว`;
}

const BANGKOK = "Asia/Bangkok";
const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BANGKOK,
});
const dayMonth = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: BANGKOK });
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: BANGKOK });

/** Bangkok calendar day, "2026-11-20". */
export const bangkokDay = (date: Date) => ymd.format(date);

/** Notification stamp (B19): "10:51" today, "เมื่อวาน", then "14 พ.ย.". */
export function formatShortStamp(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  if (bangkokDay(date) === bangkokDay(now)) return clock.format(date);
  if (bangkokDay(date) === bangkokDay(new Date(now.getTime() - 86_400_000))) return "เมื่อวาน";
  return dayMonth.format(date);
}
