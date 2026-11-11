"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryErrorProps {
  /** What failed to load, e.g. "ประกาศไฮไลต์". */
  what: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}

/** Inline error panel for a section whose query failed. */
export function QueryError({ what, onRetry, retrying, className }: QueryErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-4 rounded-lg border border-dashed border-line-strong bg-white p-8 sm:p-10",
        className,
      )}
    >
      <TriangleAlert className="size-8 text-brand" aria-hidden="true" />
      <div>
        <p className="text-lg font-semibold text-ink">โหลด{what}ไม่สำเร็จ</p>
        <p className="mt-1 text-[15px] text-slate">การเชื่อมต่อขัดข้องชั่วคราว ลองใหม่อีกครั้ง</p>
      </div>
      <Button variant="outline" onClick={onRetry} disabled={retrying}>
        <RotateCw aria-hidden="true" className={cn(retrying && "animate-spin")} />
        ลองอีกครั้ง
      </Button>
    </div>
  );
}

/** Grey placeholder block; compose these into section-shaped skeletons. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-line", className)} />;
}

/** Placeholder for a grid of property/project cards while a query is pending. */
export function CardGridSkeleton({
  count,
  label,
  columns = 4,
  imageClassName = "aspect-[4/3]",
  className,
}: {
  count: number;
  label: string;
  /** Desktop columns, matching the grid it stands in for. */
  columns?: 3 | 4;
  imageClassName?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("grid gap-6 sm:grid-cols-2", columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
          <Skeleton className={cn("rounded-none", imageClassName)} />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
