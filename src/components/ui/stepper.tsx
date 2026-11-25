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
  /** Second line in the vertical stepper, e.g. "อัปโหลดแล้ว 14 พ.ย.". */
  description?: string;
  /** Flags a step that needs fixing (the description turns amber). */
  attention?: boolean;
}

interface StepperProps {
  steps: StepItem[];
  /** Names the list, e.g. "ขั้นตอนการลงประกาศ". */
  label: string;
  /** `vertical` (C16) stacks the steps with a description under each label. */
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function StepDot({ step, index }: { step: StepItem; index: number }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white text-sm font-semibold",
        step.state === "done" && "border-brand bg-brand text-white",
        step.state === "current" && "border-2 border-brand text-violet-700 ring-4 ring-violet-100",
        step.state === "upcoming" && "border-line-strong text-slate",
      )}
    >
      {step.state === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : index + 1}
    </span>
  );
}

/** Vertical list: dot, label and description; done steps link back. */
function VerticalStepper({ steps, label, className }: Omit<StepperProps, "orientation">) {
  return (
    <ol aria-label={label} className={cn("flex flex-col", className)}>
      {steps.map((s, i) => {
        const current = s.state === "current";
        const content = (
          <>
            <StepDot step={s} index={i} />
            <span className="flex min-w-0 flex-col text-sm leading-snug">
              <span className={cn("text-ink", current || s.state === "done" ? "font-semibold" : "font-medium")}>
                {s.label}
              </span>
              {s.description && (
                <span className={cn("text-[13px]", s.attention ? "font-medium text-warning" : "text-slate")}>
                  {s.description}
                </span>
              )}
              {s.state === "done" && <span className="sr-only">(เสร็จแล้ว)</span>}
            </span>
          </>
        );
        return (
          <li key={s.id}>
            {s.href && !current ? (
              <Link href={s.href} className="flex gap-3 rounded-md py-2.5 hover:bg-mist">
                {content}
              </Link>
            ) : (
              <span aria-current={current ? "step" : undefined} className="flex gap-3 py-2.5">
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Stepper (C1–C5, C6 horizontal; C16 vertical): done steps show a check and link back,
 * the current one has a ring and halo, upcoming ones are inert. The current
 * step carries `aria-current="step"`.
 */
export function Stepper({ steps, label, orientation = "horizontal", className }: StepperProps) {
  if (orientation === "vertical") return <VerticalStepper steps={steps} label={label} className={className} />;
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
