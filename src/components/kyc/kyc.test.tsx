import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { OverviewView } from "@/components/seller/overview-view";
import { finishKycReview, getKyc, submitKyc, updateKyc, uploadKycDocument } from "@/mocks/kyc";
import { currentUser, resetMockSession } from "@/mocks/session";
import { router, setPathname, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import type { KycDocSlot } from "@/types/api";
import { VerifyView } from "./verify-view";

const me = () => currentUser()!.id;
const personal = {
  firstName: "วรวุฒิ",
  lastName: "ใจกล้า",
  idNumber: "1103702345679",
  birthDate: "1990-04-12",
  phone: "0812345678",
};
const put = (slot: KycDocSlot, name = `${slot}.jpg`) =>
  uploadKycDocument(me(), { slot, name, mimeType: "image/jpeg", size: 1000, preview: "data:," });
function fillAll(selfie?: string) {
  updateKyc(me(), { personal });
  put("id_front");
  put("id_back");
  put("selfie", selfie);
  updateKyc(me(), { companySkipped: true });
}

beforeEach(() => {
  resetMockSession({ signedIn: true });
  setPathname("/dashboard/verify");
});

describe("VerifyView (C16)", () => {
  it("validates personal details, saves them and moves to the ID card", async () => {
    const user = userEvent.setup();
    renderWithClient(<VerifyView />);
    expect(await screen.findByRole("heading", { name: "ข้อมูลส่วนตัว" })).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: "ขั้นตอนยืนยันตัวตน" });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(5);

    await user.type(screen.getByLabelText("เลขบัตรประชาชน"), "1234567890123");
    await user.click(screen.getByRole("button", { name: "บันทึกและไปต่อ" }));
    expect(await screen.findByText("เลขบัตรประชาชนไม่ถูกต้อง ตรวจ 13 หลักอีกครั้ง")).toBeInTheDocument();
    expect(screen.getByText("เลือกวันเกิด")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("เลขบัตรประชาชน"));
    await user.type(screen.getByLabelText("เลขบัตรประชาชน"), "1103702345679");
    await user.type(screen.getByLabelText("วันเกิด"), "1990-04-12");
    // The phone may be prefilled from the profile.
    await user.clear(screen.getByLabelText("เบอร์โทร"));
    await user.type(screen.getByLabelText("เบอร์โทร"), "0812345678");
    await user.click(screen.getByRole("button", { name: "บันทึกและไปต่อ" }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/dashboard/verify?step=id_card", { scroll: false }),
    );
    expect(getKyc(me())).toMatchObject({ status: "in_progress", completedSteps: ["personal"] });
  });

  it("uploads the selfie and refuses a PDF", async () => {
    const user = userEvent.setup({ applyAccept: false });
    updateKyc(me(), { personal });
    put("id_front");
    put("id_back");
    setSearchParams("step=selfie");
    renderWithClient(<VerifyView />);
    expect(await screen.findByRole("heading", { name: "เซลฟีคู่กับบัตรประชาชน" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ถ่ายรูปจากมือถือ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ถัดไป" })).toBeDisabled();

    const input = screen.getByLabelText(/อัปโหลดไฟล์\s*เซลฟีคู่บัตรประชาชน/);
    await user.upload(input, new File(["x"], "id.pdf", { type: "application/pdf" }));
    expect(screen.getByRole("alert")).toHaveTextContent("รองรับเฉพาะ JPG, PNG และ HEIC");

    await user.upload(input, new File(["x"], "me.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText("me.jpg", undefined, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "ถัดไป" })).toBeEnabled());
  });

  it("submits for review and shows the approval when it arrives", async () => {
    const user = userEvent.setup();
    fillAll();
    setSearchParams("step=review");
    renderWithClient(<VerifyView />);
    expect(await screen.findByText(/x-xxxx-xxxxx-67-9/)).toBeInTheDocument();
    const send = screen.getByRole("button", { name: "ส่งตรวจสอบ" });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /ยืนยันว่าข้อมูล/ }));
    await user.click(send);
    expect(await screen.findByText("ส่งเอกสารแล้ว รอตรวจสอบ")).toBeInTheDocument();
    finishKycReview(me());
    expect(await screen.findByRole("heading", { name: "ยืนยันตัวตนแล้ว" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ลงประกาศใหม่" })).toHaveAttribute("href", "/post");
  });

  it("points to the step the reviewer wants fixed", async () => {
    fillAll("blur.jpg");
    submitKyc(me());
    finishKycReview(me());
    renderWithClient(<VerifyView />);
    expect(await screen.findByText("ทีมงานขอข้อมูลเพิ่ม")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "เซลฟีคู่กับบัตรประชาชน" })).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: "ขั้นตอนยืนยันตัวตน" });
    expect(within(steps).getByText("ต้องแก้ไข")).toBeInTheDocument();
    expect(screen.getByText("ทีมงานขอไฟล์ใหม่")).toBeInTheDocument();
  });

  it("offers a restart after a rejection", async () => {
    const user = userEvent.setup();
    fillAll();
    put("id_front", "reject.jpg");
    submitKyc(me());
    finishKycReview(me());
    renderWithClient(<VerifyView />);
    await user.click(await screen.findByRole("button", { name: "เริ่มใหม่" }));
    expect(await screen.findByRole("heading", { name: "บัตรประชาชน" })).toBeInTheDocument();
    expect(getKyc(me()).status).toBe("in_progress");
  });
});

describe("OverviewView verification banner", () => {
  it("asks unverified agents to verify, and goes away once approved", async () => {
    const { unmount } = renderWithClient(<OverviewView />);
    expect(await screen.findByRole("link", { name: "เริ่มยืนยันตัวตน" })).toHaveAttribute("href", "/dashboard/verify");
    unmount();
    fillAll();
    submitKyc(me());
    finishKycReview(me());
    getKyc(me());
    renderWithClient(<OverviewView />);
    expect(await screen.findByText("ยอดเข้าชมประกาศ")).toBeInTheDocument();
    expect(screen.queryByText("ยืนยันตัวตนนายหน้า")).not.toBeInTheDocument();
  });
});
