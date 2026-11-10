"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { contact, mainNav, routes } from "@/data/navigation";
import { LogoMark } from "./logo";
import { NavLink } from "./nav-link";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="เปิดเมนู">
          <Menu className="!size-6" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby="mobile-nav-desc">
        <div className="flex h-[68px] items-center gap-2.5 border-b border-line px-5">
          <LogoMark />
          <SheetTitle className="text-[17px] font-semibold text-ink">เมนู</SheetTitle>
        </div>
        <SheetDescription id="mobile-nav-desc" className="sr-only">
          ลิงก์หลักของ PropertyHub
        </SheetDescription>

        <nav aria-label="เมนูหลัก" className="flex-1 overflow-y-auto px-5 py-3">
          <ul>
            {mainNav.map((item) => (
              <li key={item.label} className="border-b border-line">
                <NavLink item={item} onNavigate={close} className="flex h-14 items-center text-[17px] font-medium text-ink">
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="border-b border-line">
              <Link href="/favorites" onClick={close} className="flex h-14 items-center text-[17px] font-medium text-ink">
                รายการโปรด
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3 border-t border-line p-5">
          <Button asChild size="lg">
            <Link href={routes.postProperty} onClick={close}>
              ลงประกาศฟรี
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={routes.login} onClick={close}>
              เข้าสู่ระบบ
            </Link>
          </Button>
          <p className="pt-2 text-sm text-slate">
            สอบถาม {contact.phone} ({contact.hours})
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
