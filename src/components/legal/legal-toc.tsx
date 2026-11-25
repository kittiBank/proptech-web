"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { LegalSection } from "@/data/legal";

/** Section links for a legal page; the one being read is highlighted as you scroll. */
export function LegalToc({ sections }: { sections: LegalSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <ol className="flex flex-col">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            aria-current={active === s.id ? "location" : undefined}
            onClick={() => setActive(s.id)}
            className={cn(
              "block border-l-2 py-[7px] pl-3 text-sm",
              active === s.id ? "border-brand font-semibold text-ink" : "border-line text-slate hover:text-ink",
            )}
          >
            {i + 1}. {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}
