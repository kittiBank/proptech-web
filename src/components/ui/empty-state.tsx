import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  /** One clear next step, usually a primary button. */
  action?: ReactNode;
  /** Optional secondary link under the action. */
  secondary?: ReactNode;
  className?: string;
}

/** Icon, title, body, one primary action and an optional secondary link (B11, D11). */
export function EmptyState({ icon: Icon, title, body, action, secondary, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-14 text-center sm:py-20", className)}>
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-slate">{body}</p>
      {action && <div className="mt-6">{action}</div>}
      {secondary && <div className="mt-3 text-[15px]">{secondary}</div>}
    </div>
  );
}
