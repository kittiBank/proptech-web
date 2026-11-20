import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders the handoff variants and heights", () => {
    render(
      <>
        <Button variant="danger">ลบ</Button>
        <Button variant="danger-solid">ยืนยันการลบ</Button>
        <Button variant="success" size="base">
          อนุมัติ
        </Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "ลบ" })).toHaveClass("text-danger", "border-danger-line");
    expect(screen.getByRole("button", { name: "ยืนยันการลบ" })).toHaveClass("bg-danger", "text-white");
    expect(screen.getByRole("button", { name: "อนุมัติ" })).toHaveClass("bg-success", "h-10");
  });

  it("activates from the keyboard and not while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>บันทึก</Button>
        <Button disabled onClick={onClick}>
          ส่ง
        </Button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "บันทึก" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "ส่ง" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
