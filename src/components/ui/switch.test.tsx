import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch (Toggle)", () => {
  it("is a named switch that toggles with the keyboard", async () => {
    const user = userEvent.setup();
    function Toggle() {
      const [on, setOn] = useState(false);
      return <Switch label="แจ้งเตือนทางอีเมล" checked={on} onCheckedChange={setOn} />;
    }
    render(<Toggle />);
    const sw = screen.getByRole("switch", { name: "แจ้งเตือนทางอีเมล" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.tab();
    await user.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Enter}");
    expect(sw).toHaveAttribute("aria-checked", "false");
  });
});
