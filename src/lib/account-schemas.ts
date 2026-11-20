import { z } from "zod";
import { newPassword } from "./auth-schemas";
import { requiredText, thaiPhone } from "./validation";

/** Thai copy for the account forms (B7, B9); schemas double as the error text. */

export const profileSchema = z.object({
  firstName: requiredText("กรอกชื่อ"),
  lastName: requiredText("กรอกนามสกุล"),
  /** Optional, but must be a Thai number when given. */
  phone: z.union([z.literal(""), thaiPhone]),
  lineId: z
    .string()
    .trim()
    .max(40, "LINE ID ยาวเกินไป")
    .regex(/^[\w.\-@]*$/, "LINE ID ใช้ได้แค่ตัวอักษรอังกฤษ ตัวเลข และ . - _ @"),
  language: z.enum(["th", "en"]),
});

export const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "กรอกรหัส 6 หลักจาก SMS"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรอกรหัสผ่านปัจจุบัน"),
    newPassword,
  })
  .superRefine((v, ctx) => {
    if (v.currentPassword && v.newPassword === v.currentPassword)
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม" });
  });

export const savedSearchNameSchema = z.object({
  name: requiredText("ตั้งชื่อการค้นหา").pipe(z.string().max(60, "ชื่อยาวเกิน 60 ตัวอักษร")),
});
