import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SegmentStepper, Stepper } from "./stepper";

describe("Stepper", () => {
  it("links done steps, marks the current step and leaves upcoming steps inert", () => {
    render(
      <Stepper
        label="ขั้นตอน"
        steps={[
          { id: "a", label: "ข้อมูล", state: "done", href: "/post/1/a" },
          { id: "b", label: "ทำเล", state: "current" },
          { id: "c", label: "รูปภาพ", state: "upcoming" },
        ]}
      />,
    );
    expect(screen.getByRole("list", { name: "ขั้นตอน" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ข้อมูล.*เสร็จแล้ว/ })).toHaveAttribute("href", "/post/1/a");
    expect(screen.getByText("ทำเล").closest("[aria-current]")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("รูปภาพ").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("SegmentStepper", () => {
  it("exposes progress as a progressbar", () => {
    render(<SegmentStepper current={1} total={5} />);
    const bar = screen.getByRole("progressbar", { name: "ขั้นที่ 2 จาก 5" });
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
  });
});
