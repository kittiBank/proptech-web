import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** White settings card with an anchored heading (B7). */
export function SettingsSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24 rounded-[10px] border border-line bg-white p-5 sm:p-7", className)}
    >
      <h2 id={`${id}-title`} className="text-[19px] font-semibold text-ink">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-slate">{description}</p>}
      {children}
    </section>
  );
}

/** One line in a settings list: text on the left, an action on the right. */
export function SettingsRow({
  title,
  detail,
  leading,
  action,
  tone,
}: {
  title: ReactNode;
  detail?: ReactNode;
  leading?: ReactNode;
  action?: ReactNode;
  tone?: "danger";
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-4 first:border-t-0">
      {leading}
      <div className="min-w-[200px] flex-1">
        <p className={cn("font-medium", tone === "danger" ? "text-danger" : "text-ink")}>{title}</p>
        {detail && <p className="text-sm text-slate">{detail}</p>}
      </div>
      {action}
    </div>
  );
}
