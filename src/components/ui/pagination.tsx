"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  label?: string;
}

/** 1 … 4 5 6 … 12 — always shows first, last and the current page's neighbours. */
export function getPageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pageCount - 1) items.push("gap");
  items.push(pageCount);
  return items;
}

const itemBase =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-md px-3 text-[15px] tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40";

export function Pagination({ page, pageCount, onPageChange, className, label = "เลือกหน้า" }: PaginationProps) {
  if (pageCount <= 1) return null;
  const items = getPageItems(page, pageCount);

  return (
    <nav aria-label={label} className={cn("flex items-center justify-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={cn(itemBase, "gap-1 text-ink hover:bg-mist")}
        aria-label="หน้าก่อนหน้า"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">ก่อนหน้า</span>
      </button>

      <ul className="flex items-center gap-1">
        {items.map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-slate">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`หน้า ${item}`}
                className={cn(
                  itemBase,
                  item === page ? "bg-ink font-semibold text-white" : "text-ink hover:bg-mist",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        className={cn(itemBase, "gap-1 text-ink hover:bg-mist")}
        aria-label="หน้าถัดไป"
      >
        <span className="hidden sm:inline">ถัดไป</span>
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </nav>
  );
}
