"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Choice controls from the design handoff, all built on native radio and
 * checkbox inputs so arrow keys, Space and screen readers work without
 * extra code.
 */

const focusRing =
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand";

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

/** Buy/rent style toggle; the selected item is filled `brand` (C1, C3, D3). */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full overflow-x-auto rounded-lg border border-line-strong bg-white p-[3px]",
        className,
      )}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors sm:px-[18px]",
            focusRing,
            value === o.value ? "bg-brand text-white" : "text-ink hover:bg-mist",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

interface RadioCardProps {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Right-hand slot, e.g. a price. */
  aside?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Bordered option card; selected = 2px brand border on #FAF8FF (C1, C5, C14, D6). */
export function RadioCard({ name, checked, onChange, title, description, aside, disabled, className }: RadioCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-white px-4 py-3.5 transition-colors",
        focusRing,
        checked ? "border-2 border-brand bg-[#FAF8FF] px-[15px] py-[13px]" : "border-line-strong hover:border-ink",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 size-5 shrink-0 accent-brand"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-slate">{description}</span>}
      </span>
      {aside && <span className="shrink-0 font-semibold text-ink">{aside}</span>}
    </label>
  );
}

interface ChoiceChipProps {
  type?: "checkbox" | "radio";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  disabled?: boolean;
}

/** Pill chip; selected = ink fill (the design's `FilterChip on`). */
export function ChoiceChip({ type = "checkbox", name, checked, onChange, children, disabled }: ChoiceChipProps) {
  return (
    <label
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
        focusRing,
        checked ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:border-ink",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      {children}
    </label>
  );
}
