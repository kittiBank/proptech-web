import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { confirmPromptPay, createOrder, getBilling, listOrders } from "@/mocks/billing";
import { currentUser, resetMockSession } from "@/mocks/session";
import { router, setParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import type { OrderDto } from "@/types/api";
import { BillingView } from "./billing-view";
import { CheckoutView } from "./checkout-view";
import { PricingView } from "./pricing-view";

const me = () => currentUser()!;
const newOrder = (body: Parameters<typeof createOrder>[1]) => createOrder(me(), body) as OrderDto;

describe("PricingView (C12)", () => {
  it("switches between yearly and monthly prices", async () => {
    resetMockSession({ signedIn: false });
    const user = userEvent.setup();
    renderWithClient(<PricingView />);
    const pro = screen.getByRole("article", { name: "นายหน้า Pro" });
    expect(within(pro).getByText("฿1,075")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "รายเดือน" }));
    expect(within(pro).getByText("฿1,290")).toBeInTheDocument();
    // Signed out: choosing a plan goes through login and back.
    expect(within(pro).getByRole("link", { name: "เลือก Pro" })).toHaveAttribute("href", "/login?next=%2Fpricing");
    expect(screen.getByRole("table", { name: /ราคาโปรโมต/ })).toHaveTextContent("฿1,490");
  });

  it("creates a plan order and opens checkout", async () => {
    resetMockSession({ signedIn: true });
    const user = userEvent.setup();
    renderWithClient(<PricingView />);
    // Already on monthly Pro, so the yearly plan is the one to buy.
    const pro = screen.getByRole("article", { name: "นายหน้า Pro" });
    await user.click(await within(pro).findByRole("button", { name: "เลือก Pro" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/checkout\/o-/)));
    await user.click(screen.getByRole("radio", { name: "รายเดือน" }));
    expect(await within(pro).findByRole("button", { name: "แพ็กเกจปัจจุบันของคุณ" })).toBeDisabled();
  });
});

describe("CheckoutView (C13)", () => {
  beforeEach(() => resetMockSession({ signedIn: true }));

  it("pays by card and shows the receipt", async () => {
    const user = userEvent.setup();
    const o = newOrder({ kind: "plan", plan: "agent_pro", cycle: "yearly" });
    setParams({ orderId: o.id });
    renderWithClient(<CheckoutView />);
    const summary = await screen.findByRole("complementary", { name: "สรุปรายการ" });
    expect(within(summary).getByText("฿12,056.07")).toBeInTheDocument();
    expect(within(summary).getByText("฿843.93")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /บัตรเครดิต/ }));
    await user.click(screen.getByRole("button", { name: "ชำระ ฿12,900.00" }));
    expect(await screen.findByRole("heading", { name: "ชำระเงินสำเร็จ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ทำต่อ" })).toHaveAttribute("href", "/dashboard/billing");
    expect(getBilling(me())).toMatchObject({ cycle: "yearly" });
  });

  it("shows a PromptPay QR and turns paid when the bank confirms", async () => {
    const user = userEvent.setup();
    const o = newOrder({ kind: "credit", amount: 500 });
    setParams({ orderId: o.id });
    renderWithClient(<CheckoutView />);
    // Credit cannot pay for credit.
    await screen.findByRole("radio", { name: /PromptPay QR/ });
    expect(screen.queryByRole("radio", { name: /เครดิต PropertyHub/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "แสดง QR ชำระ ฿500.00" }));
    expect(await screen.findByRole("img", { name: /QR PromptPay สำหรับชำระ ฿500.00/ })).toBeInTheDocument();
    expect(screen.getByText(/QR หมดอายุใน 1[45]:\d\d นาที/)).toBeInTheDocument();
    confirmPromptPay(me(), o.id);
    expect(await screen.findByRole("heading", { name: "ชำระเงินสำเร็จ" }, { timeout: 4000 })).toBeInTheDocument();
    expect(getBilling(me()).credit).toBe(1750);
  });

  it("explains a declined card and applies a coupon", async () => {
    const user = userEvent.setup();
    const o = newOrder({ kind: "credit", amount: 1000 });
    setParams({ orderId: o.id });
    renderWithClient(<CheckoutView />);
    await user.click(await screen.findByRole("button", { name: "ใส่โค้ด" }));
    await user.type(screen.getByLabelText("โค้ดส่วนลด"), "nope");
    await user.click(screen.getByRole("button", { name: "ใช้โค้ด" }));
    expect(await screen.findByText("ไม่พบโค้ดนี้ หรือโค้ดหมดอายุแล้ว")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("โค้ดส่วนลด"));
    await user.type(screen.getByLabelText("โค้ดส่วนลด"), "welcome10");
    await user.click(screen.getByRole("button", { name: "ใช้โค้ด" }));
    expect(await screen.findByText("-฿100.00")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /บัตรเครดิต/ }));
    await user.click(screen.getByRole("button", { name: "+ เพิ่มบัตรใหม่" }));
    const dialog = await screen.findByRole("dialog", { name: "เพิ่มบัตร" });
    await user.type(within(dialog).getByLabelText("เลขบัตร"), "4000000000000002");
    await user.type(within(dialog).getByLabelText("วันหมดอายุ"), "1230");
    await user.type(within(dialog).getByLabelText("ชื่อบนบัตร"), "SOMYING");
    await user.click(within(dialog).getByRole("button", { name: "บันทึกบัตร" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(await screen.findByRole("button", { name: "ชำระ ฿900.00" }));
    expect(await screen.findByText("ธนาคารปฏิเสธบัตรนี้ ลองบัตรอื่นหรือ PromptPay")).toBeInTheDocument();
  });

  it("says when the order does not exist", async () => {
    setParams({ orderId: "o-missing" });
    renderWithClient(<CheckoutView />);
    expect(await screen.findByRole("heading", { name: "ไม่พบรายการชำระเงิน" })).toBeInTheDocument();
  });
});

