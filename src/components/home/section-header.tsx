import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  id: string;
  title: string;
  description?: ReactNode;
  action?: { label: string; href: string };
  className?: string;
  children?: ReactNode;
}

export function SectionHeader({ id, title, description, action, className, children }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-[620px]">
        <h2 id={id} className="text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[32px]">
          {title}
        </h2>
        {description && <p className="mt-2 text-[16px] leading-relaxed text-slate">{description}</p>}
      </div>
      {children}
      {action && (
        <Link
          href={action.href}
          className="inline-flex h-11 shrink-0 items-center self-start text-[15px] font-medium text-brand-strong underline-offset-4 hover:underline md:self-auto"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
