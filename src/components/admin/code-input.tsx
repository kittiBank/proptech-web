"use client";

import { normalizeTotp } from "@/lib/admin";
import { cn } from "@/lib/utils";

const LENGTH = 6;

interface CodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six digit boxes (E11). One real input sits on top of the boxes, so typing, pasting,
 * autofill (`one-time-code`) and screen readers all see a single field.
 */
export function CodeInput({ id, value, onChange, invalid, describedBy, disabled, autoFocus }: CodeInputProps) {
  const active = Math.min(value.length, LENGTH - 1);
  return (
    <div className="group relative">
      <div aria-hidden="true" className="grid grid-cols-6 gap-2">
        {Array.from({ length: LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex h-[52px] items-center justify-center rounded-md border bg-white text-[22px] font-semibold text-ink tabular-nums",
              invalid ? "border-danger" : "border-line-strong",
              // The box the next digit lands in, while the field has focus.
              "group-focus-within:data-[active=true]:border-2 group-focus-within:data-[active=true]:border-brand",
            )}
            data-active={i === active}
          >
            {value[i] ?? ""}
          </span>
        ))}
      </div>
      <input
        id={id}
        name="code"
        value={value}
        onChange={(e) => onChange(normalizeTotp(e.target.value))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={LENGTH}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        autoFocus={autoFocus}
        className="absolute inset-0 w-full cursor-text rounded-md bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent focus-visible:ring-3 focus-visible:ring-violet-100"
      />
    </div>
  );
}
