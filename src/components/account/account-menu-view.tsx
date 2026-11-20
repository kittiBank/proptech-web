"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  CalendarDays,
  ChartLine,
  ChevronRight,
  CircleHelp,
  Columns2,
  Flag,
  Globe,
  LockKeyhole,
  LogOut,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { routes } from "@/data/navigation";
import { profileQuery, savedSearchesQuery, unreadCountsQuery } from "@/lib/api/queries";
import { profileCompleteness } from "@/lib/profile";
import { useMediaQuery } from "@/lib/use-media-query";
import { displayName, useSession, useSignOut } from "@/providers/session";
import { ProgressBar } from "./progress-bar";

/** Matches the AccountShell breakpoint where the sidebar appears. */
const DESKTOP = "(min-width: 1000px)";

const row =
  "flex min-h-[52px] w-full items-center gap-3.5 border-b border-line/60 px-4 text-left text-[15px] text-ink transition-colors hover:bg-mist";

function Row({
  href,
  icon: Icon,
  children,
  aside,
}: {
  href: string;
  icon: LucideIcon;
  children: string;
  aside?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className={row}>
        <Icon className="size-[22px] shrink-0" aria-hidden="true" />
        <span className="flex-1">{children}</span>
        {aside}
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `acct-${title}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="px-4 pt-5 pb-1.5 text-[13px] font-semibold text-slate">
        {title}
      </h2>
      <ul>{children}</ul>
    </section>
  );
}

/**
 * `/account` (B20): the phone account menu. On desktop the sidebar already
 * lists these pages, so the page forwards to the profile instead.
 */
export function AccountMenuView() {
  const router = useRouter();
  const desktop = useMediaQuery(DESKTOP);
  const { user } = useSession();
  const signOut = useSignOut();
  const { data: profile } = useQuery({ ...profileQuery, enabled: Boolean(user) });
  const { data: saved } = useQuery({ ...savedSearchesQuery, enabled: Boolean(user) });
  const { data: unread } = useQuery({ ...unreadCountsQuery, enabled: Boolean(user) });

  useEffect(() => {
    if (desktop) router.replace(routes.profile);
  }, [desktop, router]);

  if (!user || desktop) return null;
  const completeness = profile && profileCompleteness(profile);
  const notifications = unread?.notifications ?? 0;

  return (
    <div className="-mx-4 -mt-6 overflow-hidden bg-white sm:mx-0 sm:mt-0 sm:rounded-lg sm:border sm:border-line">
      <header className="border-b border-line bg-mist px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">บัญชี</h1>
          <Link
            href={routes.notifications}
            className="relative -mr-2.5 inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-white"
          >
            <Bell className="size-[22px]" aria-hidden="true" />
            <span className="sr-only">การแจ้งเตือน{notifications > 0 ? ` ${notifications} รายการใหม่` : ""}</span>
            {notifications > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 size-2.5 rounded-full border-2 border-mist bg-tag-sale"
              />
            )}
          </Link>
        </div>
        <Link href={routes.profile} className="mt-2 flex items-center gap-3.5 text-ink">
          <Avatar name={displayName(user)} src={profile?.avatarUrl} size="lg" className="size-[60px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold">{displayName(user)}</span>
            <span className="block truncate text-[13px] text-slate">{user.email}</span>
          </span>
          <ChevronRight className="size-[18px] text-slate" aria-hidden="true" />
        </Link>
        {completeness?.next && (
          <div className="mt-3.5 rounded-lg border border-line bg-white px-3 py-2.5">
            <p className="flex items-baseline justify-between gap-3 text-[13px]">
              <span>
                <span className="font-semibold">โปรไฟล์ครบ {completeness.percent}%</span> {completeness.next.label}
              </span>
              <Link href={`${routes.profile}#personal`} className="shrink-0 font-medium text-brand-strong">
                {completeness.next.cta}
              </Link>
            </p>
            <ProgressBar value={completeness.percent} label="ความครบถ้วนของโปรไฟล์" className="mt-1.5" />
          </div>
        )}
      </header>

      <Group title="กิจกรรมของฉัน">
        <Row href={routes.appointments} icon={CalendarDays}>
          นัดดูทรัพย์
        </Row>
        <Row
          href={routes.savedSearches}
          icon={BellRing}
          aside={saved && <span className="text-[13px] text-slate tabular-nums">{saved.data.length}</span>}
        >
          การค้นหาที่บันทึกไว้
        </Row>
        <Row href={routes.favorites} icon={Columns2}>
          เปรียบเทียบประกาศ
        </Row>
      </Group>

      <Group title="ขายหรือปล่อยเช่า">
        <li className="px-4 pb-1.5">
          <Link
            href={routes.postProperty}
            className="flex items-center gap-3.5 rounded-[10px] bg-hero p-3.5 text-white"
          >
            <span className="flex-1">
              <span className="block font-semibold">มีทรัพย์จะขายหรือปล่อยเช่า?</span>
              <span className="block text-[13px] text-violet-100">ลงประกาศฟรี 2 รายการ ใช้เวลาประมาณ 10 นาที</span>
            </span>
            <span className="inline-flex h-10 items-center rounded-md bg-white px-3.5 text-sm font-semibold text-hero">
              ลงประกาศ
            </span>
          </Link>
        </li>
        <Row
          href={routes.dashboard}
          icon={ChartLine}
          aside={<span className="text-right text-[13px] text-slate">สำหรับเจ้าของและนายหน้า</span>}
        >
          แดชบอร์ดผู้ลงประกาศ
        </Row>
      </Group>

      <Group title="การตั้งค่า">
        <Row href={`${routes.profile}#personal`} icon={UserRound}>
          ข้อมูลส่วนตัว
        </Row>
        <Row href={`${routes.profile}#security`} icon={LockKeyhole}>
          ความปลอดภัยและบัญชีที่เชื่อม
        </Row>
        <Row href={`${routes.profile}#notifications`} icon={Bell}>
          ตั้งค่าการแจ้งเตือน
        </Row>
        <Row
          href={`${routes.profile}#personal`}
          icon={Globe}
          aside={<span className="text-[13px] text-slate">{profile?.language === "en" ? "English" : "ไทย"}</span>}
        >
          ภาษา
        </Row>
      </Group>

      <Group title="ช่วยเหลือ">
        <Row href="/help" icon={CircleHelp}>
          ศูนย์ช่วยเหลือ
        </Row>
        <Row href="/help/report" icon={Flag}>
          แจ้งประกาศไม่เหมาะสม
        </Row>
        <li>
          <button
            type="button"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            className={`${row} border-b-0 text-slate`}
          >
            <LogOut className="size-[22px] shrink-0" aria-hidden="true" />
            ออกจากระบบ
          </button>
        </li>
      </Group>
    </div>
  );
}
