"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyImage } from "@/types/property";
import { PropertyPhoto } from "./property-photo";

interface PropertyGalleryProps {
  images: PropertyImage[];
  /** Listing page; tapping a photo opens it, like the rest of the card. */
  href: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

const arrowClass =
  "absolute top-1/2 z-[2] inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/40 text-ink opacity-0 backdrop-blur-sm transition-[opacity,background-color] group-hover:opacity-100 hover:bg-white/75 focus-visible:opacity-100 [@media(hover:none)]:hidden";

/**
 * Card photo slideshow. Swipe on touch screens (native scroll-snap), arrows on
 * hover, dots everywhere. Photos after the cover mount only when the visitor
 * starts browsing, so a page of cards still loads one image each.
 *
 * Sits above the card's stretched link (z-[1]); each slide links to the same
 * listing so a tap on the photo still opens it.
 */
export function PropertyGallery({ images, href, sizes, priority, className, imageClassName }: PropertyGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [mountedUpTo, setMountedUpTo] = useState(0);
  const count = images.length;

  const reveal = (upTo: number) => setMountedUpTo((m) => Math.max(m, Math.min(upTo, count - 1)));

  const goTo = (next: number) => {
    const target = (next + count) % count;
    setIndex(target);
    reveal(target);
    const track = trackRef.current;
    // jsdom has no Element.scrollTo; the index above is the source of truth either way.
    track?.scrollTo?.({ left: target * track.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const position = track.scrollLeft / track.clientWidth;
    setIndex(Math.round(position));
    reveal(Math.ceil(position));
  };

  return (
    <div className={cn("relative z-[1] overflow-hidden bg-violet-50", className)} onPointerEnter={() => reveal(1)}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        aria-hidden="true"
        className="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <Link
            key={`${image.src}-${i}`}
            href={href}
            tabIndex={-1}
            draggable={false}
            className="relative block h-full w-full shrink-0 snap-start"
          >
            {i <= mountedUpTo && (
              <PropertyPhoto
                image={image}
                sizes={sizes}
                priority={priority && i === 0}
                className="h-full w-full"
                imageClassName={imageClassName}
              />
            )}
          </Link>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="รูปก่อนหน้า"
            className={cn(arrowClass, "left-2")}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="รูปถัดไป"
            className={cn(arrowClass, "right-2")}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-2 z-[2] flex justify-center">
            <div role="group" aria-label="เลือกรูป" className="flex items-center rounded-full bg-ink/40 px-1">
              {images.map((image, i) => (
                <button
                  key={`${image.src}-${i}`}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`รูปที่ ${i + 1} จาก ${count}: ${image.alt}`}
                  aria-current={i === index}
                  className="flex h-6 w-5 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-3.5 bg-white" : "w-1.5 bg-white/60",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
