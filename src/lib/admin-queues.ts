import type { StatusTone } from "@/lib/status";
import {
  MODERATION_SLA_MINUTES,
  REPORT_SLA_HOURS,
  type KycApplicationStatus,
  type ModerationItemDto,
  type ModerationReturnReason,
  type ModerationSort,
  type ReportAction,
  type ReportCaseDto,
  type ReportReason,
  type ReportSeverity,
} from "@/types/api";

/** Shared by the admin review queues (E2–E5) and their mock API. */

const MINUTE = 60_000;

const submittedDate = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});
const submittedTime = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

/** "26/11/2569: 14:17 น." (Bangkok time, Buddhist year like the rest of the app). */
export const formatSubmitted = (iso: string) =>
  `${submittedDate.format(new Date(iso))}: ${submittedTime.format(new Date(iso))} น.`;

/** "22 นาที", "1 ชม. 12 น.", "3 วัน" (design E2/E4). */
export function formatWait(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / MINUTE));
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} ชม. ${String(rest).padStart(2, "0")} น.` : `${hours} ชม.`;
  }
  return `${Math.floor(hours / 24)} วัน`;
}

export const listingOverSla = (submittedAt: string, now: number) =>
  now - Date.parse(submittedAt) > MODERATION_SLA_MINUTES * MINUTE;

export const reportOverSla = (c: Pick<ReportCaseDto, "severity" | "openedAt">, now: number) =>
  now - Date.parse(c.openedAt) > REPORT_SLA_HOURS[c.severity] * 60 * MINUTE;

/** Queue order. `paid_first`: paid promotions first (handoff §6), then the longest wait. */
export function compareModeration(sort: ModerationSort) {
  return (a: ModerationItemDto, b: ModerationItemDto) => {
    const age = Date.parse(a.submittedAt) - Date.parse(b.submittedAt);
    if (sort === "newest") return -age;
    if (sort === "paid_first") {
      const paid = Number(Boolean(b.promotion)) - Number(Boolean(a.promotion));
      if (paid) return paid;
    }
    return age;
  };
}

const severityRank: Record<ReportSeverity, number> = { high: 0, medium: 1, low: 2 };

/** Highest severity first, then the oldest. */
export const compareReports = (a: ReportCaseDto, b: ReportCaseDto) =>
  severityRank[a.severity] - severityRank[b.severity] || Date.parse(a.openedAt) - Date.parse(b.openedAt);

/** Severity of a user report by its reason. */
export const reasonSeverity: Record<ReportReason, ReportSeverity> = {
  scam: "high",
  duplicate: "high",
  inaccurate: "medium",
  unavailable: "medium",
  other: "low",
};

export const reportReasonTitles: Record<ReportReason, string> = {
  scam: "สงสัยมิจฉาชีพ",
  duplicate: "ใช้รูปหรือข้อมูลของประกาศอื่น",
  inaccurate: "ข้อมูลไม่ตรงกับความจริง",
  unavailable: "ขายหรือเช่าไปแล้วแต่ยังเปิดประกาศ",
  other: "เรื่องอื่น",
};

export const severityInfo: Record<ReportSeverity, { label: string; tone: StatusTone }> = {
  high: { label: "สูง", tone: "danger" },
  medium: { label: "กลาง", tone: "warning" },
  low: { label: "ต่ำ", tone: "neutral" },
};

export const returnReasonLabels: Record<ModerationReturnReason, string> = {
  contact_in_photo: "รูปมีข้อมูลติดต่อ",
  price: "ราคาไม่สมเหตุสมผล",
  incomplete: "ข้อมูลไม่ครบหรือไม่ตรง",
  duplicate: "ประกาศซ้ำ",
  scam: "สงสัยหลอกลวง (ส่งทีมความปลอดภัย)",
};

/** A starting message for the lister per reason; the reviewer edits it. */
export const returnReasonTemplates: Record<ModerationReturnReason, string> = {
  contact_in_photo: "รูปมีเบอร์โทรหรือข้อมูลติดต่อ กรุณาลบหรือครอปรูปออก",
  price: "ราคาไม่สอดคล้องกับทรัพย์ กรุณาตรวจสอบราคาอีกครั้ง",
  incomplete: "ข้อมูลไม่ครบหรือไม่ตรงกับรูป กรุณาเพิ่มรายละเอียดให้ครบ",
  duplicate: "ประกาศนี้ซ้ำกับประกาศเดิมของคุณ กรุณาแก้ไขประกาศเดิมแทน",
  scam: "ประกาศนี้ถูกระงับเพื่อตรวจสอบเพิ่มเติม ทีมงานจะติดต่อกลับ",
};

export const reportActionLabels: Record<ReportAction, string> = {
  suspend: "ระงับบัญชีและทุกประกาศ",
  hide_listing: "ซ่อนประกาศนี้",
  warn: "ส่งคำเตือน",
  dismiss: "ไม่พบความผิด",
  request_info: "ขอข้อมูลจากผู้แจ้ง",
};

export const kycStatusInfo: Record<KycApplicationStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "รอตรวจ", tone: "warning" },
  needs_info: { label: "ขอเอกสารเพิ่ม", tone: "warning" },
  approved: { label: "อนุมัติแล้ว", tone: "success" },
  rejected: { label: "ปฏิเสธ", tone: "danger" },
};

/** "0.94" → "ตรง 0.94"; below 0.8 the reviewer must look closely. */
export function faceMatchLabel(score: number): { text: string; tone: StatusTone } {
  const value = score.toFixed(2);
  if (score >= 0.9) return { text: `ตรง ${value}`, tone: "success" };
  if (score >= 0.8) return { text: `ใกล้เคียง ${value}`, tone: "warning" };
  return { text: `ไม่ตรง ${value}`, tone: "danger" };
}
