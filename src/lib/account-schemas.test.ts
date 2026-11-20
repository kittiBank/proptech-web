import { describe, expect, it } from "vitest";
import { changePasswordSchema, otpSchema, profileSchema, savedSearchNameSchema } from "./account-schemas";
import { fieldErrors } from "./validation";

const errors = (r: { success: boolean; error?: Parameters<typeof fieldErrors>[0] }) =>
  r.success ? {} : fieldErrors(r.error!);

describe("profileSchema", () => {
  const ok = { firstName: "สมหญิง", lastName: "ใจดี", phone: "081-234-5678", lineId: "somying.j", language: "th" };

  it("accepts a filled profile and strips phone dashes", () => {
    expect(profileSchema.parse(ok).phone).toBe("0812345678");
    expect(profileSchema.parse({ ...ok, phone: "", lineId: "" }).phone).toBe("");
  });

  it("reports names, phone and LINE ID in Thai", () => {
    expect(errors(profileSchema.safeParse({ ...ok, firstName: " ", phone: "12", lineId: "ไทย" }))).toEqual({
      firstName: "กรอกชื่อ",
      phone: "กรอกเบอร์โทร 9–10 หลัก เช่น 0812345678",
      lineId: "LINE ID ใช้ได้แค่ตัวอักษรอังกฤษ ตัวเลข และ . - _ @",
    });
  });
});

describe("other account forms", () => {
  it("needs a 6-digit code", () => {
    expect(otpSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(errors(otpSchema.safeParse({ code: "12a" }))).toEqual({ code: "กรอกรหัส 6 หลักจาก SMS" });
  });

  it("rejects a new password equal to the current one", () => {
    expect(errors(changePasswordSchema.safeParse({ currentPassword: "Password1", newPassword: "Password1" }))).toEqual({
      newPassword: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม",
    });
    expect(errors(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "short" }))).toEqual({
      newPassword: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    });
  });

  it("needs a saved search name", () => {
    expect(errors(savedSearchNameSchema.safeParse({ name: "" }))).toEqual({ name: "ตั้งชื่อการค้นหา" });
  });
});
