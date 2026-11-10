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
