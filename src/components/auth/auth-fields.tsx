"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Info, X } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Field, FormAlert, fieldA11y, inputClass } from "@/components/ui/field";
import { API_BASE_URL, MOCK_API_BASE_PATH } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { passwordRules } from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";
import { useApplySession } from "@/providers/session";
import type { OAuthProvider, UserDto } from "@/types/api";

/**
 * Google and LINE buttons. The marks are placeholders until the official
 * assets are in (design handoff §8).
 */
export function SsoButtons({
  onSignedIn,
  compact = false,
}: {
  onSignedIn: (user: UserDto) => void;
  /** Side by side with short labels (register). */
  compact?: boolean;
}) {
  const apply = useApplySession();
  const mutation = useMutation({
    mutationFn: (provider: OAuthProvider) => api.oauthLogin(provider),
    onSuccess: ({ data }) => {
      apply(data);
      onSignedIn(data);
    },
  });
  const providers = [
    {
      id: "google" as const,
      name: "Google",
      mark: (
        <span className="inline-flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-line-strong text-xs font-bold">
          G
        </span>
      ),
    },
    {
      id: "line" as const,
      name: "LINE",
      mark: (
        <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-[#06C755] text-xs font-bold text-white">
          L
        </span>
      ),
    },
  ];
  return (
    <div>
      <div className={cn("grid gap-2.5", compact && "grid-cols-2")}>
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(p.id)}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-line-strong bg-white text-[15px] font-medium text-ink transition-colors hover:border-ink disabled:opacity-60"
          >
            <span aria-hidden="true">{p.mark}</span>
            {compact ? p.name : `ดำเนินการต่อด้วย ${p.name}`}
          </button>
        ))}
      </div>
      {mutation.isError && <FormAlert className="mt-3">เชื่อมต่อบัญชีไม่สำเร็จ ลองอีกครั้ง หรือใช้อีเมล</FormAlert>}
    </div>
  );
}

export function OrDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[13px] text-slate before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
      {children}
    </div>
  );
}

interface PasswordFieldProps extends Omit<ComponentProps<"input">, "id" | "type"> {
  id: string;
  label: string;
  error?: string;
  labelAside?: ReactNode;
}

/** Password input with a show/hide toggle. */
export function PasswordField({ id, label, error, labelAside, className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label={label} error={error} labelAside={labelAside}>
      <div className="relative">
        <input
          {...fieldA11y(id, error)}
          type={visible ? "text" : "password"}
          className={cn(inputClass, "h-12 pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-slate hover:text-ink"
        >
          {visible ? (
            <EyeOff className="size-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="size-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>
    </Field>
  );
}

/** Four-bar strength meter plus the rule checklist under a new-password field (B2, B3). */
export function PasswordStrength({ password, email }: { password: string; email?: string }) {
  const rules = passwordRules(password, email);
  const score = password ? rules.filter((r) => r.ok).length : 0;
  return (
    <div className="-mt-1.5">
      <div
        role="meter"
        aria-label="ความแข็งแรงของรหัสผ่าน"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        className="grid grid-cols-4 gap-1"
      >
        {rules.map((r, i) => (
          <i key={r.id} className={cn("h-1 rounded-full", i < score ? "bg-brand" : "bg-line")} />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
        {rules.map((r) => (
          <li
            key={r.id}
            className={cn("flex items-center gap-2 text-[13px]", r.ok && password ? "text-success" : "text-slate")}
          >
            {r.ok && password ? (
              <Check className="size-[15px]" aria-hidden="true" />
            ) : (
              <X className="size-[15px]" aria-hidden="true" />
            )}
            {r.label}
            <span className="sr-only">{r.ok && password ? "ผ่าน" : "ยังไม่ผ่าน"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Checkbox({
  name,
  defaultChecked,
  error,
  children,
  className,
}: {
  name: string;
  defaultChecked?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="flex gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-brand"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${name}-error`} className="mt-1 pl-[30px] text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** True while requests go to the in-browser mock API. */
export const usingMockApi = API_BASE_URL === MOCK_API_BASE_PATH;

/** Dev-only shortcut shown while the mock API is active (no real email is sent). */
export function MockHint({ children }: { children: ReactNode }) {
  if (!usingMockApi) return null;
  return (
    <p className="flex gap-2 rounded-md border border-dashed border-line-strong bg-mist px-3 py-2.5 text-[13px] text-slate">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium text-ink">โหมดจำลอง:</span> {children}
      </span>
    </p>
  );
}
