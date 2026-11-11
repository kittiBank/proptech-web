import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { failingHandler } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { makeQueryClient } from "@/providers/query-provider";
import { AdCarousel } from "./ad-carousel";

function renderCarousel() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <AdCarousel placement="home-feed" />
    </QueryClientProvider>,
  );
}

const visibleSlide = () => screen.getByRole("group", { name: /^\d จาก 3$/ });

afterEach(() => {
  vi.useRealTimers();
});

describe("AdCarousel", () => {
  it("shows one sponsored slide at a time and jumps with the dots", async () => {
    const user = userEvent.setup();
    renderCarousel();

    expect(await screen.findByRole("region", { name: "โฆษณาจากผู้สนับสนุน" })).toHaveTextContent("โฆษณา");
    expect(visibleSlide()).toHaveAccessibleName("1 จาก 3");
    expect(screen.queryByRole("button", { name: /ถัดไป|ก่อนหน้า|หยุด/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^โฆษณาที่ 3/ }));
    expect(visibleSlide()).toHaveAccessibleName("3 จาก 3");
    expect(screen.getByRole("button", { name: /^โฆษณาที่ 3/ })).toHaveAttribute("aria-current", "true");
  });

  it("advances on its own every 5 seconds, wrapping around", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderCarousel();
    await screen.findByRole("region", { name: "โฆษณาจากผู้สนับสนุน" });

    act(() => vi.advanceTimersByTime(5000));
    expect(visibleSlide()).toHaveAccessibleName("2 จาก 3");
    act(() => vi.advanceTimersByTime(10_000));
    expect(visibleSlide()).toHaveAccessibleName("1 จาก 3");
  });

  it("disappears when ads fail to load", async () => {
    server.use(failingHandler("/ads"));
    const { container } = renderCarousel();
    await expect.poll(() => container.innerHTML).toBe("");
  });
});
