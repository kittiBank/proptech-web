import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ArticleBody } from "@/components/guides/article-view";
import { bangkokDay } from "@/lib/format";
import { listAuditLog, startAdminLogin, verifyAdminCode } from "@/mocks/admin";
import { createCms, listCms, promoWeek } from "@/mocks/admin-data";
import { DEMO_ADMIN } from "@/mocks/constants";
import { setParams, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { CmsEditor } from "./cms-editor";
import { PromoSlotsView } from "./promo-slots-view";
import { RevenueView } from "./revenue-view";
import { UsersView } from "./users-view";

function signIn(email: string = DEMO_ADMIN.email) {
  const start = startAdminLogin(email, DEMO_ADMIN.password);
  if (!start.ok) throw new Error();
  verifyAdminCode(start.challengeId, DEMO_ADMIN.code);
}
const today = () => listAuditLog(bangkokDay(new Date()));
const WAIT = { timeout: 4000 };

describe("UsersView (E6)", () => {
  it("searches, shows the shared-phone signal and suspends with a reason", async () => {
    signIn();
    setSearchParams("q=88213");
    renderWithClient(<UsersView />);
    const panel = await screen.findByRole("complementary", { name: "user_88213" }, WAIT);
    expect(within(panel).getByText("ใช้ร่วมกับอีก 2 บัญชี")).toBeInTheDocument();
    expect(within(panel).getByText("IP ตรงกับบัญชีที่ถูกระงับก่อนหน้า")).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole("button", { name: "ดูเบอร์เต็ม" }));
    expect(await within(panel).findByText("081-227-4412")).toBeInTheDocument();
    expect(today()[0].action).toBe("เปิดดูเบอร์เต็ม user_88213");

    await userEvent.click(within(panel).getByRole("button", { name: "ระงับบัญชี" }));
    const dialog = await screen.findByRole("dialog", { name: "ระงับบัญชี user_88213?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "ระงับบัญชี" }));
    expect(within(dialog).getByText("ระบุเหตุผล")).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("เหตุผล"), "มิจฉาชีพ");
    await userEvent.click(within(dialog).getByRole("button", { name: "ระงับบัญชี" }));
    expect(await screen.findByText("ระงับ user_88213 แล้ว")).toBeInTheDocument();
    expect(await within(panel).findByRole("button", { name: "ยกเลิกการระงับ" })).toBeInTheDocument();
  });
});

describe("RevenueView (E7)", () => {
  it("shows KPIs and lets Finance approve a large refund", async () => {
    signIn();
    renderWithClient(<RevenueView />);
    expect(await screen.findByText("฿1,047,000", {}, WAIT)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /แพ็กเกจนายหน้า 39%/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "อนุมัติ คืนเงิน PAY-77064" }));
    expect(await screen.findByText("อนุมัติคืนเงิน PAY-77064 แล้ว")).toBeInTheDocument();
    expect(today()[0].action).toBe("อนุมัติคืนเงิน PAY-77064 ฿1,277");
    expect(await screen.findByRole("table", { name: "รายการชำระเงินล่าสุด" }, WAIT)).toHaveTextContent("PAY-77120");
  });
});

describe("PromoSlotsView (E8)", () => {
  it("draws seven days and moves a pin", async () => {
    signIn();
    renderWithClient(<PromoSlotsView />);
    const days = await screen.findAllByRole("img", { name: /ขายแล้ว \d+ พาร์ทเนอร์/ }, WAIT);
    expect(days).toHaveLength(7);

    const week = promoWeek(bangkokDay(new Date()));
    const pin = week.pins.find((p) => p.source === "purchase")!;
    await userEvent.click(screen.getByRole("button", { name: `ย้ายวัน ${pin.listing.code}` }));
    const dialog = await screen.findByRole("dialog");
    const far = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    await userEvent.type(within(dialog).getByLabelText("วันเริ่มใหม่"), far);
    await userEvent.click(within(dialog).getByRole("button", { name: "ย้ายวัน" }));
    expect(await screen.findByText(`ย้ายวันปักหมุด ${pin.listing.code} แล้ว`)).toBeInTheDocument();
  });
});

describe("CmsEditor (E9)", () => {
  it("adds a block, validates the slug, saves and publishes", async () => {
    signIn();
    // A fresh draft keeps the editor small; role queries over a long article are slow in jsdom.
    const admin = { id: "a-1", name: "นภัส", email: DEMO_ADMIN.email, role: "super_admin", title: "" } as const;
    const article = createCms(admin);
    setParams({ articleId: article.id });
    renderWithClient(<CmsEditor />);
    expect(await screen.findByText("แบบร่าง", {}, WAIT)).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("เพิ่ม เครื่องคำนวณ"));
    expect(screen.getByLabelText("ราคา (บาท)")).toHaveValue(5_000_000);
    expect(screen.getByText("ยังไม่บันทึก")).toBeInTheDocument();

    const slug = screen.getByLabelText("Slug");
    await userEvent.clear(slug);
    await userEvent.type(slug, "bad slug!");
    await userEvent.click(screen.getByText("บันทึก", { selector: "button" }));
    expect(screen.getByText(/ใช้ a-z 0-9 และขีดกลาง/)).toBeInTheDocument();
    await userEvent.clear(slug);
    await userEvent.type(slug, "condo-checklist-2");
    await userEvent.click(screen.getByText("บันทึก", { selector: "button" }));
    expect(await screen.findByText(/^บันทึก \d/)).toBeInTheDocument();

    await userEvent.click(screen.getByText("เผยแพร่", { selector: "button" }));
    expect(await screen.findByText("เผยแพร่แล้ว")).toBeInTheDocument();
    expect(today()[0].action).toBe(`เผยแพร่ ${article.id}`);
  });

  it("previews with the public article renderer", async () => {
    signIn();
    setParams({ articleId: listCms()[0].id });
    renderWithClient(<CmsEditor />);
    await userEvent.click(await screen.findByText("ดูตัวอย่าง", { selector: "button" }, WAIT));
    expect(screen.getByLabelText("ตัวอย่างบทความ")).toBeInTheDocument();
    expect(await screen.findByLabelText("คอนโดมือสองใกล้ BTS พร้อมพงษ์", {}, WAIT)).toBeInTheDocument();
  });
});

describe("ArticleBody blocks", () => {
  it("renders H3, images with captions and listing cards", async () => {
    renderWithClient(
      <ArticleBody
        blocks={[
          { type: "subheading", text: "ค่าส่วนกลาง" },
          { type: "image", src: "https://images.unsplash.com/photo-1", alt: "ห้องนั่งเล่น", caption: "ห้องจริง" },
          { type: "listings", title: "คอนโดใกล้อโศก", query: { mode: "buy", type: "condo" }, limit: 3 },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "ค่าส่วนกลาง" })).toBeInTheDocument();
    expect(screen.getByText("ห้องจริง")).toBeInTheDocument();
    const cards = await screen.findByRole("region", { name: "คอนโดใกล้อโศก" });
    await waitFor(() => expect(within(cards).getAllByRole("link")).toHaveLength(3));
  });
});