describe("BillingView (C15)", () => {
  beforeEach(() => resetMockSession({ signedIn: true }));

  it("shows credit, plan, invoice details and this year's payments", async () => {
    renderWithClient(<BillingView />);
    expect(await screen.findByText("฿1,250")).toBeInTheDocument();
    expect(screen.getByText("บริษัท สุขุมวิท เรียลตี้ จำกัด")).toBeInTheDocument();
    const table = await screen.findByRole("table", { name: /ประวัติการชำระเงิน ปี/ });
    const thisYear = listOrders(me()).filter(
      (o) => new Date(o.createdAt).getFullYear() === new Date().getFullYear(),
    ).length;
    expect(within(table).getAllByRole("row")).toHaveLength(thisYear + 1);
    expect(within(table).getByText("คืนเงินแล้ว")).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: /ชำระต่อ/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/checkout\/o-/),
    );
  });

  it("cancels the renewal after confirming", async () => {
    const user = userEvent.setup();
    renderWithClient(<BillingView />);
    await user.click(await screen.findByRole("button", { name: "ยกเลิกต่ออายุ" }));
    const dialog = await screen.findByRole("dialog", { name: "ยกเลิกการต่ออายุ?" });
    await user.click(within(dialog).getByRole("button", { name: "ยกเลิกต่ออายุ" }));
    expect(await screen.findByText(/^ไม่ต่ออายุ ใช้ได้ถึง/)).toBeInTheDocument();
    expect(getBilling(me()).autoRenew).toBe(false);
  });

  it("validates invoice details before saving", async () => {
    const user = userEvent.setup();
    renderWithClient(<BillingView />);
    await user.click(await screen.findByRole("button", { name: /แก้ไข\s*ข้อมูลออกใบกำกับภาษี/ }));
    const dialog = await screen.findByRole("dialog", { name: "ข้อมูลออกใบกำกับภาษี" });
    const taxId = within(dialog).getByLabelText("เลขประจำตัวผู้เสียภาษี");
    await user.clear(taxId);
    await user.type(taxId, "0105566012345");
    await user.click(within(dialog).getByRole("button", { name: "บันทึก" }));
    expect(within(dialog).getByText("เลขประจำตัวผู้เสียภาษีต้องมี 13 หลักและถูกต้อง")).toBeInTheDocument();
    await user.clear(taxId);
    await user.type(taxId, "0105566012344");
    await user.click(within(dialog).getByRole("button", { name: "บันทึก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("starts a credit top-up at checkout", async () => {
    const user = userEvent.setup();
    renderWithClient(<BillingView />);
    await user.click(await screen.findByRole("button", { name: "เติมเครดิต" }));
    const dialog = await screen.findByRole("dialog", { name: "เติมเครดิต" });
    await user.click(within(dialog).getByRole("radio", { name: /฿2,000/ }));
    await user.click(within(dialog).getByRole("button", { name: "ไปชำระเงิน ฿2,000" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/checkout\/o-/)));
  });
});
