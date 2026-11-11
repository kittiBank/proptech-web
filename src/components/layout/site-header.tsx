import Link from "next/link";
import { Button } from "@/components/ui/button";
import { mainNav, routes } from "@/data/navigation";
import { FavoritesLink } from "./favorites-link";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="เมนูหลัก" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.label}>
                <NavLink
                  item={item}
                  className="inline-flex h-11 items-center rounded-md px-3 text-[15px] font-medium text-ink transition-colors hover:bg-mist"
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <FavoritesLink />
          <Button asChild variant="ghost" className="hidden lg:inline-flex">
            <Link href={routes.login}>เข้าสู่ระบบ</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href={routes.postProperty}>ลงประกาศฟรี</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
      <HeaderSearch />
    </header>
  );
}
