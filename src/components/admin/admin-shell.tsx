"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChartLine,
  Flag,
  LayoutPanelTop,
  ListChecks,
  LockKeyhole,
  LogOut,
  PenLine,
  Search,
  ShieldX,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { inputClass } from "@/components/ui/field";
import { adminRoutes, canOpen, sectionHref, sectionOf } from "@/lib/admin";
import { adminApi, adminKeys, adminQueueCountsQuery, adminSessionQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { AdminSection, AdminUserDto } from "@/types/api";
import { AdminBrand } from "./admin-brand";

type QueueKey = "moderation" | "reports" | "kyc";

interface NavItem {
  section: AdminSection;
  label: string;
  icon: LucideIcon;
  queue?: QueueKey;
}

const groups: { label: string; items: NavItem[] }[] = [
  { label: "ภาพรวม", items: [{ section: "dashboard", label: "แดชบอร์ด", icon: ChartLine }] },
  {
    label: "งานตรวจ",
    items: [
      { section: "moderation", label: "ตรวจประกาศ", icon: ListChecks, queue: "moderation" },
      { section: "reports", label: "รายงานจากผู้ใช้", icon: Flag, queue: "reports" },
      { section: "kyc", label: "ยืนยันตัวตนนายหน้า", icon: BadgeCheck, queue: "kyc" },
    ],
  },
  {
    label: "ข้อมูล",
    items: [
      { section: "users", label: "ผู้ใช้", icon: Users },
      { section: "revenue", label: "รายได้และการชำระเงิน", icon: Wallet },
      { section: "promo-slots", label: "ช่องปักหมุดหน้าแรก", icon: LayoutPanelTop },
      { section: "cms", label: "บทความ", icon: PenLine },
    ],
  },
  { label: "ระบบ", items: [{ section: "roles", label: "สิทธิ์และบันทึกการใช้งาน", icon: LockKeyhole }] },
];

/** "Production", "Staging"… from `NEXT_PUBLIC_APP_ENV`; the mock build says so. */
const envLabel =
  process.env.NEXT_PUBLIC_APP_ENV?.trim() || (process.env.NEXT_PUBLIC_API_URL ? "Production" : "Mock API");

const clock = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

function Sidebar({ admin, current }: { admin: AdminUserDto; current: AdminSection }) {
  const router = useRouter();
  const client = useQueryClient();
  const { data: counts } = useQuery(adminQueueCountsQuery);
  const signOut = useMutation({
    mutationFn: adminApi.logout,
    onSettled: () => {
      client.removeQueries({ queryKey: adminKeys.all });
      client.setQueryData(adminKeys.session, null);
      router.replace(adminRoutes.login());
    },
  });

  return (
    <nav aria-label="เมนูแอดมิน" className="flex flex-col bg-ink px-2.5 py-4 text-[14px] lg:sticky lg:top-0 lg:h-dvh">
      <Link href={adminRoutes.dashboard} className="px-2.5 pb-2.5">
        <AdminBrand inverted />
      </Link>
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => {
          const items = group.items.filter((i) => canOpen(admin.role, i.section));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="mx-3 mt-3.5 mb-1 text-[11px] font-semibold tracking-[0.06em] text-[#A49DBD]">
                {group.label}
              </p>
              <ul className="flex flex-col gap-px">
                {items.map(({ section, label, icon: Icon, queue }) => {
                  const active = section === current;
                  const count = queue ? counts?.data[queue] : undefined;
                  return (
                    <li key={section}>
                      <Link
                        href={sectionHref[section]}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-[38px] items-center gap-2.5 rounded-md px-3 transition-colors",
                          active
                            ? "bg-[#3A2E78] font-semibold text-white"
                            : "text-line-strong hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {label}
                        {count !== undefined && count > 0 && (
                          <span className="ml-auto inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-tag-sale px-1.5 text-[11px] font-semibold text-white tabular-nums">
                            {count}
                            <span className="sr-only"> รายการรอ</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2.5 border-t border-[#3A2E78] px-3 pt-3 text-[13px] text-white">
        <Avatar name={admin.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{admin.name}</span>
          <span className="block truncate text-[11px] text-[#A49DBD]">{admin.title}</span>
        </span>
        <button
          type="button"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          aria-label="ออกจากระบบ"
          className="inline-flex size-9 items-center justify-center rounded-md text-line-strong hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function TopBar() {
  const router = useRouter();
  const now = useNow();
  return (
    <header className="flex h-14 items-center gap-3 border-b border-line bg-white px-4 lg:px-6">
      <form
        role="search"
        className="relative w-full max-w-[420px]"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          if (q) router.push(`${adminRoutes.users}?${new URLSearchParams({ q })}`);
        }}
      >
        <label htmlFor="admin-search" className="sr-only">
          ค้นหาทั้งระบบ
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate"
          aria-hidden="true"
        />
        <input
          id="admin-search"
          name="q"
          type="search"
          placeholder="ค้นหา รหัสประกาศ อีเมล เบอร์โทร หรือเลขที่ชำระเงิน"
          className={cn(inputClass, "h-9 pl-9 text-[13px]")}
        />
      </form>
      <p className="ml-auto shrink-0 text-xs whitespace-nowrap text-slate">
        <span className="font-medium text-ink">{envLabel}</span>
        {now !== null && <span className="max-md:hidden"> · {clock.format(now)}</span>}
      </p>
    </header>
  );
}

function Forbidden() {
  return (
    <div className="mx-auto flex max-w-[460px] flex-col items-center py-20 text-center">
      <ShieldX className="size-10 text-slate" aria-hidden="true" />
      <h1 className="mt-3 text-[22px] font-semibold text-ink">บทบาทของคุณเปิดหน้านี้ไม่ได้</h1>
      <p className="mt-1 text-slate">ขอสิทธิ์เพิ่มจาก Super admin ได้ที่หน้าสิทธิ์และบันทึกการใช้งาน</p>
      <Link
        href={adminRoutes.dashboard}
        className="mt-4 font-medium text-brand-strong underline-offset-4 hover:underline"
      >
        กลับแดชบอร์ด
      </Link>
    </div>
  );
}

/** Sends the visitor to the login page when the admin session is missing or has timed out. */
function useAdminGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const client = useQueryClient();
  const { data: admin, isPending, isError, refetch } = useQuery(adminSessionQuery);

  useEffect(() => {
    if (admin === null) router.replace(adminRoutes.login(pathname));
  }, [admin, pathname, router]);

  // Any admin request answered 401 means the session ended (idle 30 minutes): sign in again.
  useEffect(
    () =>
      client.getQueryCache().subscribe((event) => {
        const error = event.query.state.error;
        if (event.type !== "updated" || event.query.queryKey[0] !== "admin") return;
        if (error instanceof ApiError && error.status === 401) {
          client.setQueryData(adminKeys.session, null);
          router.replace(`${adminRoutes.login(window.location.pathname)}&reason=idle`);
        }
      }),
    [client, router],
  );

  return { admin, isPending, isError, refetch };
}

/** E1–E10 frame: dark grouped sidebar with queue counts, a top bar with search and the environment. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { admin, isError, refetch } = useAdminGuard();
  const section = sectionOf(pathname);

  if (isError) {
    return (
      <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-mist text-center">
        <p className="font-semibold text-ink">ตรวจสอบสิทธิ์ไม่สำเร็จ</p>
        <button type="button" onClick={() => refetch()} className="font-medium text-brand-strong underline">
          ลองอีกครั้ง
        </button>
      </main>
    );
  }

  if (!admin) {
    return (
      <div role="status" aria-label="กำลังโหลด" className="flex min-h-dvh">
        <div className="hidden w-[232px] bg-ink lg:block" />
        <div className="flex-1 bg-mist" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-mist text-[14px] text-ink lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* The cell stretches with the page so the dark column runs to the bottom; the nav sticks inside it. */}
      <div className="bg-ink">
        <Sidebar admin={admin} current={section} />
      </div>
      <div className="min-w-0">
        <TopBar />
        <main id="main" className="flex flex-col gap-4 px-4 pt-5 pb-12 lg:px-6">
          {canOpen(admin.role, section) ? children : <Forbidden />}
        </main>
      </div>
    </div>
  );
}

/** Page heading row used by every admin page. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
