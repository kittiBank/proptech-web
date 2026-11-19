import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { failingHandler } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { router, setParams, setPathname, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { ArticleView } from "./article-view";
import { GuidesView, parseGuidesParams } from "./guides-view";
import { MortgageTool } from "./mortgage-tool";

describe("parseGuidesParams", () => {
  it("drops unknown categories", () => {
    expect(parseGuidesParams(new URLSearchParams("category=nope&q= ค่าโอน "))).toEqual({
      category: "all",
      q: "ค่าโอน",
    });
  });
});

describe("GuidesView", () => {
  beforeEach(() => {
    setPathname("/guides");
    setSearchParams("");
  });

  it("shows the featured article, tools and the latest articles", async () => {
    renderWithClient(<GuidesView />);
    expect(
      await screen.findByRole("heading", { level: 2, name: "ซื้อคอนโดมือสอง เช็ก 12 ข้อนี้ก่อนวางมัดจำ" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /คำนวณค่างวดผ่อนบ้าน/ })).toHaveAttribute("href", "/tools/mortgage");
    const latest = screen.getByRole("region", { name: "บทความล่าสุด" });
    // 7 non-featured articles: one page of 6, then "load more".
    expect(await within(latest).findAllByRole("article")).toHaveLength(6);
    await userEvent.click(screen.getByRole("button", { name: "ดูบทความเพิ่ม" }));
    await waitFor(() => expect(within(latest).getAllByRole("article")).toHaveLength(7));
    expect(screen.queryByRole("button", { name: "ดูบทความเพิ่ม" })).not.toBeInTheDocument();
  });

  it("filters by category through the URL", async () => {
    renderWithClient(<GuidesView />);
    await userEvent.click(screen.getByRole("button", { name: "สินเชื่อและภาษี" }));
    expect(router.replace).toHaveBeenCalledWith("/guides?category=finance", { scroll: false });
  });

  it("submits the search box to the URL", async () => {
    renderWithClient(<GuidesView />);
    await userEvent.type(screen.getByRole("searchbox", { name: "ค้นหาบทความ" }), "ค่าโอน{Enter}");
    expect(router.replace).toHaveBeenCalledWith(`/guides?q=${encodeURIComponent("ค่าโอน")}`, { scroll: false });
  });

  it("lists matches and hides the featured slot when filtered", async () => {
    setSearchParams("category=finance");
    renderWithClient(<GuidesView />);
    expect(await screen.findByRole("heading", { name: "พบ 2 บทความ" })).toBeInTheDocument();
    expect(screen.queryByText(/บทความเด่น/)).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    setSearchParams("q=zzzz");
    renderWithClient(<GuidesView />);
    expect(await screen.findByRole("heading", { name: "ไม่พบบทความที่ตรงกับการค้นหา" })).toBeInTheDocument();
  });

  it("shows a retry panel when articles fail to load", async () => {
    server.use(failingHandler("/articles"));
    renderWithClient(<GuidesView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดบทความไม่สำเร็จ");
  });
});

describe("ArticleView", () => {
  it("renders the table of contents, callout, inline calculator and related listings", async () => {
    setParams({ slug: "resale-condo-checklist" });
    renderWithClient(<ArticleView />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "ซื้อคอนโดมือสอง เช็ก 12 ข้อนี้ก่อนวางมัดจำ" }),
    ).toBeInTheDocument();

    const toc = screen.getByRole("navigation", { name: "สารบัญ" });
    expect(within(toc).getByRole("link", { name: "วันดูห้องจริง" })).toHaveAttribute("href", "#viewing-day");
    expect(screen.getByText("ระวังมิจฉาชีพ")).toBeInTheDocument();

    // Inline calculator: ฿9.2M, 10% down, 3.2%, 30 years.
    expect(screen.getByText("฿35,808")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "เปิดเครื่องคำนวณเต็ม" })).toHaveAttribute(
      "href",
      "/tools/mortgage?price=9200000&down=10&rate=3.2&years=30",
    );
    await userEvent.selectOptions(screen.getByLabelText("เงินดาวน์"), "20");
    expect(screen.getByRole("link", { name: "เปิดเครื่องคำนวณเต็ม" })).toHaveAttribute(
      "href",
      "/tools/mortgage?price=9200000&down=20&rate=3.2&years=30",
    );

    const related = await screen.findByRole("link", { name: /^ดูทั้งหมด \d+ ประกาศ$/ });
    expect(related).toHaveAttribute("href", "/search?mode=buy&type=condo&station=E5");
  });

  it("shows a not-found panel for an unknown slug", async () => {
    setParams({ slug: "missing" });
    renderWithClient(<ArticleView />);
    expect(await screen.findByRole("heading", { name: "ไม่พบบทความนี้" })).toBeInTheDocument();
  });
});

describe("MortgageTool", () => {
  beforeEach(() => setPathname("/tools/mortgage"));

  it("prefills from the URL and links to listings in the budget bracket", async () => {
    setSearchParams("price=9200000&down=10&rate=3.2&years=30");
    renderWithClient(<MortgageTool />);
    const result = screen.getByRole("region", { name: "ค่างวดต่อเดือนโดยประมาณ" });
    expect(within(result).getByText("฿35,808")).toBeInTheDocument();
    expect(within(result).getByText("฿89,520/เดือน")).toBeInTheDocument();
    expect(within(result).getByText("฿8,280,000")).toBeInTheDocument();
    // Compact bar for phones, full bar for desktop; CSS shows one.
    expect(screen.getAllByRole("img", { name: "เงินต้น 64% ดอกเบี้ย 36%" })).toHaveLength(2);

    const links = await screen.findAllByRole("link", { name: /ประกาศในงบ/ });
    for (const link of links) expect(link).toHaveAttribute("href", "/search?mode=buy&price=5-10m");
  });

  it("recalculates when an option changes and keeps the last result on invalid input", async () => {
    setSearchParams("price=9200000&down=10&rate=3.2&years=30");
    renderWithClient(<MortgageTool />);
    const result = screen.getByRole("region", { name: "ค่างวดต่อเดือนโดยประมาณ" });

    await userEvent.click(screen.getByRole("radio", { name: "20%" }));
    expect(within(result).getByText("฿31,830")).toBeInTheDocument();

    const price = screen.getByLabelText("ราคาทรัพย์");
    await userEvent.clear(price);
    await userEvent.type(price, "50");
    expect(price).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("ใส่ราคาระหว่าง ฿100,000 ถึง ฿500 ล้าน")).toBeInTheDocument();
    expect(within(result).getByText("฿31,830")).toBeInTheDocument();
  });
});
