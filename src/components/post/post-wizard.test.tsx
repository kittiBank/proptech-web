import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createDraft, getDraft, updateDraft } from "@/mocks/drafts";
import { resetMockSession } from "@/mocks/session";
import { router, setParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import type { DraftValues, PostStep } from "@/types/api";
import { PostStart } from "./post-start";
import { PostWizard } from "./post-wizard";

const USER = "u-1";

function openStep(step: PostStep, values: Partial<DraftValues> = {}, completedSteps: PostStep[] = []) {
  const draft = createDraft(USER);
  updateDraft(USER, draft.id, { values, completedSteps });
  setParams({ draftId: draft.id, step });
  renderWithClient(<PostWizard />);
  return draft.id;
}

const ready = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, url: "data:,", name: `${i}.jpg`, status: "ready" as const }));

beforeEach(() => resetMockSession({ signedIn: true }));

describe("PostWizard", () => {
  it("asks signed-out visitors to log in", async () => {
    resetMockSession();
    setParams({ draftId: "d-x", step: "type" });
    renderWithClient(<PostWizard />);
    expect(await screen.findByRole("heading", { name: "เข้าสู่ระบบเพื่อลงประกาศ" })).toBeInTheDocument();
  });

  it("validates step 1, counts what is left, then saves and moves on", async () => {
    const user = userEvent.setup();
    const id = openStep("type");
    await user.click(await screen.findByRole("button", { name: "ถัดไป" }));
    expect(document.getElementById("propertyType-error")).toHaveTextContent("เลือกประเภททรัพย์");
    expect(screen.getByText("เหลือ 1 ช่องที่ต้องแก้")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "คอนโด" }));
    expect(document.getElementById("propertyType-error")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ถัดไป" }));
    expect(router.push).toHaveBeenCalledWith(`/post/${id}/location`);
    await waitFor(() =>
      expect(getDraft(USER, id)).toMatchObject({ completedSteps: ["type"], values: { propertyType: "condo" } }),
    );
  });

  it("updates the live preview as the poster types", async () => {
    const user = userEvent.setup();
    openStep("details", { propertyType: "condo" }, ["type", "location"]);
    const preview = within(await screen.findByRole("complementary", { name: "ตัวอย่างประกาศ" }));
    expect(preview.getByText("หัวข้อประกาศ")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/หัวข้อประกาศ/), "2 ห้องนอน วิวเมือง");
    expect(preview.getByText("2 ห้องนอน วิวเมือง")).toBeInTheDocument();
    expect(screen.getByText("18 / 80")).toBeInTheDocument();
  });

  it("flags a floor above the building and fills the description from the data", async () => {
    const user = userEvent.setup();
    openStep("details", { propertyType: "condo", totalFloors: 35 }, ["type", "location"]);
    await user.type(await screen.findByLabelText(/อยู่ชั้น/), "38");
    await user.tab();
    expect(screen.getByText("ชั้นต้องไม่เกินจำนวนชั้นของอาคาร (35)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ช่วยร่างจากข้อมูลที่กรอก" }));
    expect((screen.getByLabelText(/รายละเอียด/) as HTMLTextAreaElement).value.length).toBeGreaterThan(20);
  });

  it("sends visitors back to the first step they have not finished", async () => {
    const id = openStep("photos", { propertyType: "condo" }, ["type"]);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/post/${id}/location`));
  });

  it("uploads photos, shows rejected ones with the reason", async () => {
    const user = userEvent.setup();
    const id = openStep("photos", { propertyType: "condo" }, ["type", "location", "details"]);
    const input = await screen.findByLabelText("เลือกรูปจากเครื่อง");
    await user.upload(input, [
      new File(["x"], "living.jpg", { type: "image/jpeg" }),
      new File(["x"], "phone-number.jpg", { type: "image/jpeg" }),
    ]);
    expect(await screen.findByText("พบเบอร์โทรในรูป ลบเบอร์หรือใช้รูปอื่น", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("รูปปก")).toBeInTheDocument();
    expect(screen.getByText("ผ่านแล้ว 1 รูป ต้องการอีก 4 รูป")).toBeInTheDocument();
    await waitFor(() => expect(getDraft(USER, id)?.values.photos).toHaveLength(2));
  });

  it("reorders photos and sets a new cover with the keyboard buttons", async () => {
    const user = userEvent.setup();
    const id = openStep("photos", { propertyType: "condo", photos: ready(5) }, ["type", "location", "details"]);
    await user.click(await screen.findByRole("button", { name: "ตั้งรูป 3 เป็นรูปปก" }));
    await waitFor(() =>
      expect(getDraft(USER, id)?.values.photos.map((p) => p.id)).toEqual(["p2", "p0", "p1", "p3", "p4"]),
    );
  });

  it("publishes for free and goes to the success page", async () => {
    const user = userEvent.setup();
    const id = openStep(
      "publish",
      {
        propertyType: "condo",
        district: "สาทร",
        province: "กรุงเทพมหานคร",
        projectName: "แอสเตอร์ สาทร",
        point: { lat: 13.72, lng: 100.53 },
        bedrooms: 1,
        bathrooms: 1,
        area: 35,
        floor: 10,
        title: "1 ห้องนอน ชั้น 10 ใกล้ BTS",
        description: "ก".repeat(120),
        photos: ready(5),
      },
      ["type", "location", "details", "photos"],
    );
    await user.type(await screen.findByLabelText(/ราคาขาย/), "6900000");
    await user.click(screen.getByRole("button", { name: "เผยแพร่ประกาศ" }));
    expect(document.getElementById("confirmed-error")).toHaveTextContent(
      "ยืนยันข้อมูลและยอมรับกฎการลงประกาศก่อนเผยแพร่",
    );

    await user.click(screen.getByRole("checkbox", { name: /ฉันยืนยันว่าข้อมูลถูกต้อง/ }));
    await user.click(screen.getByRole("radio", { name: /ประกาศแนะนำ 14 วัน/ }));
    expect(screen.getByRole("button", { name: "ชำระ ฿590 และเผยแพร่" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "เผยแพร่แบบฟรี" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/post/${id}/done`));
  });
});

describe("PostStart", () => {
  it("creates a draft when there is none", async () => {
    renderWithClient(<PostStart />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/post\/d-[^/]+\/type$/)));
  });

  it("offers unfinished drafts", async () => {
    const user = userEvent.setup();
    const d = createDraft(USER);
    updateDraft(USER, d.id, { values: { title: "บ้านเดี่ยวในซอยเงียบ" }, completedSteps: ["type"] });
    renderWithClient(<PostStart />);
    await user.click(await screen.findByRole("button", { name: "ทำต่อ บ้านเดี่ยวในซอยเงียบ" }));
    expect(router.push).toHaveBeenCalledWith(`/post/${d.id}/location`);
  });
});
