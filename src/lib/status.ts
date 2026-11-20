/**
 * Domain statuses → Thai label and tone (design handoff §4 "Domain statuses").
 * `StatusPill` renders these; keep the tables here so pages and tests share them.
 */

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "violet";

interface StatusInfo {
  label: string;
  tone: StatusTone;
}

export const listingStatuses = {
  draft: { label: "ฉบับร่าง", tone: "neutral" },
  pending_review: { label: "รอตรวจสอบ", tone: "warning" },
  published: { label: "เผยแพร่แล้ว", tone: "success" },
  rejected: { label: "ไม่ผ่านการตรวจ", tone: "danger" },
  expired: { label: "หมดอายุ", tone: "warning" },
  closed: { label: "ปิดประกาศ", tone: "neutral" },
  sold: { label: "ขายแล้ว", tone: "neutral" },
  rented: { label: "ให้เช่าแล้ว", tone: "neutral" },
} as const satisfies Record<string, StatusInfo>;

export const promotionStatuses = {
  none: { label: "ไม่มีโปรโมต", tone: "neutral" },
  bump: { label: "ดันประกาศ", tone: "violet" },
  auto_bump: { label: "ดันอัตโนมัติ", tone: "violet" },
  featured: { label: "ประกาศแนะนำ", tone: "violet" },
  homepage_pin: { label: "ปักหมุดหน้าแรก", tone: "violet" },
} as const satisfies Record<string, StatusInfo>;

export const viewingStatuses = {
  requested: { label: "รอยืนยัน", tone: "warning" },
  confirmed: { label: "ยืนยันแล้ว", tone: "success" },
  counter_proposed: { label: "เสนอเวลาใหม่", tone: "warning" },
  declined: { label: "ปฏิเสธ", tone: "neutral" },
  expired: { label: "หมดเวลา", tone: "neutral" },
  cancelled: { label: "ยกเลิก", tone: "neutral" },
  completed: { label: "ดูทรัพย์แล้ว", tone: "neutral" },
} as const satisfies Record<string, StatusInfo>;

export const paymentStatuses = {
  pending: { label: "รอชำระ", tone: "warning" },
  paid: { label: "ชำระแล้ว", tone: "success" },
  failed: { label: "ชำระไม่สำเร็จ", tone: "danger" },
  refund_requested: { label: "ขอคืนเงิน", tone: "danger" },
  refunded: { label: "คืนเงินแล้ว", tone: "neutral" },
} as const satisfies Record<string, StatusInfo>;

export const kycStatuses = {
  not_started: { label: "ยังไม่เริ่ม", tone: "neutral" },
  in_progress: { label: "กำลังกรอก", tone: "neutral" },
  submitted: { label: "ส่งแล้ว รอตรวจ", tone: "warning" },
  needs_info: { label: "ขอข้อมูลเพิ่ม", tone: "warning" },
  approved: { label: "ยืนยันแล้ว", tone: "success" },
  rejected: { label: "ไม่ผ่าน", tone: "danger" },
} as const satisfies Record<string, StatusInfo>;

export const userStatuses = {
  active: { label: "ใช้งาน", tone: "success" },
  suspended: { label: "ระงับชั่วคราว", tone: "danger" },
  banned: { label: "แบน", tone: "danger" },
  pending_kyc: { label: "รอยืนยันตัวตน", tone: "warning" },
} as const satisfies Record<string, StatusInfo>;

export type ReportSeverity = "low" | "medium" | "high";

export const reportStatuses = {
  open: { label: "เปิดอยู่", tone: "warning" },
  awaiting_reporter: { label: "รอผู้แจ้ง", tone: "warning" },
  resolved: { label: "แก้ไขแล้ว", tone: "success" },
  dismissed: { label: "ยกเรื่อง", tone: "neutral" },
} as const satisfies Record<string, StatusInfo>;

/** Open reports take their tone from severity: high = danger, medium = warning, low = neutral. */
export function reportTone(status: keyof typeof reportStatuses, severity: ReportSeverity = "medium"): StatusTone {
  if (status !== "open") return reportStatuses[status].tone;
  return severity === "high" ? "danger" : severity === "medium" ? "warning" : "neutral";
}

export type ListingStatus = keyof typeof listingStatuses;
export type PromotionStatus = keyof typeof promotionStatuses;
export type ViewingStatus = keyof typeof viewingStatuses;
export type PaymentStatus = keyof typeof paymentStatuses;
export type KycStatus = keyof typeof kycStatuses;
export type UserStatus = keyof typeof userStatuses;
export type ReportStatus = keyof typeof reportStatuses;
