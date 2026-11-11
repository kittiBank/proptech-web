"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/query-state";
import { adQueries } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import type { AdPlacement } from "@/types/api";

const ROTATE_MS = 5000;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true, // Server: assume no autoplay until the client knows.
  );
}

/**
 * Sponsored banner slideshow. Rotates every 5 s; the dots below jump to a
 * slide. Rotation stops while the banner is hovered or focused and never runs
 * under prefers-reduced-motion. If ads fail to load the slot simply disappears.
 */
export function AdCarousel({ placement, className }: { placement: AdPlacement; className?: string }) {
  const { data: ads = [], isPending } = useQuery({ ...adQueries.placement(placement), select: (res) => res.data });
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const count = ads.length;
  const autoplay = count > 1 && !held && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [autoplay, count]);

  if (isPending) return <Skeleton className={cn("h-[320px] rounded-lg md:h-[280px]", className)} />;
  if (count === 0) return null;

  const current = index % count;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="โฆษณาจากผู้สนับสนุน"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
      className={cn("relative overflow-hidden rounded-lg bg-ink text-white", className)}
    >
      <div className="grid" aria-live={autoplay ? "off" : "polite"}>
        {ads.map((ad, i) => {
          const active = i === current;
          return (
            <div
              key={ad.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} จาก ${count}`}
              inert={!active}
              aria-hidden={!active}
              className={cn(
                "grid transition-opacity duration-500 [grid-area:1/1] md:grid-cols-[1.15fr_1fr]",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              <PropertyPhoto
                image={ad.image}
                sizes="(min-width: 1024px) 640px, 100vw"
                className="aspect-[16/9] md:aspect-auto md:h-full md:min-h-[280px]"
              />
              <div className="flex flex-col items-start gap-3 p-6 pb-16 sm:p-8 sm:pb-16">
                <p className="text-[13px] text-white/70">
                  <span className="mr-2 rounded-sm bg-white/15 px-1.5 py-0.5 font-medium text-white">โฆษณา</span>
                  {ad.sponsor}
                </p>
                <h3 className="text-[22px] leading-snug font-semibold sm:text-[26px]">{ad.title}</h3>
                <p className="text-[15px] leading-relaxed text-white/80">{ad.description}</p>
                <Button asChild variant="light" className="mt-1">
                  <Link href={ad.href}>{ad.ctaLabel}</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <div role="group" aria-label="เลือกโฆษณา" className="flex items-center rounded-full bg-ink/40 px-1.5">
            {ads.map((ad, i) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`โฆษณาที่ ${i + 1}: ${ad.title}`}
                aria-current={i === current}
                className="flex h-8 w-6 items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={cn("h-2 rounded-full transition-all", i === current ? "w-5 bg-white" : "w-2 bg-white/50")}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
