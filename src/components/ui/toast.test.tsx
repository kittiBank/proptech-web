import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster, toast } from "./toast";

describe("Toast", () => {
  afterEach(() => vi.useRealTimers());

  it("announces messages in a status region and hides after its duration", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    const region = screen.getByRole("status");
    act(() => {
      toast("บันทึกแล้ว", { duration: 3000 });
    });
    expect(region).toHaveTextContent("บันทึกแล้ว");
    act(() => vi.advanceTimersByTime(3000));
    expect(region).toBeEmptyDOMElement();
  });

  it("runs the action, then closes; Escape also closes", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("นำออกแล้ว", { action: { label: "เลิกทำ", onClick: onUndo } });
    });
    await user.click(screen.getByRole("button", { name: "เลิกทำ" }));
    expect(onUndo).toHaveBeenCalled();
    expect(screen.queryByText("นำออกแล้ว")).not.toBeInTheDocument();

    act(() => {
      toast("ส่งข้อความแล้ว");
    });
    await user.keyboard("{Escape}");
    expect(screen.queryByText("ส่งข้อความแล้ว")).not.toBeInTheDocument();
  });
});
