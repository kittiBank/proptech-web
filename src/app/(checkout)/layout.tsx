import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { SkipLink } from "@/components/layout/skip-link";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Checkout (C13): a minimal header with no site navigation, so nothing pulls people away mid-payment. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex min-h-dvh flex-col bg-mist">
        <SkipLink />
        <header className="border-b border-line bg-white">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-8">
            <Logo />
            <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-slate">
              <LockKeyhole className="size-4" aria-hidden="true" />
              ชำระเงินอย่างปลอดภัย
            </span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1000px] flex-1 px-4 pt-6 pb-16 sm:px-8 sm:pt-9">
          {children}
        </main>
      </div>
    </QueryProvider>
  );
}
