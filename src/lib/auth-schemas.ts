import { z } from "zod";
import { requiredText } from "./validation";

/** Thai copy for every auth form; schemas double as the error text. */

export const emailField = z.string().trim().min(1, "กรอกอีเมล").pipe(z.email("อีเมลไม่ครบ เช่น somying@gmail.com"));

export interface PasswordRule {
  id: "length" | "digit" | "case" | "email";
  label: string;
  ok: boolean;
  /** Must pass to submit; the rest only raise the strength meter. */
  required: boolean;
  /** Error shown under the field when a required rule fails. */
  error: string;
}

export function passwordRules(password: string, email = ""): PasswordRule[] {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return [
    {
      id: "length",
      label: "อย่างน้อย 8 ตัวอักษร",
      ok: password.length >= 8,
      required: true,
      error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    },
    {
      id: "digit",
      label: "มีตัวเลข",
      ok: /\d/.test(password),
      required: true,
      error: "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว",
    },
    {
      id: "case",
      label: "มีตัวพิมพ์ใหญ่และเล็ก",
      ok: /[a-z]/.test(password) && /[A-Z]/.test(password),
      required: false,
      error: "",
    },
    {
      id: "email",
      label: "ไม่ซ้ำกับอีเมล",
      ok: password.length > 0 && (!local || !password.toLowerCase().includes(local)),
      required: true,
      error: "รหัสผ่านต้องไม่มีชื่ออีเมลของคุณ",
    },
  ];
}

/**
 * Rules that need only the password sit on the field, so they report even
 * while other fields are still invalid (object refinements wait for those).
 */
const newPassword = z
  .string()
  .min(1, "ตั้งรหัสผ่าน")
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .regex(/\d/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "กรอกรหัสผ่าน"),
  remember: z.boolean().default(true),
});

export const registerSchema = z
  .object({
    firstName: requiredText("กรอกชื่อ"),
    lastName: requiredText("กรอกนามสกุล"),
    email: emailField,
    password: newPassword,
    acceptTerms: z.literal(true, "ต้องยอมรับข้อกำหนดและนโยบายก่อนสมัคร"),
    marketing: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    const sameAsEmail = passwordRules(v.password, v.email).find((r) => r.id === "email" && !r.ok);
    if (sameAsEmail) ctx.addIssue({ code: "custom", path: ["password"], message: sameAsEmail.error });
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirm: z.string().min(1, "กรอกรหัสผ่านอีกครั้ง"),
  })
  .superRefine((v, ctx) => {
    if (v.confirm && v.password !== v.confirm) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" });
    }
  });
