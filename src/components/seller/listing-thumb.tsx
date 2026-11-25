import Link from "next/link";
import { House } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { routes } from "@/data/navigation";
import { cn } from "@/lib/utils";
import type { SellerListingDto } from "@/types/api";

/** Photo (or a placeholder for drafts without one) at a fixed size. */
export function ListingPhoto({ listing, className }: { listing: SellerListingDto; className?: string }) {
  if (listing.image) return <PropertyPhoto image={listing.image} sizes="96px" className={cn("rounded", className)} />;
  return (
    <span
      aria-hidden="true"
      className={cn("flex items-center justify-center rounded bg-brand-soft text-brand", className)}
    >
      <House className="size-5" />
    </span>
  );
}

/** Where the listing's title goes: the public page when live, the wizard for drafts. */
export function listingHref(l: SellerListingDto): string | undefined {
  if (l.status === "draft" && l.draftId && l.draftStep) return routes.postStep(l.draftId, l.draftStep);
  if (l.slug && (l.status === "published" || l.status === "expired")) return routes.property(l.slug);
  return undefined;
}

/** Thumbnail, title, deal tag and code: the "ประกาศ" cell (C8, C9). */
export function ListingCell({ listing }: { listing: SellerListingDto }) {
  const href = listingHref(listing);
  return (
    <span className="flex min-w-[220px] items-center gap-2.5">
      <ListingPhoto listing={listing} className="h-12 w-16 shrink-0" />
      <span className="min-w-0">
        {href ? (
          <Link href={href} className="line-clamp-1 font-semibold text-ink hover:text-brand-strong hover:underline">
            {listing.title}
          </Link>
        ) : (
          <span className="line-clamp-1 font-semibold text-ink">{listing.title}</span>
        )}
        <span className="text-xs text-slate">
          <span className={cn("font-semibold", listing.mode === "rent" ? "text-tag-rent" : "text-tag-sale")}>
            {listing.mode === "rent" ? "เช่า" : "ขาย"}
          </span>
          {" · "}
          {listing.code ?? "ยังไม่มีรหัส"}
        </span>
      </span>
    </span>
  );
}
