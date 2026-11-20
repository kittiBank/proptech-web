"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/home/section-header";
import { routes } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  CalendarDays,
  Heart,
  House,
  LogIn,
  LogOut,
  MessageCircle,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { savedSearchesQuery, unreadCountsQuery } from "@/lib/api/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/query-state";
import { useFavorites } from "@/providers/favorites-store";
import { useSession, useSignOut } from "@/providers/session";

type Count = "favorites" | "savedSearches" | "messages" | "notifications";

const items: { label: string; href: string; icon: LucideIcon; count?: Count }[] = [
  { label: "โปรไฟล์และการตั้งค่า", href: routes.profile, icon: UserRound },
  { label: "รายการโปรด", href: routes.favorites, icon: Heart, count: "favorites" },
  { label: "การค้นหาที่บันทึกไว้", href: routes.savedSearches, icon: BellRing, count: "savedSearches" },
  { label: "นัดดูทรัพย์", href: routes.appointments, icon: CalendarDays },
  { label: "ข้อความ", href: routes.messages, icon: MessageCircle, count: "messages" },
  { label: "การแจ้งเตือน", href: routes.notifications, icon: Bell, count: "notifications" },
  { label: "สำหรับผู้ลงประกาศ", href: routes.dashboard, icon: House },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Account pages (B7–B9, B17): `mist` ground with a 240px menu on the left.
 * The menu collapses below 1000px; phones reach these pages from the bottom nav.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { count: favorites } = useFavorites();
  const { user, isPending } = useSession();
  const signOut = useSignOut();
  const signedIn = Boolean(user);
  const { data: saved } = useQuery({ ...savedSearchesQuery, enabled: signedIn });
  const { data: unread } = useQuery({ ...unreadCountsQuery, enabled: signedIn });
  const counts: Record<Count, number> = {
    favorites,
    savedSearches: saved?.data.length ?? 0,
    messages: unread?.messages ?? 0,
    notifications: unread?.notifications ?? 0,
  };

  return (
    <div className="bg-mist">
      <Container className="grid gap-8 py-6 min-[1000px]:grid-cols-[240px_minmax(0,1fr)] sm:py-8">
        <nav aria-label="บัญชีของฉัน" className="sticky top-24 hidden self-start min-[1000px]:block">
          <p className="mb-2 px-3 text-[13px] font-medium text-slate">บัญชีของฉัน</p>
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              const count = item.count && signedIn ? counts[item.count] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium text-ink transition-colors hover:bg-white",
                      active && "bg-white shadow-[inset_3px_0_0_var(--color-brand)]",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {item.label}
                    {count > 0 && (
                      <span className="ml-auto text-[13px] font-normal text-slate tabular-nums">{count}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          {signedIn && (
            <>
              <hr className="my-3 border-line" />
              <button
                type="button"
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-[15px] font-medium text-slate transition-colors hover:bg-white hover:text-ink"
              >
                <LogOut className="size-[18px]" aria-hidden="true" />
                ออกจากระบบ
              </button>
            </>
          )}
        </nav>
        <div className="min-w-0">
          {isPending ? (
            <div role="status" aria-label="กำลังโหลดบัญชี" className="flex flex-col gap-4">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : user ? (
            children
          ) : (
            <EmptyState
              icon={LogIn}
              title="เข้าสู่ระบบเพื่อดูบัญชีของคุณ"
              body="รายการโปรด การค้นหาที่บันทึกไว้ และนัดดูทรัพย์ จะอยู่ในบัญชีของคุณ เปิดดูได้จากทุกอุปกรณ์"
              action={
                <Button asChild size="lg">
                  <Link href={routes.login({ next: pathname })}>เข้าสู่ระบบ</Link>
                </Button>
              }
              secondary={
                <Link
                  href={routes.register(pathname)}
                  className="font-medium text-brand-strong underline-offset-4 hover:underline"
                >
                  สมัครสมาชิกฟรี
                </Link>
              }
              className="rounded-lg bg-white"
            />
          )}
        </div>
      </Container>
    </div>
  );
}
