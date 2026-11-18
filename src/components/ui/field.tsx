import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Input styles shared by text inputs, selects and textareas. Errors use the
 * `danger` border with a 3px `danger-soft` ring (design handoff §3).
 */
export const inputClass =
  "w-full rounded-md border border-line-strong bg-white px-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate/70 focus:border-brand focus:ring-3 focus:ring-violet-100 disabled:bg-mist disabled:text-slate aria-[invalid=true]:border-danger aria-[invalid=true]:ring-3 aria-[invalid=true]:ring-danger-soft";

interface FieldProps {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  /** Extra content next to the label, e.g. a "forgot password" link. */
  labelAside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Label above, control, then the error (or hint) below. Wire the control with `fieldA11y`. */
export function Field({ id, label, hint, error, labelAside, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {labelAside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-invalid` and `aria-describedby` for a control inside `Field`. */
export function fieldA11y(id: string, error?: string, hint?: React.ReactNode) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

interface TextFieldProps extends Omit<React.ComponentProps<"input">, "id"> {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  labelAside?: React.ReactNode;
  /** Unit shown inside the right edge, e.g. "ตร.ม.", "฿" or "%". */
  suffix?: string;
  fieldClassName?: string;
}

export function TextField({
  id,
  label,
  hint,
  error,
  labelAside,
  suffix,
  className,
  fieldClassName,
  ...props
}: TextFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} labelAside={labelAside} className={fieldClassName}>
      <div className="relative">
        <input
          {...fieldA11y(id, error, hint)}
          className={cn(inputClass, "h-12", suffix && "pr-14", className)}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[15px] text-slate">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

/** Native `<select>` styled like the inputs; best for forms (mobile pickers, autofill). */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClass, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate"
        aria-hidden="true"
      />
    </div>
  );
}

/** Banner for a form-level error (wrong password, server failure). */
export function FormAlert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-2.5 rounded-md border border-danger-line bg-danger-soft px-3.5 py-3 text-sm text-danger",
        className,
      )}
    >
      {children}
    </div>
  );
}
