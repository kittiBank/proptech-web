import { describe, expect, it } from "vitest";
import type { KycDocumentDto, KycDto } from "@/types/api";
import {
  ageOn,
  completedKycSteps,
  formatThaiId,
  kycFileError,
  maskThaiId,
  mockReviewOutcome,
  personalSchema,
  resumeStep,
} from "./kyc";

const doc = (slot: KycDocumentDto["slot"], name = `${slot}.jpg`): KycDocumentDto => ({
  slot,
  name,
  mimeType: "image/jpeg",
  uploadedAt: "2026-11-25T00:00:00Z",
});
const personal = {
  firstName: "วรวุฒิ",
  lastName: "ใจกล้า",
  idNumber: "1-1037-02345-67-9",
  birthDate: "1990-04-12",
  phone: "081-234-5678",
};

describe("personal details", () => {
  it("checks the ID checksum, age and phone, and keeps digits only", () => {
    const ok = personalSchema.safeParse(personal);
    expect(ok.success && ok.data).toMatchObject({ idNumber: "1103702345679", phone: "0812345678" });
    const bad = personalSchema.safeParse({ ...personal, idNumber: "1103702345674", birthDate: "2015-01-01" });
    expect(bad.success).toBe(false);
    expect(bad.error!.issues.map((i) => i.path[0]).sort()).toEqual(["birthDate", "idNumber"]);
  });

  it("counts age in whole years", () => {
    expect(ageOn("2008-11-26", new Date("2026-11-25T00:00:00Z"))).toBe(17);
    expect(ageOn("2008-11-25", new Date("2026-11-25T00:00:00Z"))).toBe(18);
  });

  it("formats and masks ID numbers", () => {
    expect(formatThaiId("1103702345679")).toBe("1-1037-02345-67-9");
    expect(formatThaiId("11037")).toBe("1-1037");
    expect(maskThaiId("1103702345679")).toBe("x-xxxx-xxxxx-67-9");
  });
});

describe("steps", () => {
  const base = { documents: [], companySkipped: false } as Pick<KycDto, "documents" | "companySkipped">;

  it("completes steps from the data, with company optional", () => {
    expect(completedKycSteps(base)).toEqual([]);
    const most = { ...base, personal, documents: [doc("id_front"), doc("id_back"), doc("selfie")] };
    expect(completedKycSteps(most)).toEqual(["personal", "id_card", "selfie"]);
    expect(completedKycSteps({ ...most, companySkipped: true })).toEqual([
      "personal",
      "id_card",
      "selfie",
      "company",
      "review",
    ]);
    // A company needs its document too.
    expect(completedKycSteps({ ...most, company: { name: "บจก. สุขุมวิท" } })).not.toContain("company");
  });

  it("resumes at the first missing step, or the reviewer's fix", () => {
    expect(resumeStep({ status: "in_progress", completedSteps: ["personal"] })).toBe("id_card");
    expect(resumeStep({ status: "needs_info", completedSteps: ["personal", "id_card"], fixSteps: ["selfie"] })).toBe(
      "selfie",
    );
  });
});

describe("files and the mock review", () => {
  it("accepts images, and PDF only for the company document", () => {
    expect(kycFileError("selfie", { mimeType: "image/jpeg", size: 1000 })).toBeUndefined();
    expect(kycFileError("selfie", { mimeType: "application/pdf", size: 1000 })).toBe("รองรับเฉพาะ JPG, PNG และ HEIC");
    expect(kycFileError("company", { mimeType: "application/pdf", size: 1000 })).toBeUndefined();
    expect(kycFileError("id_front", { mimeType: "image/png", size: 11 * 1024 * 1024 })).toBe("ไฟล์ใหญ่เกิน 10 MB");
  });

  it("approves by default; file names demo the other outcomes", () => {
    expect(mockReviewOutcome({ documents: [doc("selfie")] })).toEqual({ status: "approved" });
    expect(mockReviewOutcome({ documents: [doc("selfie", "selfie-BLUR.jpg")] })).toMatchObject({
      status: "needs_info",
      fix: ["selfie"],
    });
    expect(mockReviewOutcome({ documents: [doc("id_front", "reject.jpg")] }).status).toBe("rejected");
  });
});
