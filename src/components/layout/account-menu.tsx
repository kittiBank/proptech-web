"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, BellRing, Heart, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { routes } from "@/data/navigation";
import { displayName, useSession, useSignOut } from "@/providers/session";

const menuItem =
  "flex h-11 w-full items-center gap-2.5 rounded-sm px-3 text-left text-[15px] text-ink transition-colors hover:bg-mist";

/** Header: "เข้าสู่ระบบ" when signed out, the avatar pill and account menu when signed in. */
export function AccountMenu() {
  const { user, isPending } = useSession();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);

  if (isPending) return <span aria-hidden="true" className="hidden h-11 w-[104px] lg:block" />;

  if (!user) {
    return (
      <Button asChild variant="ghost" className="hidden lg:inline-flex">
        <Link href={routes.login()}>เข้าสู่ระบบ</Link>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hidden h-11 items-center gap-2 rounded-full border border-line-strong py-1 pr-3.5 pl-1 text-[15px] font-medium text-ink transition-colors hover:border-ink lg:inline-flex"
        >
          <Avatar name={displayName(user)} className="bg-brand" />
          {user.firstName}
          {/* The visible name leads the accessible name (WCAG 2.5.3); the rest is for screen readers. */}
          <span className="sr-only"> {user.lastName} เมนูบัญชี</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="border-b border-line px-3 pt-2 pb-3">
          <p className="font-semibold text-ink">{displayName(user)}</p>
          <p className="truncate text-sm text-slate">{user.email}</p>
        </div>
        <nav aria-label="บัญชีของฉัน" className="py-1">
          <Link href={routes.favorites} className={menuItem} onClick={() => setOpen(false)}>
            <Heart className="size-[18px] text-slate" aria-hidden="true" />
            รายการโปรด
          </Link>
          <Link href={routes.savedSearches} className={menuItem} onClick={() => setOpen(false)}>
            <BellRing className="size-[18px] text-slate" aria-hidden="true" />
            การค้นหาที่บันทึกไว้
          </Link>
          <Link href={routes.notifications} className={menuItem} onClick={() => setOpen(false)}>
            <Bell className="size-[18px] text-slate" aria-hidden="true" />
            การแจ้งเตือน
          </Link>
          <Link href={routes.profile} className={menuItem} onClick={() => setOpen(false)}>
            <UserRound className="size-[18px] text-slate" aria-hidden="true" />
            โปรไฟล์และการตั้งค่า
          </Link>
        </nav>
        <div className="border-t border-line pt-1">
          <button
            type="button"
            className={menuItem}
            disabled={signOut.isPending}
            onClick={() => signOut.mutate(undefined, { onSuccess: () => setOpen(false) })}
          >
            <LogOut className="size-[18px] text-slate" aria-hidden="true" />
            ออกจากระบบ
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
