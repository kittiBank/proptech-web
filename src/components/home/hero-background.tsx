"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** `play()` rejects when autoplay is refused (e.g. iOS Low Power Mode); the poster then stays and the button offers play. */
function tryPlay(el: HTMLVideoElement) {
  Promise.resolve(el.play()).catch(() => {});
}

/**
 * Hero background: a muted, looping house video under a `hero` tint.
 *
 * - Files in `public/media/home/`: 540p (~3 MB) under 768px, 720p (~5 MB) above, both
 *   H.264 with no audio track and the index up front so playback starts while downloading.
 *   The poster (first frame) shows until the video can play.
 * - A light `hero` tint (45%) keeps the video clear; `HeroTextBackdrop` darkens only
 *   behind the headline and subtitle so the text stays WCAG AA over the brightest frames.
 * - `prefers-reduced-motion`: no autoplay, the poster stays. Everyone else gets a
 *   pause button (WCAG 2.2.2: motion over 5 s needs a way to stop it).
 */
const media = {
  poster: "/media/home/hero-poster.jpg",
  mobile: "/media/home/hero-540.mp4",
  desktop: "/media/home/hero-720.mp4",
};

export function HeroBackground() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    tryPlay(el);
  }, []);

  function toggle() {
    const el = video.current;
    if (!el) return;
    if (el.paused) tryPlay(el);
    else el.pause();
  }

  return (
    <>
      <div data-slot="hero-background" aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-hero">
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="metadata"
          poster={media.poster}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="absolute inset-0 size-full object-cover"
        >
          <source src={media.mobile} type="video/mp4" media="(max-width: 767px)" />
          <source src={media.desktop} type="video/mp4" />
        </video>
        {/* Light tint so the video reads clearly; `HeroTextBackdrop` darkens just behind the text. */}
        <div className="absolute inset-0 bg-hero/45" />
        {/* Darkens the lower edge so the search panel sits on a calm base. */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-hero/50 to-transparent" />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!playing}
        aria-label="หยุดวิดีโอพื้นหลัง"
        className="absolute right-3 bottom-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:bottom-5"
      >
        {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
      </button>
    </>
  );
}

/**
 * Soft `hero` glow sized to the headline block it sits in, so it follows the text at every
 * breakpoint. Together with the 45% tint it is ≥ 78% `hero` behind every line of text, so even
 * over a white frame the headline stays ≥ 3:1 (large text) and the 80% white subtitle ≥ 4.5:1.
 */
export function HeroTextBackdrop() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-[40%] -inset-y-[75%] -z-10 bg-[radial-gradient(closest-side,rgb(38_26_92/0.6)_60%,transparent)]"
    />
  );
}
