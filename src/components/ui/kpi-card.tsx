import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiDelta {
  /** Display text, e.g. "+12%" or "+3 จากสัปดาห์ก่อน". */
  text: string;
  direction: "up" | "down" | "flat";
  /** Whether "up" is good news (views) or bad (unanswered leads). Defaults to true. */
  upIsGood?: boolean;
}

interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  /** Small line under the value when there is no delta, e.g. "ใน 30 วัน". */
  hint?: ReactNode;
  className?: string;
}

const deltaWords = { up: "เพิ่มขึ้น", down: "ลดลง", flat: "คงที่" } as const;

/** Label, big tabular number and a delta line (C8, E1, E7, C15). */
export function KpiCard({ label, value, delta, hint, className }: KpiCardProps) {
  const good = delta && delta.direction !== "flat" && (delta.direction === "up") === (delta.upIsGood ?? true);
  const Icon = delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border border-line bg-white p-5", className)}>
      <p className="text-[13px] text-slate">{label}</p>
      <p className="text-[28px] leading-tight font-semibold text-ink tabular-nums">{value}</p>
      {delta ? (
        <p
          className={cn(
            "flex items-center gap-1 text-[13px] font-medium",
            delta.direction === "flat" ? "text-slate" : good ? "text-success" : "text-danger",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          <span className="sr-only">{deltaWords[delta.direction]} </span>
          {delta.text}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-slate">{hint}</p>
      ) : null}
    </div>
  );
}
