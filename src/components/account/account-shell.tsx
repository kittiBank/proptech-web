"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/home/section-header";
import { routes } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/query-state";
import { useFavorites } from "@/providers/favorites-store";
import { useSession } from "@/providers/session";

const items = [
  { label: "โปรไฟล์และการตั้งค่า", href: "/account/profile" },
  { label: "รายการโปรด", href: routes.favorites, count: "favorites" as const },
  { label: "การค้นหาที่บันทึกไว้", href: "/account/saved-searches" },
  { label: "นัดดูทรัพย์", href: "/account/appointments" },
  { label: "ข้อความ", href: "/messages" },
  { label: "สำหรับผู้ลงประกาศ", href: "/dashboard" },
];

/**
 * Account pages (B7–B9, B17): `mist` ground with a 240px menu on the left.
 * The menu collapses below 1000px; phones reach these pages from the bottom nav.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { count } = useFavorites();
  const { user, isPending } = useSession();

  return (
    <div className="bg-mist">
      <Container className="grid gap-8 py-6 min-[1000px]:grid-cols-[240px_minmax(0,1fr)] sm:py-8">
        <nav aria-label="บัญชีของฉัน" className="hidden min-[1000px]:block">
          <p className="mb-2 px-3 text-[13px] font-medium text-slate">บัญชีของฉัน</p>
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = pathname === item.href;
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
                    {item.label}
                    {item.count === "favorites" && count > 0 && (
                      <span className="ml-auto text-[13px] font-normal text-slate tabular-nums">{count}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
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
