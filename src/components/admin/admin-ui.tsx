"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { afterDecisionKeys } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

/** Underline tabs that live in the URL (`?tab=`), with a count after each label (E2, E4, E5). */
export function AdminTabs<T extends string>({
  label,
  tabs,
  current,
  href,
}: {
  label: string;
  tabs: { value: T; label: string; count?: number }[];
  current: T;
  href: (tab: T) => string;
}) {
  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-line">
      <ul className="flex gap-5">
        {tabs.map((t) => (
          <li key={t.value} className="shrink-0">
            <Link
              href={href(t.value)}
              aria-current={t.value === current ? "page" : undefined}
              className={cn(
                "relative inline-flex h-10 items-center gap-1.5 font-medium whitespace-nowrap text-slate hover:text-ink",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5",
                t.value === current && "font-semibold text-ink after:bg-brand",
              )}
            >
              {t.label}
              {t.count !== undefined && <span className="tabular-nums"> {t.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Refreshes what every review decision changes: the queue itself, sidebar counts, dashboard and audit log. */
export function useAfterDecision(...queues: (readonly unknown[])[]) {
  const client = useQueryClient();
  return () => {
    for (const queue of queues) client.invalidateQueries({ queryKey: queue });
    for (const key of afterDecisionKeys) client.invalidateQueries({ queryKey: key });
  };
}
