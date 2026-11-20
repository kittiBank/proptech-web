import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "./kpi-card";

describe("KpiCard", () => {
  it("shows the value and a delta whose direction is spoken and coloured by meaning", () => {
    render(
      <>
        <KpiCard label="ยอดเข้าชม" value="12,480" delta={{ text: "+12%", direction: "up" }} />
        <KpiCard label="ลีดที่ยังไม่ตอบ" value="4" delta={{ text: "+2", direction: "up", upIsGood: false }} />
      </>,
    );
    expect(screen.getByText("12,480")).toHaveClass("tabular-nums");
    const good = screen.getByText(/\+12%/);
    expect(good).toHaveTextContent("เพิ่มขึ้น +12%");
    expect(good).toHaveClass("text-success");
    expect(screen.getByText(/\+2$/)).toHaveClass("text-danger");
  });
});
