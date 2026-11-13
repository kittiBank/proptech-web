"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PropertyImage } from "@/types/property";

const arrow =
  "absolute top-1/2 z-[2] inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink backdrop-blur-sm transition-colors hover:bg-white";

/**
 * Listing photos: a large stage with arrows, a counter and a thumbnail strip.
 * Clicking the stage opens a full-screen viewer that also takes ←/→ keys.
 */
export function ListingGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const count = images.length;
  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, index, go]);

  const current = images[index];
  if (!current) return null;

  return (
    <section aria-label="รูปภาพประกาศ">
      <div className="relative overflow-hidden rounded-lg bg-violet-50">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="block w-full cursor-zoom-in"
          aria-label={`ดูรูปขนาดใหญ่: ${current.alt}`}
        >
          <PropertyPhoto
            key={current.src + index}
            image={current}
            sizes="(min-width: 1024px) 820px, 100vw"
            priority={index === 0}
            className="aspect-[4/3] w-full sm:aspect-[16/10]"
          />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="รูปก่อนหน้า"
              className={cn(arrow, "left-3")}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="รูปถัดไป" className={cn(arrow, "right-3")}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-ink hover:bg-violet-50"
          >
            <Images className="size-4" aria-hidden="true" />
            ดูรูปทั้งหมด {count} รูป
          </button>
          <span className="rounded-md bg-ink/70 px-2.5 py-1 text-sm text-white tabular-nums" aria-live="polite">
            {index + 1} / {count}
          </span>
        </div>
      </div>

      {count > 1 && (
        <ul className="mt-3 flex [scrollbar-width:thin] gap-2 overflow-x-auto pb-1" aria-label="เลือกรูป">
          {images.map((image, i) => (
            <li key={`${image.src}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`รูปที่ ${i + 1}: ${image.alt}`}
                aria-current={i === index}
                className={cn(
                  "block overflow-hidden rounded-md ring-2 ring-offset-2 transition",
                  i === index ? "ring-brand" : "opacity-75 ring-transparent hover:opacity-100",
                )}
              >
                <PropertyPhoto image={image} sizes="120px" className="h-16 w-24 sm:h-[72px] sm:w-[108px]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent variant="fullscreen" closeLabel="ปิดรูปภาพ">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">ใช้ปุ่มลูกศรซ้ายขวาเพื่อเปลี่ยนรูป</DialogDescription>
          <div className="flex h-16 shrink-0 items-center px-5 text-sm text-white/80 tabular-nums">
            {index + 1} / {count}
            <span className="ml-3 truncate text-white/60">{current.alt}</span>
          </div>
          <div className="relative flex-1">
            <PropertyPhoto
              key={`viewer-${current.src}-${index}`}
              image={current}
              sizes="100vw"
              className="absolute inset-0 bg-transparent"
              imageClassName="object-contain"
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label="รูปก่อนหน้า"
                  className={cn(arrow, "left-4 bg-white/15 text-white hover:bg-white/30")}
                >
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  aria-label="รูปถัดไป"
                  className={cn(arrow, "right-4 bg-white/15 text-white hover:bg-white/30")}
                >
                  <ChevronRight className="size-6" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          <ul className="flex shrink-0 justify-center gap-2 overflow-x-auto p-4">
            {images.map((image, i) => (
              <li key={`viewer-thumb-${i}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`รูปที่ ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "block overflow-hidden rounded-sm ring-2 transition",
                    i === index ? "ring-white" : "opacity-50 ring-transparent hover:opacity-90",
                  )}
                >
                  <PropertyPhoto image={image} sizes="96px" className="h-12 w-16 bg-white/10" />
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}
