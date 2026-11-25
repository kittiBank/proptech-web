import { PLANS } from "@/lib/seller";
import { VAT_RATE, type BillingCycle, type OrderDto, type SellerPlan, type TaxProfileDto } from "@/types/api";

/**
 * Pricing, checkout and billing (C12, C13, C15): plan prices per cycle, the
 * VAT split, card checks, the mock PromptPay QR and a printable invoice.
 */

const money2 = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

/** "฿590" or, with `exact`, "฿590.00" (checkout and invoices). */
export const formatBaht = (amount: number, exact = false) => `฿${(exact ? money2 : money0).format(amount)}`;

/** VAT-inclusive amount → pre-VAT price and VAT, rounded to satang so they add back up. */
export function splitVat(amount: number) {
  const subtotal = Math.round((amount / (1 + VAT_RATE)) * 100) / 100;
  return { subtotal, vat: Math.round((amount - subtotal) * 100) / 100 };
}

/** Yearly billing is 10 months' price ("ประหยัด 2 เดือน"). */
export const YEARLY_MONTHS = 10;

export function planPrice(plan: SellerPlan, cycle: BillingCycle): number {
  const monthly = PLANS[plan].price;
  return cycle === "yearly" ? monthly * YEARLY_MONTHS : monthly;
}

/** What a plan costs per month on a cycle, rounded to the baht (yearly Pro = ฿1,075). */
export const pricePerMonth = (plan: SellerPlan, cycle: BillingCycle) =>
  Math.round(planPrice(plan, cycle) / (cycle === "yearly" ? 12 : 1));

export const cycleLabel: Record<BillingCycle, string> = { monthly: "รายเดือน", yearly: "รายปี" };

/** Plan cards on `/pricing` (C12). */
export const planFeatures: Record<SellerPlan, string[]> = {
  free: [
    "ประกาศได้ 2 รายการ อายุ 60 วัน",
    "ป้าย “เจ้าของขายเอง”",
    "แชต รับนัดดูทรัพย์ และสถิติพื้นฐาน",
    "ดันประกาศฟรีทุก 7 วัน",
  ],
  agent_pro: [
    "ประกาศได้ 60 รายการ อายุ 90 วัน",
    "ดันอัตโนมัติ 120 ครั้งต่อเดือน",
    "ประกาศแนะนำ 5 ช่อง",
    "หน้าโปรไฟล์นายหน้าและป้ายยืนยันตัวตน",
    "สถิติรายประกาศ และส่งออก CSV",
  ],
  agency: [
    "ประกาศได้ 300 รายการ แบ่งให้ทีม",
    "ดันอัตโนมัติ 600 ครั้งต่อเดือน",
    "หน้าบริษัท และกระจายผู้สนใจให้ลูกทีม",
    "นำเข้าประกาศจาก XML / CSV",
    "ใบกำกับภาษีในนามบริษัท",
  ],
};

/** Mock discount codes: percent off. */
export const COUPONS: Record<string, number> = { WELCOME10: 10 };

/** Price after a coupon, to the satang. */
export const applyCoupon = (price: number, percent: number) => Math.round(price * (100 - percent)) / 100;

// --- Cards ----------------------------------------------------------------------

export const cardDigits = (number: string) => number.replace(/[\s-]/g, "");

/** Luhn check on 13–19 digits. */
export function isValidCardNumber(number: string): boolean {
  const digits = cardDigits(number);
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cardBrand(number: string): "visa" | "mastercard" | "jcb" | undefined {
  const d = cardDigits(number);
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^35/.test(d)) return "jcb";
  return undefined;
}

/** "MM/YY", not in the past. */
export function isValidExpiry(expiry: string, now = new Date()): boolean {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry.trim());
  if (!m) return false;
  const year = 2000 + Number(m[2]);
  const month = Number(m[1]);
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

/** "4242424242424242" → "4242 4242 4242 4242" while typing. */
export const formatCardNumber = (value: string) =>
  cardDigits(value)
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

/** "0829" → "08/29" while typing. */
export function formatExpiry(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Thai tax id: 13 digits with the mod-11 check digit. */
export function isValidTaxId(id: string): boolean {
  const d = id.replace(/\D/g, "");
  if (d.length !== 13) return false;
  const sum = [...d.slice(0, 12)].reduce((s, c, i) => s + Number(c) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(d[12]);
}

// --- PromptPay QR (mock) ---------------------------------------------------------

const QR_SIZE = 25;

/**
 * A QR-looking grid for the mock PromptPay payload: three finder squares and
 * a pattern seeded from the payload. Not scannable; the real one comes from the payment provider.
 */
export function qrMatrix(payload: string): boolean[][] {
  let seed = 0;
  for (const ch of payload) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [
      [0, 0],
      [0, QR_SIZE - 7],
      [QR_SIZE - 7, 0],
    ]) {
      const y = r - fr;
      const x = c - fc;
      if (y >= -1 && y <= 7 && x >= -1 && x <= 7) {
        if (y < 0 || y > 6 || x < 0 || x > 6) return false;
        return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
      }
    }
    return undefined;
  };
  return Array.from({ length: QR_SIZE }, (_, r) =>
    Array.from({ length: QR_SIZE }, (_, c) => finder(r, c) ?? next() % 100 < 45),
  );
}

// --- Invoice ----------------------------------------------------------------------

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const invoiceDate = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** A printable tax invoice for a paid order ("ใบกำกับภาษี"); the real PDF comes from the billing service. */
export function invoiceHtml(order: OrderDto, profile: TaxProfileDto): string {
  const row = (label: string, value: string) =>
    `<tr><td>${escapeHtml(label)}</td><td style="text-align:right">${escapeHtml(value)}</td></tr>`;
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบกำกับภาษี ${escapeHtml(order.invoiceNo ?? order.id)}</title>
<style>body{font-family:sans-serif;max-width:640px;margin:40px auto;color:#1A1630}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #E4E0EC}</style></head><body>
<h1>ใบเสร็จรับเงิน / ใบกำกับภาษี</h1>
<p>เลขที่ ${escapeHtml(order.invoiceNo ?? "-")}<br>วันที่ ${escapeHtml(invoiceDate.format(new Date(order.paidAt ?? order.createdAt)))}</p>
<p><b>ผู้ขาย</b> บริษัท พร็อพเพอร์ตี้ฮับ จำกัด (ตัวอย่าง)</p>
<p><b>ผู้ซื้อ</b> ${escapeHtml(profile.name)}${profile.taxId ? `<br>เลขประจำตัวผู้เสียภาษี ${escapeHtml(profile.taxId)} ${escapeHtml(profile.branch ?? "")}` : ""}${profile.address ? `<br>${escapeHtml(profile.address)}` : ""}</p>
<table>${row(order.title + (order.detail ? ` (${order.detail})` : ""), formatBaht(order.listPrice, true))}${order.discount ? row(`ส่วนลด ${order.coupon ?? ""}`, `-${formatBaht(order.discount, true)}`) : ""}${row("ราคาก่อน VAT", formatBaht(order.subtotal, true))}${row("VAT 7%", formatBaht(order.vat, true))}${row("รวมทั้งสิ้น", formatBaht(order.amount, true))}</table>
</body></html>`;
}
