import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { listingStatuses } from "@/lib/status";
import { DomainStatus, StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it("shows the label as text with the tone styling", () => {
    render(
      <>
        <StatusPill tone="danger">ไม่ผ่าน</StatusPill>
        <DomainStatus info={listingStatuses.published} />
      </>,
    );
    expect(screen.getByText("ไม่ผ่าน")).toHaveAttribute("data-tone", "danger");
    expect(screen.getByText("เผยแพร่แล้ว")).toHaveClass("bg-success-soft", "text-success");
  });
});
