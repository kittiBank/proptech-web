import type { ReactNode } from "react";
import { CircleAlert, Lightbulb, ShieldAlert, type LucideIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const callout = cva("flex gap-3 rounded-r-lg border-l-4 px-4 py-4 text-[15px] text-ink sm:px-5", {
  variants: {
    tone: {
      info: "border-brand bg-brand-soft",
      warning: "border-warning-line bg-warning-soft",
      danger: "border-danger-line bg-danger-soft",
    },
  },
});

const icons: Record<CalloutTone, { icon: LucideIcon; colour: string }> = {
  info: { icon: Lightbulb, colour: "text-brand-strong" },
  warning: { icon: ShieldAlert, colour: "text-warning" },
  danger: { icon: CircleAlert, colour: "text-danger" },
};

type CalloutTone = "info" | "warning" | "danger";

interface CalloutProps {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Replace the tone's default icon. */
  icon?: LucideIcon;
  /** `note` (default) is a plain aside; `alert` announces it, for messages that appear after an action. */
  role?: "note" | "alert";
  className?: string;
}

/** Tinted note with a left rule: tips (info), scam warnings (warning) and blocking problems (danger). */
export function Callout({ tone = "info", title, children, icon, role = "note", className }: CalloutProps) {
  const Icon = icon ?? icons[tone].icon;
  return (
    <div role={role} data-tone={tone} className={cn(callout({ tone }), className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", icons[tone].colour)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}
