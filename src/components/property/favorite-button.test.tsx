import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { properties } from "@/data/properties";
import { listFavorites } from "@/mocks/favorites";
import { resetMockSession } from "@/mocks/session";
import { router, setPathname } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { FavoriteButton } from "./favorite-button";

describe("FavoriteButton", () => {
  it("opens the login modal for signed-out visitors and saves after sign-in", async () => {
    const user = userEvent.setup();
    const property = properties[0];
    setPathname("/");
    const { client } = renderWithClient(<FavoriteButton property={property} />);

    await user.click(await screen.findByRole("button", { name: `บันทึก ${property.title} ในรายการโปรด` }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login?intent=favorite&next=%2F", { scroll: false }));
    expect(listFavorites()).toEqual([]);

    resetMockSession({ signedIn: true });
    await client.invalidateQueries({ queryKey: ["auth", "session"] });
    await waitFor(() => expect(listFavorites().map((f) => f.property.id)).toEqual([property.id]));
  });

  it("saves and removes the listing through the favorites API", async () => {
    resetMockSession({ signedIn: true });
    const user = userEvent.setup();
    const property = properties[0];
    renderWithClient(<FavoriteButton property={property} />);

    const button = await screen.findByRole("button", { name: `บันทึก ${property.title} ในรายการโปรด` });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
    expect(button).toHaveAccessibleName(`นำ ${property.title} ออกจากรายการโปรด`);
    await waitFor(() => expect(listFavorites().map((f) => f.property.id)).toEqual([property.id]));

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
    await waitFor(() => expect(listFavorites()).toEqual([]));
  });
});
