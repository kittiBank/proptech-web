import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mark: a doorway cut into a block — a home and a listing tile at once. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#7047EB" />
      <path d="M11 25V15.5a5 5 0 0 1 10 0V25" fill="none" stroke="#fff" strokeWidth="3" />
      <rect x="7" y="24" width="18" height="3" fill="#fff" />
    </svg>
  );
}

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="PropertyHub หน้าแรก">
      <LogoMark />
      <span className={cn("text-[19px] font-semibold tracking-[-0.02em]", inverted ? "text-white" : "text-ink")}>
        Property<span className={inverted ? "text-violet-200" : "text-brand"}>Hub</span>
      </span>
    </Link>
  );
}
