"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

interface AuthSplitProps {
  /** Hero panel on the left (desktop only). */
  aside: { heading: ReactNode; body: string; perks?: string[]; line: "green" | "blue" };
  children: ReactNode;
}

const lineStroke = { green: "var(--color-bts-sukhumvit)", blue: "var(--color-mrt-blue)" };

/**
 * B1/B2: dark hero panel with a transit-line motif beside the form. Phones
 * (B6) drop the panel for a back button and the logo above the form.
 */
export function AuthSplit({ aside, children }: AuthSplitProps) {
  const router = useRouter();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(420px,560px)_1fr]">
      <aside className="relative hidden flex-col overflow-hidden bg-hero px-14 py-10 text-white lg:flex">
        <Logo inverted />
        <h1 className="mt-[120px] text-[40px] leading-tight font-semibold tracking-[-0.02em]">{aside.heading}</h1>
        <p className="mt-3.5 max-w-[40ch] text-[17px] leading-[1.7] text-white/80">{aside.body}</p>
        {aside.perks && (
          <ul className="mt-9 flex flex-col gap-3.5 text-[15px]">
            {aside.perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/12">
                  <Check className="size-[15px]" strokeWidth={2.5} aria-hidden="true" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        )}
        <svg aria-hidden="true" viewBox="0 0 560 260" className="absolute bottom-0 left-0 h-[260px] w-full">
          <path
            d="M-20 230 C 120 210, 200 120, 330 110 S 520 40, 600 20"
            fill="none"
            stroke={lineStroke[aside.line]}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="120" cy="200" r="9" fill="var(--color-hero)" stroke="#fff" strokeWidth="4" />
          <circle cx="330" cy="110" r="11" fill="var(--color-brand)" stroke="#fff" strokeWidth="4" />
          <circle cx="480" cy="62" r="9" fill="var(--color-hero)" stroke="#fff" strokeWidth="4" />
        </svg>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="flex h-14 items-center justify-between px-1 lg:hidden">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            aria-label="ย้อนกลับ"
            className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-mist"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
          <Logo />
          <span className="size-11" aria-hidden="true" />
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pt-4 pb-10 sm:px-10 lg:items-center lg:py-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** B3: one centred panel on `mist` with the logo above it (verify email, forgot and reset password). */
export function AuthCardPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center bg-mist px-4 py-8 sm:py-14">
      <Logo />
      <section
        className={cn(
          "mt-8 flex w-full max-w-[440px] flex-col gap-3.5 rounded-[10px] border border-line bg-white px-6 py-8 sm:px-7",
          className,
        )}
      >
        {children}
      </section>
    </main>
  );
}

/** Round icon badge at the top of a B3 panel. */
export function AuthBadge({
  tone = "brand",
  children,
}: {
  tone?: "brand" | "success" | "danger";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-14 items-center justify-center rounded-full [&_svg]:size-[26px]",
        tone === "brand" && "bg-brand-soft text-brand",
        tone === "success" && "bg-success-soft text-success",
        tone === "danger" && "bg-danger-soft text-danger",
      )}
    >
      {children}
    </span>
  );
}
