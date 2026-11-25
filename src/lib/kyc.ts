import { z } from "zod";
import { isValidTaxId } from "@/lib/billing";
import { requiredText, thaiPhone } from "@/lib/validation";
import { KYC_MAX_FILE_BYTES, type KycDocSlot, type KycDto, type KycStep } from "@/types/api";

/**
 * Agent verification (C16): the five steps, what completes each one, the
 * form schemas and the file rules. The mock API and the page share these.
 */

export const kycSteps: { id: KycStep; label: string; description: string; optional?: boolean }[] = [
  { id: "personal", label: "ข้อมูลส่วนตัว", description: "ชื่อ นามสกุล ตรงกับบัตรประชาชน" },
  { id: "id_card", label: "บัตรประชาชน", description: "รูปด้านหน้าและด้านหลัง" },
  { id: "selfie", label: "เซลฟีคู่บัตร", description: "ถ่ายจากมือถือได้" },
  { id: "company", label: "สังกัดบริษัท (ไม่บังคับ)", description: "หนังสือรับรองบริษัท หรือนามบัตร", optional: true },
  { id: "review", label: "ตรวจและส่ง", description: "ทีมงานตรวจภายใน 1 วันทำการ" },
];

export const isKycStep = (value: string | null): value is KycStep => kycSteps.some((s) => s.id === value);

export const kycSlots: Record<KycDocSlot, { label: string; accept: string[] }> = {
  id_front: {
    label: "บัตรประชาชนด้านหน้า",
    accept: ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"],
  },
  id_back: {
    label: "บัตรประชาชนด้านหลัง",
    accept: ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"],
  },
  selfie: {
    label: "เซลฟีคู่บัตรประชาชน",
    accept: ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"],
  },
  company: {
    label: "หนังสือรับรองบริษัท หรือนามบัตร",
    accept: ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"],
  },
};

/** Why a file is refused, or `undefined` when it is fine. */
export function kycFileError(slot: KycDocSlot, file: { mimeType: string; size: number }): string | undefined {
  if (!kycSlots[slot].accept.includes(file.mimeType)) {
    return slot === "company" ? "รองรับเฉพาะ JPG, PNG, HEIC และ PDF" : "รองรับเฉพาะ JPG, PNG และ HEIC";
  }
  if (file.size > KYC_MAX_FILE_BYTES) return "ไฟล์ใหญ่เกิน 10 MB";
  return undefined;
}

/** Thai ID numbers use the same mod-11 check digit as tax ids. */
export const isValidThaiId = isValidTaxId;

/** Age in whole years on `today`. */
export function ageOn(birthDate: string, today = new Date()): number {
  const b = new Date(`${birthDate}T00:00:00Z`);
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const m = today.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export const personalSchema = z.object({
  firstName: requiredText("กรอกชื่อตามบัตรประชาชน"),
  lastName: requiredText("กรอกนามสกุลตามบัตรประชาชน"),
  idNumber: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().refine(isValidThaiId, "เลขบัตรประชาชนไม่ถูกต้อง ตรวจ 13 หลักอีกครั้ง")),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "เลือกวันเกิด")
    .refine((d) => ageOn(d) >= 18, "ต้องมีอายุ 18 ปีขึ้นไป"),
  phone: thaiPhone,
});

export const companySchema = z.object({
  name: requiredText("กรอกชื่อบริษัท"),
  registrationNo: z
    .string()
    .trim()
    .transform((v) => v || undefined)
    .optional(),
});

type KycData = Pick<KycDto, "personal" | "documents" | "company" | "companySkipped">;

const has = (k: KycData, slot: KycDocSlot) => k.documents.some((d) => d.slot === slot);

/** Steps whose data is complete. `review` counts once everything required is. */
export function completedKycSteps(k: KycData): KycStep[] {
  const done: KycStep[] = [];
  if (k.personal && personalSchema.safeParse(k.personal).success) done.push("personal");
  if (has(k, "id_front") && has(k, "id_back")) done.push("id_card");
  if (has(k, "selfie")) done.push("selfie");
  if (k.companySkipped || (k.company && has(k, "company"))) done.push("company");
  if (["personal", "id_card", "selfie", "company"].every((s) => done.includes(s as KycStep))) done.push("review");
  return done;
}

/** Where to resume: the first step still to do (a fix the reviewer asked for comes first). */
export function resumeStep(k: Pick<KycDto, "completedSteps" | "fixSteps" | "status">): KycStep {
  if (k.status === "needs_info" && k.fixSteps?.length) return k.fixSteps[0];
  return kycSteps.find((s) => !k.completedSteps.includes(s.id))?.id ?? "review";
}

/** Steps can be edited before submitting, and again when the reviewer asks for more. */
export const kycEditable = (status: KycDto["status"]) =>
  status === "not_started" || status === "in_progress" || status === "needs_info";

/**
 * Mock review outcome, from the selfie and ID file names, so every state can
 * be demoed: "blur" asks for a new selfie, "reject" fails, anything else passes.
 */
export function mockReviewOutcome(
  k: Pick<KycDto, "documents">,
):
  | { status: "approved" }
  | { status: "needs_info"; note: string; fix: KycStep[] }
  | { status: "rejected"; note: string } {
  const names = k.documents.map((d) => d.name.toLowerCase());
  if (names.some((n) => n.includes("reject"))) {
    return { status: "rejected", note: "ข้อมูลบนบัตรไม่ตรงกับชื่อที่กรอก ติดต่อทีมงานหากคิดว่าผิดพลาด" };
  }
  const selfie = k.documents.find((d) => d.slot === "selfie");
  if (selfie?.name.toLowerCase().includes("blur")) {
    return { status: "needs_info", note: "เซลฟีไม่ชัด มองไม่เห็นหน้าหรือบัตร ถ่ายใหม่ในที่สว่าง", fix: ["selfie"] };
  }
  return { status: "approved" };
}

/** "1-2345-67890-12-3" while typing a Thai ID. */
export function formatThaiId(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 13);
  const parts = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12)];
  return parts.filter(Boolean).join("-");
}

/** Shows only the last 3 digits of an ID number on the review step: "x-xxxx-xxxxx-12-3". */
export const maskThaiId = (id: string) => `x-xxxx-xxxxx-${id.slice(-3, -1)}-${id.slice(-1)}`;
