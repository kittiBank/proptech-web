"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { NavItem } from "@/data/navigation";
import { useHomeSearch } from "@/providers/home-search-provider";

interface NavLinkProps {
  item: NavItem;
  className?: string;
  onNavigate?: () => void;
  children?: ReactNode;
}

/**
 * On the homepage, Buy/Rent switch the hero search tab instead of leaving the
 * page; elsewhere they behave as normal links.
 */
export function NavLink({ item, className, onNavigate, children }: NavLinkProps) {
  const search = useHomeSearch();

  return (
    <Link
      href={item.href}
      className={className}
      onClick={(e) => {
        if (item.action && search) {
          e.preventDefault();
          search.focusMode(item.action === "search-buy" ? "buy" : "rent");
        }
        onNavigate?.();
      }}
    >
      {children ?? item.label}
    </Link>
  );
}
