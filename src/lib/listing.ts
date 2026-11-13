import type { TransitLineId } from "@/types/property";

/** How Bangkok riders name each line: by colour first. */
export const lineColourName: Record<TransitLineId, string> = {
  "bts-sukhumvit": "BTS สายสีเขียวอ่อน",
  "bts-silom": "BTS สายสีเขียวเข้ม",
  "mrt-blue": "MRT สายสีน้ำเงิน",
};

/** 1600 ตร.ว. → "4 ไร่", 250 → "2 งาน 50 ตร.ว." (1 ไร่ = 4 งาน = 400 ตร.ว.) */
export function formatLandSize(squareWah: number): string {
  const rai = Math.floor(squareWah / 400);
  const ngan = Math.floor((squareWah % 400) / 100);
  const wah = Math.round(squareWah % 100);
  return [rai && `${rai} ไร่`, ngan && `${ngan} งาน`, wah && `${wah} ตร.ว.`].filter(Boolean).join(" ") || "0 ตร.ว.";
}

/** Thai Buddhist-era year. */
export const toBuddhistYear = (isoOrYear: string | number) =>
  (typeof isoOrYear === "number" ? isoOrYear : new Date(isoOrYear).getFullYear()) + 543;

const thaiDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
export const formatThaiDate = (iso: string) => thaiDate.format(new Date(iso));

/** 15 → "ภายใน 15 นาที", 120 → "ภายใน 2 ชั่วโมง" */
export function formatResponseTime(minutes: number): string {
  return minutes < 60 ? `ภายใน ${minutes} นาที` : `ภายใน ${Math.round(minutes / 60)} ชั่วโมง`;
}
