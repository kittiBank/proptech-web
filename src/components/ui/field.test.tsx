import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextField } from "./field";

describe("TextField", () => {
  it("labels the input and links the hint", () => {
    render(<TextField id="area" label="พื้นที่ใช้สอย" hint="ตามโฉนด" suffix="ตร.ม." />);
    const input = screen.getByLabelText("พื้นที่ใช้สอย");
    expect(input).toHaveAccessibleDescription("ตามโฉนด");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("ตร.ม.")).toBeInTheDocument();
  });

  it("marks the input invalid and describes it with the error instead of the hint", () => {
    render(<TextField id="price" label="ราคา" hint="บาท" error="กรอกราคา" />);
    const input = screen.getByLabelText("ราคา");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("กรอกราคา");
    expect(screen.queryByText("บาท")).not.toBeInTheDocument();
  });
});
