import { describe, expect, it } from "vitest";
import { createDraft, publishDraft, updateDraft } from "./drafts";
import {
  KYC_REVIEW_MS,
  getKyc,
  kycStatus,
  removeKycDocument,
  restartKyc,
  submitKyc,
  updateKyc,
  uploadKycDocument,
} from "./kyc";
import { sellerAccount } from "./seller";

const U = "u-1";
const personal = {
  firstName: "วรวุฒิ",
  lastName: "ใจกล้า",
  idNumber: "1103702345679",
  birthDate: "1990-04-12",
  phone: "0812345678",
};
const file = (slot: "id_front" | "id_back" | "selfie" | "company", name = `${slot}.jpg`) =>
  uploadKycDocument(U, { slot, name, mimeType: "image/jpeg", size: 200_000, preview: "data:image/jpeg;base64,x" });

function fillAll(selfieName?: string) {
  updateKyc(U, { personal });
  file("id_front");
  file("id_back");
  file("selfie", selfieName);
  updateKyc(U, { companySkipped: true });
}

describe("mock KYC", () => {
  it("starts not started, moves to in progress, and reports field errors", () => {
    expect(getKyc(U)).toMatchObject({ status: "not_started", completedSteps: [] });
    expect(updateKyc(U, { personal: { ...personal, idNumber: "123" } })).toMatchObject({
      fields: { idNumber: expect.any(String) },
    });
    expect(updateKyc(U, { personal })).toMatchObject({ status: "in_progress", completedSteps: ["personal"] });
    expect(file("selfie", "x.pdf")).toEqual(expect.objectContaining({ slot: "selfie" }));
    expect(
      uploadKycDocument(U, { slot: "selfie", name: "x.pdf", mimeType: "application/pdf", size: 10 }),
    ).toMatchObject({ fields: { file: expect.any(String) } });
    expect(removeKycDocument(U, "selfie")).toMatchObject({ completedSteps: ["personal"] });
  });

  it("refuses to submit until complete, then approves after review", () => {
    updateKyc(U, { personal });
    expect(submitKyc(U)).toBe("incomplete");
    fillAll();
    const now = Date.now();
    expect(submitKyc(U, now)).toMatchObject({ status: "submitted" });
    // Locked while it is reviewed.
    expect(updateKyc(U, { personal })).toBe("locked");
    expect(getKyc(U, now + 1000).status).toBe("submitted");
    expect(getKyc(U, now + KYC_REVIEW_MS)).toMatchObject({ status: "approved" });
    expect(sellerAccount(U).kycStatus).toBe("approved");
  });

  it("asks for a new blurry selfie, then accepts the fix", () => {
    fillAll("selfie-blur.jpg");
    const now = Date.now();
    submitKyc(U, now);
    expect(getKyc(U, now + KYC_REVIEW_MS)).toMatchObject({ status: "needs_info", fixSteps: ["selfie"] });
    expect(submitKyc(U)).toBe("incomplete");
    file("selfie", "selfie-sharp.jpg");
    expect(getKyc(U).fixSteps).toEqual([]);
    expect(submitKyc(U)).toMatchObject({ status: "submitted" });
  });

  it("can start again after a rejection, keeping the personal details", () => {
    fillAll();
    file("id_front", "reject.jpg");
    const now = Date.now();
    submitKyc(U, now);
    expect(getKyc(U, now + KYC_REVIEW_MS).status).toBe("rejected");
    expect(restartKyc(U)).toMatchObject({ status: "in_progress", documents: [], completedSteps: ["personal"] });
  });

  it("lets agents publish only once approved", () => {
    const draft = createDraft(U, "agent");
    updateDraft(U, draft.id, {
      values: {
        posterKind: "agent",
        deal: "sale",
        propertyType: "condo",
        projectName: "แอสเตอร์ สาทร",
        district: "สาทร",
        province: "กรุงเทพมหานคร",
        point: { lat: 13.72, lng: 100.53 },
        bedrooms: 1,
        bathrooms: 1,
        area: 35,
        floor: 10,
        title: "1 ห้องนอน ชั้น 10 ใกล้ BTS",
        description: "ก".repeat(120),
        photos: [1, 2, 3, 4, 5].map((i) => ({
          id: `p${i}`,
          url: "data:,",
          name: `${i}.jpg`,
          status: "ready" as const,
        })),
        price: 6_900_000,
        confirmed: true,
      },
    });
    expect(publishDraft(U, draft.id)).toMatchObject({ ok: false, status: 403, message: "kyc_required" });
    fillAll();
    const now = Date.now();
    submitKyc(U, now);
    getKyc(U, now + KYC_REVIEW_MS);
    expect(kycStatus(U)).toBe("approved");
    expect(publishDraft(U, draft.id)).toMatchObject({ ok: true });
  });
});
