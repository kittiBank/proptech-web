import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChoiceChip, RadioCard, SegmentedControl } from "./choice";

function Segmented() {
  const [value, setValue] = useState<"buy" | "rent">("buy");
  return (
    <SegmentedControl
      label="ประเภทประกาศ"
      value={value}
      onChange={setValue}
      options={[
        { value: "buy", label: "ขาย" },
        { value: "rent", label: "เช่า" },
      ]}
    />
  );
}

describe("SegmentedControl", () => {
  it("is a radiogroup that arrow keys move through", async () => {
    const user = userEvent.setup();
    render(<Segmented />);
    expect(screen.getByRole("radiogroup", { name: "ประเภทประกาศ" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "ขาย" })).toBeChecked();
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "เช่า" })).toBeChecked();
  });
});

describe("RadioCard", () => {
  it("selects on click and shows the selected style", async () => {
    const user = userEvent.setup();
    function Cards() {
      const [v, setV] = useState("a");
      return (
        <>
          <RadioCard name="plan" checked={v === "a"} onChange={() => setV("a")} title="ดันประกาศ" />
          <RadioCard name="plan" checked={v === "b"} onChange={() => setV("b")} title="ประกาศแนะนำ" aside="฿199" />
        </>
      );
    }
    render(<Cards />);
    const featured = screen.getByRole("radio", { name: /ประกาศแนะนำ/ });
    await user.click(featured);
    expect(featured).toBeChecked();
    expect(featured.closest("label")).toHaveClass("border-brand");
  });
});

describe("ChoiceChip", () => {
  it("toggles a checkbox with Space", async () => {
    const user = userEvent.setup();
    function Chip() {
      const [on, setOn] = useState(false);
      return (
        <ChoiceChip name="pool" checked={on} onChange={() => setOn(!on)}>
          สระว่ายน้ำ
        </ChoiceChip>
      );
    }
    render(<Chip />);
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("checkbox", { name: "สระว่ายน้ำ" })).toBeChecked();
  });
});
