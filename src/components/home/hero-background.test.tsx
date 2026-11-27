import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HeroBackground } from "./hero-background";

/** jsdom has no media playback: fake play/pause and fire the events a browser would. */
function fakeMedia() {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { value: false, configurable: true });
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { value: true, configurable: true });
    this.dispatchEvent(new Event("pause"));
  });
  return { play, pause };
}

describe("HeroBackground", () => {
  const originalMatchMedia = window.matchMedia;
  let media: ReturnType<typeof fakeMedia>;

  beforeEach(() => {
    media = fakeMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
  });

  it("autoplays the muted video and lets the user pause and resume it", () => {
    const { container } = render(<HeroBackground />);
    const video = container.querySelector("video")!;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("poster", "/media/home/hero-poster.jpg");
    expect(media.play).toHaveBeenCalledTimes(1);

    const button = screen.getByRole("button", { name: "หยุดวิดีโอพื้นหลัง" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(media.pause).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("does not autoplay when the user prefers reduced motion", () => {
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce") })) as typeof window.matchMedia;
    render(<HeroBackground />);
    expect(media.play).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "หยุดวิดีโอพื้นหลัง" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the poster when autoplay is refused", async () => {
    media.play.mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    render(<HeroBackground />);
    await Promise.resolve();
    expect(screen.getByRole("button", { name: "หยุดวิดีโอพื้นหลัง" })).toHaveAttribute("aria-pressed", "true");
  });
});
