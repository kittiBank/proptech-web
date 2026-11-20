import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("is decorative by default and named when labelled", () => {
    const { container } = render(<Avatar name="สมชาย ใจดี" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("ส");

    render(<Avatar name="Anna Lee" labelled />);
    expect(screen.getByRole("img", { name: "Anna Lee" })).toHaveTextContent("A");
  });

  it("falls back to the initial when the photo fails", () => {
    const { container } = render(<Avatar name="นภา" src="/broken.jpg" labelled />);
    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "นภา" })).toHaveTextContent("น");
  });
});
