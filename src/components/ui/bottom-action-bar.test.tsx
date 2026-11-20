import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BottomActionBar } from "./bottom-action-bar";
import { Button } from "./button";

describe("BottomActionBar", () => {
  it("is a named region holding the actions, hidden from lg by default", () => {
    render(
      <BottomActionBar label="ติดต่อผู้ลงประกาศ">
        <Button>โทร</Button>
      </BottomActionBar>,
    );
    const bar = screen.getByRole("region", { name: "ติดต่อผู้ลงประกาศ" });
    expect(bar).toContainElement(screen.getByRole("button", { name: "โทร" }));
    expect(bar).toHaveClass("lg:hidden", "fixed");
  });
});
