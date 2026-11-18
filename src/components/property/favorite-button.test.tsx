import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { properties } from "@/data/properties";
import { listFavorites } from "@/mocks/favorites";
import { renderWithClient } from "@/test/render";
import { FavoriteButton } from "./favorite-button";

describe("FavoriteButton", () => {
  it("saves and removes the listing through the favorites API", async () => {
    const user = userEvent.setup();
    const property = properties[0];
    renderWithClient(<FavoriteButton property={property} />);

    const button = await screen.findByRole("button", { name: `บันทึก ${property.title} ในรายการโปรด` });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName(`นำ ${property.title} ออกจากรายการโปรด`);
    await waitFor(() => expect(listFavorites().map((f) => f.property.id)).toEqual([property.id]));

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(listFavorites()).toEqual([]));
  });
});
