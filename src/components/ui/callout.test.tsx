import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "./callout";

describe("Callout", () => {
  it("is a note by default and can be an alert", () => {
    render(
      <>
        <Callout tone="warning" title="ระวังมิจฉาชีพ">
          อย่าโอนเงินก่อนดูทรัพย์
        </Callout>
        <Callout tone="danger" role="alert" title="ชำระเงินไม่สำเร็จ" />
      </>,
    );
    const note = screen.getByRole("note");
    expect(note).toHaveAttribute("data-tone", "warning");
    expect(note).toHaveTextContent("ระวังมิจฉาชีพอย่าโอนเงินก่อนดูทรัพย์");
    expect(screen.getByRole("alert")).toHaveTextContent("ชำระเงินไม่สำเร็จ");
  });
});
