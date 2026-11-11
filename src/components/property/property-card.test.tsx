import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { properties } from "@/data/properties";
import { PropertyCard } from "./property-card";

const base = properties[0];
const property = {
  ...base,
  mode: "rent" as const,
  type: "condo" as const,
  gallery: [
    base.image,
    { src: "https://images.unsplash.com/photo-1", alt: "ห้องนอน" },
    { src: "https://images.unsplash.com/photo-2", alt: "ห้องครัว" },
  ],
};

describe("PropertyCard", () => {
  it("shows type and deal tags, then the bold title as the card link", () => {
    render(<PropertyCard property={property} />);
    const tags = within(screen.getByRole("list", { name: "ประเภทประกาศ" })).getAllByRole("listitem");
    expect(tags.map((t) => t.textContent)).toEqual(["คอนโด", "เช่า"]);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(property.title);
  });

  it("moves through the gallery with dots and arrows, wrapping around", async () => {
    const user = userEvent.setup();
    render(<PropertyCard property={property} />);
    const dot = (n: number) => screen.getByRole("button", { name: new RegExp(`^รูปที่ ${n} จาก 3`) });

    expect(dot(1)).toHaveAttribute("aria-current", "true");
    await user.click(dot(3));
    expect(dot(3)).toHaveAttribute("aria-current", "true");
    await user.click(screen.getByRole("button", { name: "รูปถัดไป" }));
    expect(dot(1)).toHaveAttribute("aria-current", "true");
    await user.click(screen.getByRole("button", { name: "รูปก่อนหน้า" }));
    expect(dot(3)).toHaveAttribute("aria-current", "true");
  });

  it("shows the view count under the card", () => {
    render(<PropertyCard property={{ ...property, viewCount: 1234 }} />);
    expect(screen.getByText(/1,234/)).toHaveTextContent("เข้าชม1,234ครั้ง");
  });

  it("has no gallery controls for a single photo", () => {
    render(<PropertyCard property={{ ...property, gallery: undefined }} />);
    expect(screen.queryByRole("button", { name: "รูปถัดไป" })).not.toBeInTheDocument();
  });
});
