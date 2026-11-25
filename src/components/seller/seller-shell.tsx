"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  ChartLine,
  CreditCard,
  House,
  Layers,
  LogIn,
  MessageCircle,
  Plus,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Logo, LogoMark } from "@/components/layout/logo";
import { SkipLink } from "@/components/layout/skip-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/query-state";
import { DomainStatus } from "@/components/ui/status-pill";
import { routes } from "@/data/navigation";
import { sellerQueries, unreadCountsQuery } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { formatThaiDate } from "@/lib/seller";
import { kycStatuses } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";

type Badge = "leads" | "messages";

const sections: { label: string; short: string; href: string; icon: LucideIcon; badge?: Badge }[] = [
  { label: "ภาพรวม", short: "ภาพรวม", href: routes.dashboard, icon: ChartLine },
  { label: "ประกาศของฉัน", short: "ประกาศ", href: routes.dashboardListings, icon: House },
  {
    label: "ผู้สนใจและนัดหมาย",
    short: "ผู้สนใจและนัด",
    href: routes.dashboardLeads,
    icon: CalendarDays,
    badge: "leads",
  },
  { label: "ข้อความ", short: "ข้อความ", href: routes.messages, icon: MessageCircle, badge: "messages" },
];

const more: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "แพ็กเกจและโปรโมต", href: routes.pricing, icon: Layers },
  { label: "การชำระเงินและใบกำกับภาษี", href: routes.billing, icon: CreditCard },
  { label: "ยืนยันตัวตนนายหน้า", href: routes.verify, icon: ShieldCheck },
];

/** Overview matches only itself; the others match their sub-pages too. */
const isActive = (pathname: string, href: string) =>
  href === routes.dashboard ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white tabular-nums">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

function PackageCard() {
  const { data } = useQuery(sellerQueries.account);
  if (!data) return <Skeleton className="mx-3 mb-4 h-[68px]" />;
  return (
    <div className="mb-2 border-b border-line px-3 pt-1 pb-3.5">
      <p className="text-xs text-slate">แพ็กเกจ</p>
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
        {data.planName}
        <DomainStatus info={kycStatuses[data.kycStatus]} className="h-5 px-2 text-[11px]" />
      </p>
      <p className="mt-0.5 text-xs text-slate">
        {data.autoRenew ? "ต่ออายุอัตโนมัติ" : "หมดอายุ"} {formatThaiDate(data.renewsAt)}
      </p>
    </div>
  );
}

/**
 * Lister workspace frame (C8–C10, C14–C16): its own header with the
 * "สำหรับผู้ลงประกาศ" badge, credit pill and "ลงประกาศใหม่", and a 248px sidebar
 * with the package card. Below lg the sidebar becomes a row of section tabs.
 */
export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isPending } = useSession();
  const signedIn = Boolean(user);
  const { data: account } = useQuery({ ...sellerQueries.account, enabled: signedIn });
  const { data: unread } = useQuery({ ...unreadCountsQuery, enabled: signedIn });
  const counts: Record<Badge, number> = {
    leads: account?.pendingViewings ?? 0,
    messages: unread?.messages ?? 0,
  };
  const badgeLabel: Record<Badge, string> = { leads: "คำขอรอยืนยัน", messages: "ยังไม่ได้อ่าน" };

  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:gap-4 lg:px-6">
          <Logo className="hidden lg:inline-flex" />
          <Link href="/" aria-label="PropertyHub หน้าแรก" className="lg:hidden">
            <LogoMark />
          </Link>
          <span className="inline-flex h-[22px] items-center rounded bg-hero px-2 text-xs font-semibold text-white">
            สำหรับผู้ลงประกาศ
          </span>
          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            {account && (
              <Link
                href={routes.billing}
                className="hidden h-9 items-center gap-1.5 rounded-full bg-mist px-3 text-[13px] text-ink hover:bg-violet-50 sm:inline-flex"
              >
                เครดิต <b className="font-semibold tabular-nums">฿{formatNumber(account.credit)}</b>
              </Link>
            )}
            <Button asChild size="base" className="hidden sm:inline-flex">
              <Link href={routes.postProperty}>
                <Plus aria-hidden="true" />
                ลงประกาศใหม่
              </Link>
            </Button>
            <AccountMenu />
          </div>
        </div>
        {signedIn && (
          <nav aria-label="เมนูผู้ลงประกาศ (มือถือ)" className="overflow-x-auto border-t border-line lg:hidden">
            <ul className="flex gap-5 px-4">
              {sections
                .filter((s) => s.href !== routes.messages)
                .map((s) => {
                  const active = isActive(pathname, s.href);
                  const count = s.badge ? counts[s.badge] : 0;
                  return (
                    <li key={s.href} className="shrink-0">
                      <Link
                        href={s.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative inline-flex h-11 items-center gap-1.5 text-sm font-medium whitespace-nowrap",
                          active
                            ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand"
                            : "text-slate",
                        )}
                      >
                        {s.short}
                        {count > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning tabular-nums">
                            {count}
                            <span className="sr-only"> {badgeLabel.leads}</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>
        )}
      </header>

      <div className="flex flex-1 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <nav
          aria-label="เมนูผู้ลงประกาศ"
          className="sticky top-16 hidden h-[calc(100dvh-64px)] flex-col gap-0.5 overflow-y-auto border-r border-line bg-white px-3 py-5 lg:flex"
        >
          {signedIn && <PackageCard />}
          <ul className="flex flex-col gap-0.5">
            {sections.map((s) => {
              const active = isActive(pathname, s.href);
              const Icon = s.icon;
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-[42px] items-center gap-3 rounded-md px-3 text-sm font-medium text-ink transition-colors hover:bg-mist",
                      active && "bg-brand-soft font-semibold text-violet-700 hover:bg-brand-soft",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {s.label}
                    {s.badge && signedIn && <CountBadge count={counts[s.badge]} label={badgeLabel[s.badge]} />}
                  </Link>
                </li>
              );
            })}
          </ul>
          <hr className="my-2.5 border-line" />
          <ul className="flex flex-col gap-0.5">
            {more.map((s) => {
              const Icon = s.icon;
              const active = isActive(pathname, s.href);
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-[42px] items-center gap-3 rounded-md px-3 text-sm font-medium text-ink transition-colors hover:bg-mist",
                      active && "bg-brand-soft font-semibold text-violet-700",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={routes.account}
            className="mt-auto flex h-[42px] items-center gap-2 rounded-md px-3 text-sm font-medium text-slate hover:bg-mist hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            กลับไปโหมดผู้หาบ้าน
          </Link>
        </nav>

        <main id="main" className="min-w-0 flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-8 lg:pt-7 lg:pb-16">
          {isPending ? (
            <div role="status" aria-label="กำลังโหลด" className="flex flex-col gap-4">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-72 w-full rounded-lg" />
            </div>
          ) : user ? (
            children
          ) : (
            <EmptyState
              icon={LogIn}
              title="เข้าสู่ระบบเพื่อจัดการประกาศ"
              body="ดูยอดเข้าชม ตอบคำขอนัดดูทรัพย์ และโปรโมตประกาศของคุณได้ในที่เดียว"
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
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
