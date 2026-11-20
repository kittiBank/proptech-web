import type { ReactNode } from "react";
import { cva } from "class-variance-authority";
import type { StatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

const pill = cva(
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-mist text-slate",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        violet: "bg-violet-100 text-violet-700",
      },
    },
  },
);

const dot: Record<StatusTone, string> = {
  neutral: "bg-slate",
  success: "bg-success",
  warning: "bg-warning-line",
  danger: "bg-danger",
  violet: "bg-brand",
};

interface StatusPillProps {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

/**
 * Coloured status label (B17, C9, C10, E*). Pair with a table from
 * `lib/status.ts`: `<StatusPill {...listingStatuses[s]} />` style, or pass tone and text.
 * The text carries the meaning; colour is only a second cue.
 */
export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span data-tone={tone} className={cn(pill({ tone }), className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot[tone])} />
      {children}
    </span>
  );
}

/** Shorthand for a domain status entry: `<DomainStatus info={viewingStatuses.confirmed} />`. */
export function DomainStatus({ info, className }: { info: { label: string; tone: StatusTone }; className?: string }) {
  return (
    <StatusPill tone={info.tone} className={className}>
      {info.label}
    </StatusPill>
  );
}
