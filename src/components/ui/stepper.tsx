import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "upcoming";

export interface StepItem {
  id: string;
  label: string;
  state: StepState;
  /** Where a done step goes back to. Without it the step is shown but not clickable. */
  href?: string;
}

interface StepperProps {
  steps: StepItem[];
  /** Names the list, e.g. "ขั้นตอนการลงประกาศ". */
  label: string;
  className?: string;
}

/**
 * Horizontal stepper (C1–C5, C6, C16): done steps show a check and link back,
 * the current one has a ring and halo, upcoming ones are inert. The current
 * step carries `aria-current="step"`.
 */
export function Stepper({ steps, label, className }: StepperProps) {
  return (
    <ol aria-label={label} className={cn("flex items-center gap-3", className)}>
      {steps.map((s, i) => {
        const done = s.state === "done";
        const current = s.state === "current";
        const content = (
          <>
            <span
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white text-sm font-semibold",
                done && "border-brand bg-brand text-white",
                current && "border-2 border-brand text-violet-700 ring-4 ring-violet-100",
                s.state === "upcoming" && "border-line-strong text-slate",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span className="flex flex-col text-sm leading-tight">
              <small className="text-[11px] text-slate">ขั้นที่ {i + 1}</small>
              <span className={cn("font-medium", current && "font-semibold")}>{s.label}</span>
              {done && <span className="sr-only">(เสร็จแล้ว)</span>}
            </span>
          </>
        );
        // The rule into this step is filled when the step is done or at/behind the current step.
        const reached = s.state !== "upcoming" || steps.slice(i).some((n) => n.state === "current");
        return (
          <li key={s.id} className="contents">
            {i > 0 && (
              <span aria-hidden="true" className={cn("h-0.5 min-w-6 flex-1", reached ? "bg-brand" : "bg-line")} />
            )}
            {s.href && !current ? (
              <Link
                href={s.href}
                className="flex items-center gap-2.5 whitespace-nowrap text-ink hover:text-brand-strong"
              >
                {content}
              </Link>
            ) : (
              <span
                aria-current={current ? "step" : undefined}
                aria-disabled={!current || undefined}
                className={cn("flex items-center gap-2.5 whitespace-nowrap", current ? "text-ink" : "text-slate")}
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface SegmentStepperProps {
  /** Zero-based index of the current step. */
  current: number;
  total: number;
  className?: string;
}

/** Mobile variant (C7): segment bars exposed as a `progressbar` "ขั้นที่ X จาก N". */
export function SegmentStepper({ current, total, className }: SegmentStepperProps) {
  return (
    <div
      role="progressbar"
      aria-label={`ขั้นที่ ${current + 1} จาก ${total}`}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      className={cn("flex gap-1", className)}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full",
            i < current ? "bg-brand" : i === current ? "bg-violet-200" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
