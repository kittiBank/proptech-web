import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CookieConsent, CookieSettingsButton } from "@/components/consent/cookie-consent";
import { LegalView } from "@/components/legal/legal-view";
import { ReportListing } from "@/components/listing/report-dialog";
import { findLegalDoc } from "@/data/legal";
import { CONSENT_KEY, resetConsentCache } from "@/lib/cookie-consent";
import { listReports } from "@/mocks/reports";
import { router, setPathname, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { HelpView } from "./help-view";

describe("HelpView (D4)", () => {
  it("opens the first answer, toggles others and filters by topic and search", async () => {
    const user = userEvent.setup();
    setPathname("/help");
    renderWithClient(<HelpView />);
    const first = screen.getByRole("button", { name: "ทำไมประกาศของฉันไม่ผ่านการตรวจ" });
    expect(first).toHaveAttribute("aria-expanded", "true");
    const other = screen.getByRole("button", { name: "ยกเลิกการต่ออายุแพ็กเกจอย่างไร" });
    await user.click(other);
    expect(other).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: /^ความปลอดภัย/ }));
    expect(router.replace).toHaveBeenLastCalledWith("/help?topic=safety", { scroll: false });
    await user.type(screen.getByRole("searchbox", { name: "ค้นหาคำถาม" }), "มัดจำ");
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));
    expect(router.replace).toHaveBeenLastCalledWith(`/help?q=${encodeURIComponent("มัดจำ")}`, { scroll: false });
  });

  it("shows the URL's search and an empty state", () => {
    setSearchParams("q=zzz");
    renderWithClient(<HelpView />);
    expect(screen.getByRole("heading", { name: "ผลการค้นหา “zzz”" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ไม่พบคำถามที่ตรงกัน" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /แชตกับทีมงาน/ })).toHaveAttribute("href", "/messages?to=support");
  });
});

describe("LegalView (D5)", () => {
  it("renders the summary, numbered sections and a table of contents", () => {
    renderWithClient(<LegalView doc={findLegalDoc("privacy")!} />);
    expect(screen.getByRole("heading", { level: 1, name: "นโยบายความเป็นส่วนตัว" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "สรุปสั้น" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. ข้อมูลที่เราเก็บ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1. ข้อมูลที่เราเก็บ" })).toHaveAttribute("href", "#data-we-collect");
    const docs = screen.getByRole("navigation", { name: "เอกสาร" });
    expect(within(docs).getByRole("link", { name: "นโยบายความเป็นส่วนตัว" })).toHaveAttribute("aria-current", "page");
    expect(within(docs).getByRole("link", { name: "กฎการลงประกาศ" })).toHaveAttribute("href", "/legal/listing-rules");
  });
});

describe("ReportListing (D6)", () => {
  it("opens from the link, validates, then sends an anonymous report", async () => {
    const user = userEvent.setup();
    setPathname("/property/listing-2012");
    renderWithClient(<ReportListing slug="listing-2012" code="PH-2012" />);
    await user.click(screen.getByRole("button", { name: "แจ้งประกาศ" }));
    expect(router.replace).toHaveBeenCalledWith("/property/listing-2012?report=1", { scroll: false });
  });

  it("requires a reason and details for other", async () => {
    const user = userEvent.setup();
    setPathname("/property/listing-2012");
    setSearchParams("report=1");
    renderWithClient(<ReportListing slug="listing-2012" code="PH-2012" />);
    const dialog = screen.getByRole("dialog", { name: "แจ้งประกาศนี้" });
    expect(within(dialog).getByText(/PH-2012/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "ส่งรายงาน" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("เลือกเหตุผลที่แจ้ง");
    await user.click(within(dialog).getByRole("radio", { name: "อื่นๆ" }));
    await user.click(within(dialog).getByRole("button", { name: "ส่งรายงาน" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("เล่าเพิ่มเติม");

    await user.click(within(dialog).getByRole("radio", { name: /ประกาศหลอกลวง/ }));
    await user.type(within(dialog).getByLabelText(/เล่าเพิ่มเติม/), "ขอให้โอนมัดจำก่อนนัด");
    await user.click(within(dialog).getByRole("button", { name: "ส่งรายงาน" }));
    expect(await screen.findByText("ได้รับรายงานแล้ว ทีมงานจะตรวจภายใน 24 ชม.")).toBeInTheDocument();
    expect(listReports("listing-2012")).toMatchObject([{ reason: "scam", details: "ขอให้โอนมัดจำก่อนนัด" }]);
    expect(router.replace).toHaveBeenLastCalledWith("/property/listing-2012", { scroll: false });
  });
});

describe("CookieConsent (D7)", () => {
  afterEach(() => {
    window.localStorage.removeItem(CONSENT_KEY);
    resetConsentCache();
  });

  it("asks once, with equal-weight choices, and remembers a rejection", async () => {
    const user = userEvent.setup();
    renderWithClient(<CookieConsent />);
    const banner = screen.getByRole("region", { name: "การใช้คุกกี้" });
    const reject = within(banner).getByRole("button", { name: "ปฏิเสธที่ไม่จำเป็น" });
    const accept = within(banner).getByRole("button", { name: "ยอมรับทั้งหมด" });
    expect(reject.className).toBe(accept.className);
    await user.click(reject);
    expect(screen.queryByRole("region", { name: "การใช้คุกกี้" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CONSENT_KEY)!)).toMatchObject({ analytics: false, marketing: false });
  });

  it("sets preferences with non-essential off by default, and reopens from the footer", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <>
        <CookieConsent />
        <CookieSettingsButton />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "ตั้งค่าเอง" }));
    const dialog = screen.getByRole("dialog", { name: "ตั้งค่าคุกกี้" });
    const analytics = within(dialog).getByRole("switch", { name: "วิเคราะห์การใช้งาน" });
    expect(analytics).toHaveAttribute("aria-checked", "false");
    expect(within(dialog).getByRole("switch", { name: "การตลาด" })).toHaveAttribute("aria-checked", "false");
    await user.click(analytics);
    await user.click(within(dialog).getByRole("button", { name: "บันทึกการตั้งค่า" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(JSON.parse(window.localStorage.getItem(CONSENT_KEY)!)).toMatchObject({ analytics: true, marketing: false });
    expect(screen.queryByRole("region", { name: "การใช้คุกกี้" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ตั้งค่าคุกกี้" }));
    expect(within(screen.getByRole("dialog")).getByRole("switch", { name: "วิเคราะห์การใช้งาน" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
