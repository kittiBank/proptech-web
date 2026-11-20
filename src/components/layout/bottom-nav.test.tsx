import { useState } from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { resetMockSession } from "@/mocks/session";
import { setPathname } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { BottomNav } from "./bottom-nav";

const nav = () => screen.queryByRole("navigation", { name: "เมนูล่าง" });

describe("BottomNav", () => {
  it("shows the four tabs and marks the current one", () => {
    setPathname("/account/favorites");
    renderWithClient(<BottomNav />);
    const links = within(nav()!).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["ค้นหา", "รายการโปรด", "ข้อความ", "บัญชี"]);
    expect(within(nav()!).getByRole("link", { name: "รายการโปรด" })).toHaveAttribute("aria-current", "page");
    expect(within(nav()!).getByRole("link", { name: "ค้นหา" })).not.toHaveAttribute("aria-current");
  });

  it("shows the unread message badge when signed in", async () => {
    resetMockSession({ signedIn: true });
    setPathname("/search");
    renderWithClient(<BottomNav />);
    // The visible label comes first, then the hidden unread count.
    const messages = await within(nav()!).findByRole(
      "link",
      { name: /^ข้อความ\s*\(ยังไม่ได้อ่าน 2\)$/ },
      { timeout: 3000 },
    );
    expect(messages).toHaveAttribute("href", "/messages");
  });

  it("has no badge when signed out", async () => {
    setPathname("/search");
    renderWithClient(<BottomNav />);
    expect(within(nav()!).getByRole("link", { name: "ข้อความ" })).toBeInTheDocument();
  });

  it("stays out of chat rooms", () => {
    setPathname("/messages/t-1");
    renderWithClient(<BottomNav />);
    expect(nav()).toBeNull();
  });

  it("steps aside while a bottom sheet is open", async () => {
    const user = userEvent.setup();
    setPathname("/search");
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            ตัวกรอง
          </button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="bottom" aria-describedby={undefined}>
              <SheetTitle>ตัวกรอง</SheetTitle>
            </SheetContent>
          </Sheet>
          <BottomNav />
        </>
      );
    }
    renderWithClient(<Page />);
    expect(nav()).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    expect(nav()).toBeNull();
    await user.keyboard("{Escape}");
    expect(nav()).not.toBeNull();
  });
});
