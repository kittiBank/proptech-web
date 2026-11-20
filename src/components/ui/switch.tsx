"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  /** Keep the label for screen readers only, e.g. in a settings table whose headers name the column. */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

/** 44×26 on/off switch with its label (design handoff `Toggle`). */
export function Switch({ checked, onCheckedChange, label, hideLabel, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 text-sm font-medium text-ink disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-block h-[26px] w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-[18px]",
          )}
        />
      </span>
      {hideLabel ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}
