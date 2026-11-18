"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { routes } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { displayName, initial, useSession, useSignOut } from "@/providers/session";

/** Initial on a brand circle; stands in for a profile photo. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white",
        className,
      )}
    >
      {name}
    </span>
  );
}

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
          aria-label={`เมนูบัญชี: ${displayName(user)}`}
          className="hidden h-11 items-center gap-2 rounded-full border border-line-strong py-1 pr-3.5 pl-1 text-[15px] font-medium text-ink transition-colors hover:border-ink lg:inline-flex"
        >
          <Avatar name={initial(user)} />
          {user.firstName}
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
          <Link href="/account/profile" className={menuItem} onClick={() => setOpen(false)}>
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
