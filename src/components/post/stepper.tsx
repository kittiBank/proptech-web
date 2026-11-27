import { SegmentStepper, Stepper as BaseStepper, type StepItem } from "@/components/ui/stepper";
import { postSteps, stepIndex } from "@/lib/post-wizard";
import type { PostStep } from "@/types/api";

interface StepperProps {
  hrefFor: (step: PostStep) => string;
  current: PostStep;
  completed: PostStep[];
  reachable: PostStep[];
}

/**
 * Post wizard stepper (C1–C5): done steps link back, the current one has a ring
 * and halo, later ones are inert. Steps that can be reached link even if not done.
 */
export function Stepper({ hrefFor, current, completed, reachable }: StepperProps) {
  const steps: StepItem[] = postSteps.map((s) => {
    const isCurrent = s.id === current;
    return {
      id: s.id,
      label: s.label,
      state: isCurrent ? "current" : completed.includes(s.id) ? "done" : "upcoming",
      href: !isCurrent && reachable.includes(s.id) ? hrefFor(s.id) : undefined,
    };
  });
  return <BaseStepper steps={steps} label="ขั้นตอนการลงประกาศ" />;
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
      <SegmentStepper current={index} total={postSteps.length} className="mt-3" />
    </div>
  );
}
