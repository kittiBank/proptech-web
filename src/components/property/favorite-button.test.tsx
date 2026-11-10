import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FavoriteButton } from "./favorite-button";

describe("FavoriteButton", () => {
  it("toggles the saved state and persists it", async () => {
    const user = userEvent.setup();
    render(<FavoriteButton propertyId="test-1" propertyTitle="คอนโดทดสอบ" />);

    const button = screen.getByRole("button", { name: "บันทึก คอนโดทดสอบ ในรายการโปรด" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("นำ คอนโดทดสอบ ออกจากรายการโปรด");
    expect(JSON.parse(window.localStorage.getItem("propertyhub:favorites") ?? "[]")).toContain("test-1");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
