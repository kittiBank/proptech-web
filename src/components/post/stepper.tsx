import Link from "next/link";
import { Check } from "lucide-react";
import { routes } from "@/data/navigation";
import { postSteps, stepIndex } from "@/lib/post-wizard";
import { cn } from "@/lib/utils";
import type { PostStep } from "@/types/api";

interface StepperProps {
  draftId: string;
  current: PostStep;
  completed: PostStep[];
  reachable: PostStep[];
}

/**
 * Horizontal stepper (C1–C5): done steps are links with a check, the current
 * one has a ring and halo, later ones are inert.
 */
export function Stepper({ draftId, current, completed, reachable }: StepperProps) {
  return (
    <ol aria-label="ขั้นตอนการลงประกาศ" className="flex items-center gap-3">
      {postSteps.map((s, i) => {
        const isCurrent = s.id === current;
        const done = completed.includes(s.id) && !isCurrent;
        const canOpen = !isCurrent && reachable.includes(s.id);
        const content = (
          <>
            <span
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white text-sm font-semibold",
                done && "border-brand bg-brand text-white",
                isCurrent && "border-2 border-brand text-violet-700 ring-4 ring-violet-100",
                !done && !isCurrent && "border-line-strong text-slate",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span className="flex flex-col text-sm leading-tight">
              <small className="text-[11px] text-slate">ขั้นที่ {i + 1}</small>
              <span className={cn("font-medium", isCurrent && "font-semibold")}>{s.label}</span>
              {done && <span className="sr-only">(เสร็จแล้ว)</span>}
            </span>
          </>
        );
        return (
          <li key={s.id} className="contents">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 min-w-6 flex-1",
                  stepIndex(current) >= i || completed.includes(s.id) ? "bg-brand" : "bg-line",
                )}
              />
            )}
            {canOpen ? (
              <Link
                href={routes.postStep(draftId, s.id)}
                className="flex items-center gap-2.5 whitespace-nowrap text-ink hover:text-brand-strong"
              >
                {content}
              </Link>
            ) : (
              <span
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={!isCurrent || undefined}
                className={cn("flex items-center gap-2.5 whitespace-nowrap", isCurrent ? "text-ink" : "text-slate")}
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

/** C7: five segment bars with "ขั้นที่ X จาก 5" for phones. */
export function MobileStepper({ current }: { current: PostStep }) {
  const index = stepIndex(current);
  const next = postSteps[index + 1];
  return (
    <div>
      <p className="text-[13px] text-slate">
        ขั้นที่ {index + 1} จาก {postSteps.length}
        {next && `  ถัดไป: ${next.label}`}
      </p>
      <h1 className="mt-0.5 text-[22px] font-semibold text-ink">{postSteps[index].label}</h1>
      <div
        role="progressbar"
        aria-label={`ขั้นที่ ${index + 1} จาก ${postSteps.length}`}
        aria-valuemin={1}
        aria-valuemax={postSteps.length}
        aria-valuenow={index + 1}
        className="mt-3 grid grid-cols-5 gap-1"
      >
        {postSteps.map((s, i) => (
          <span
            key={s.id}
            className={cn("h-1 rounded-full", i < index ? "bg-brand" : i === index ? "bg-violet-200" : "bg-line")}
          />
        ))}
      </div>
    </div>
  );
}
