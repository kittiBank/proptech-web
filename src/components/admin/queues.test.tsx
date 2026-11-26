import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bangkokDay } from "@/lib/format";
import { listAuditLog, startAdminLogin, verifyAdminCode } from "@/mocks/admin";
import { listModeration, listReportCases } from "@/mocks/admin-queues";
import { DEMO_ADMIN } from "@/mocks/constants";
import { router, setParams, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { KycReview } from "./kyc-review";
import { ListingReview } from "./listing-review";
import { ModerationQueue } from "./moderation-queue";
import { ReportsView } from "./reports-view";

function signIn() {
  const start = startAdminLogin(DEMO_ADMIN.email, DEMO_ADMIN.password);
  if (!start.ok) throw new Error();
  verifyAdminCode(start.challengeId, DEMO_ADMIN.code);
}
const today = () => listAuditLog(bangkokDay(new Date()));

describe("ModerationQueue (E2)", () => {
  it("lists the pending queue paid-first and bulk approves", async () => {
    signIn();
    renderWithClient(<ModerationQueue />);
    expect(await screen.findByRole("link", { name: /^รอตรวจ\s*38$/ }, { timeout: 4000 })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // Paid promotions come first.
    expect(rows[1]).toHaveTextContent(/฿(199|590)/);
    expect(within(table).getAllByText("พบเบอร์ในรูป").length).toBeGreaterThan(0);

    await userEvent.click(within(rows[1]).getByRole("checkbox"));
    await userEvent.click(within(rows[2]).getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "ผ่านที่เลือก" }));
    expect(await screen.findByText("อนุมัติแล้ว 2 ประกาศ")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^รอตรวจ\s*36$/ }, { timeout: 4000 })).toBeInTheDocument();
  });

  it("shows decisions on the returned tab", async () => {
    signIn();
    setSearchParams("tab=returned");
    renderWithClient(<ModerationQueue />);
    expect(await screen.findAllByText("ตีกลับ")).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "เริ่มตรวจต่อเนื่อง" })).not.toBeInTheDocument();
  });
});

describe("ListingReview (E3)", () => {
  it("needs the checklist before approving, and returns with reasons", async () => {
    signIn();
    const order = listModeration({}).data;
    const index = order.findIndex(
      (i) => i.promotion?.amount === 590 && i.flags.some((f) => f.code === "phone_in_photo"),
    );
    const [first, second] = [order[index], order[index + 1]];
    setParams({ listingId: first.id });
    renderWithClient(<ListingReview />);
    expect(await screen.findByRole("heading", { name: `ตรวจประกาศ ${first.id}` })).toBeInTheDocument();
    expect(screen.getByText(`ข้อที่ ${index + 1} จาก 38`)).toBeInTheDocument();
    expect(screen.getByText(/ระบบพบตัวเลขคล้ายเบอร์โทรในรูปที่ \d/)).toBeInTheDocument();

    const approve = screen.getByRole("button", { name: "ผ่าน และเริ่มโปรโมต" });
    expect(approve).toBeDisabled();
    // The suggested reason and message are filled in from the phone flag.
    expect(screen.getByRole("checkbox", { name: "รูปมีข้อมูลติดต่อ" })).toBeChecked();
    expect(screen.getByLabelText("ข้อความถึงผู้ลงประกาศ")).toHaveValue(
      "รูปมีเบอร์โทรหรือข้อมูลติดต่อ กรุณาลบหรือครอปรูปออก",
    );

    await userEvent.click(screen.getByRole("button", { name: "ตีกลับให้แก้ไข" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/admin/moderation/${second.id}`));
    expect(today()[0]).toMatchObject({ action: `ตีกลับ ${first.id}` });
  });

  it("asks for a reason and a message before returning", async () => {
    signIn();
    const clean = listModeration({ flags: "clean" }).data[0];
    setParams({ listingId: clean.id });
    renderWithClient(<ListingReview />);
    await userEvent.click(await screen.findByRole("button", { name: "ตีกลับให้แก้ไข" }));
    expect(screen.getByText("เลือกเหตุผลอย่างน้อย 1 ข้อ")).toBeInTheDocument();
    expect(screen.getByText("เขียนข้อความถึงผู้ลงประกาศ")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^ผ่าน/ }));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(today()[0].action).toBe(`อนุมัติ ${clean.id}`);
  });
});

describe("ReportsView (E4)", () => {
  it("opens the most severe case and suspends after confirming", async () => {
    signIn();
    const top = listReportCases("open").data.find((c) => c.quotes.length > 0)!;
    setSearchParams(`case=${top.id}`);
    renderWithClient(<ReportsView />);
    const panel = await screen.findByRole("complementary", { name: top.title });
    expect(within(panel).getByText(/ให้โอนมัดจำ 10,000/)).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole("button", { name: "ระงับบัญชีและทุกประกาศ" }));
    const dialog = await screen.findByRole("dialog", { name: `ระงับบัญชี ${top.reported.name}?` });
    await userEvent.click(within(dialog).getByRole("button", { name: "ระงับบัญชี" }));
    expect(await screen.findByText(`ระงับบัญชีและทุกประกาศ: ${top.id}`)).toBeInTheDocument();
    expect(today()[0].action).toBe(`ระงับบัญชี ${top.reported.name}`);
  });
});

describe("ReportsView selection", () => {
  it("highlights the open case and opens another by clicking its row", async () => {
    signIn();
    const [first, second] = listReportCases("open").data;
    renderWithClient(<ReportsView />);
    const rows = await screen.findAllByRole("row");
    expect(rows[1]).toHaveAttribute("aria-current", "true");
    expect(rows[2]).not.toHaveAttribute("aria-current");
    expect(rows[1]).toHaveTextContent(first.title);
    await userEvent.click(within(rows[2]).getByText(second.reported.name));
    expect(router.replace).toHaveBeenCalledWith(`/admin/reports?case=${second.id}`, { scroll: false });
  });
});

describe("KycReview (E5)", () => {
  it("logs opening the documents, requires a note to reject and approves", async () => {
    signIn();
    renderWithClient(<KycReview />);
    expect(await screen.findByRole("heading", { name: "วรวุฒิ ทองดี" })).toBeInTheDocument();
    const approve = screen.getByRole("button", { name: "อนุมัติ" });
    expect(approve).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    expect(screen.getByText("เขียนเหตุผลถึงผู้สมัครก่อนปฏิเสธหรือขอเอกสารเพิ่ม")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "เปิดดูเอกสาร" }));
    expect(await screen.findByText(/ตรง 0\.9/)).toBeInTheDocument();
    expect(today()[0]).toMatchObject({ action: "เปิดดูเอกสาร KYC-3310", note: "เหตุผล: ตรวจตามคิว" });

    await userEvent.click(screen.getByRole("button", { name: "อนุมัติ" }));
    expect(await screen.findByText("อนุมัติ วรวุฒิ ทองดี แล้ว")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^รอตรวจ\s*11$/ }, { timeout: 4000 })).toBeInTheDocument();
  });
});
