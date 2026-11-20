"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Search, UserRound, type LucideIcon } from "lucide-react";
import { routes } from "@/data/navigation";
import { unreadCountsQuery } from "@/lib/api/queries";
import { activeBottomTab, bottomNavHiddenOn, useBottomNavSuppressed, type BottomTab } from "@/lib/bottom-nav";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";

const tabs: { id: BottomTab; label: string; href: string; icon: LucideIcon }[] = [
  { id: "search", label: "ค้นหา", href: routes.search({ mode: "buy" }), icon: Search },
  { id: "favorites", label: "รายการโปรด", href: routes.favorites, icon: Heart },
  { id: "messages", label: "ข้อความ", href: routes.messages, icon: MessageCircle },
  { id: "account", label: "บัญชี", href: routes.account, icon: UserRound },
];

/** Badge text: 1–9, then "9+". */
const badgeText = (n: number) => (n > 9 ? "9+" : String(n));

/**
 * Phone bottom nav (64px + safe area, hidden from lg). Steps aside for chat
 * rooms and while a sheet, dialog or sticky action bar is on screen. A spacer
 * in the page flow keeps the footer from sitting under it.
 */
export function BottomNav() {
  const pathname = usePathname();
  const suppressed = useBottomNavSuppressed();
  const { user } = useSession();
  const { data: unread } = useQuery({ ...unreadCountsQuery, enabled: Boolean(user) });

  if (bottomNavHiddenOn(pathname) || suppressed) return null;
  const active = activeBottomTab(pathname);

  return (
    <>
      <div aria-hidden="true" className="h-[calc(64px+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label="เมนูล่าง"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid h-16 grid-cols-4">
          {tabs.map(({ id, label, href, icon: Icon }) => {
            const current = active === id;
            const count = id === "messages" ? (unread?.messages ?? 0) : 0;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] transition-colors focus-visible:-outline-offset-2",
                    current ? "font-semibold text-brand-strong" : "text-slate hover:text-ink",
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={current ? 2.25 : 2} aria-hidden="true" />
                  {label}
                  {count > 0 && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 left-[54%] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-tag-sale px-1 text-[10px] font-semibold text-white tabular-nums"
                      >
                        {badgeText(count)}
                      </span>
                      <span className="sr-only"> (ยังไม่ได้อ่าน {count})</span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
