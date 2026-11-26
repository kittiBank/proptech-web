import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

/** Logo plus the red "ADMIN" tag, so staff never mistake the admin app for the public site. */
export function AdminBrand({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-semibold", inverted ? "text-white" : "text-ink", className)}
    >
      <LogoMark className="size-7" />
      PropertyHub
      <span className="rounded-[3px] bg-tag-sale px-1.5 py-px text-[10px] font-semibold tracking-wide text-white">
        ADMIN
      </span>
    </span>
  );
}
