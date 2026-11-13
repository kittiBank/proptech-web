"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, ChevronRight, Eye, MapPin, Pin, SearchX } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { FavoriteButton } from "@/components/property/favorite-button";
import { PropertyTags } from "@/components/property/property-tags";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { propertyQueries } from "@/lib/api/queries";
import { formatListingPrice, formatNumber, formatRelativeDays } from "@/lib/format";
import { formatThaiDate } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { PropertyDetail } from "@/types/property";
import { AmenityList } from "./amenity-list";
import { ListingGallery } from "./listing-gallery";
import { KeyFacts, SpecSheet } from "./listing-facts";
import { LocationMap } from "./location-map";
import { NearbyListings } from "./nearby-listings";
import { PropertyDetailSkeleton } from "./property-detail-skeleton";
import { MobileContactBar, PosterCard } from "./poster-card";
import { listingIconButton, ShareMenu } from "./share-menu";
import { StationRoutes } from "./station-route";

function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("scroll-mt-24 border-t border-line pt-8", className)}>
      <h2 id={id} className="mb-5 text-xl font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 420;
  return (
    <div>
      <p
        className={cn(
          "max-w-[68ch] text-[16px] leading-[1.8] whitespace-pre-line text-ink",
          long && !expanded && "line-clamp-6",
        )}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 text-[15px] font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          {expanded ? "แสดงน้อยลง" : "อ่านรายละเอียดทั้งหมด"}
        </button>
      )}
    </div>
  );
}

function Breadcrumb({ property: p }: { property: PropertyDetail }) {
  const crumbs = [
    { label: "หน้าแรก", href: routes.home },
    { label: p.mode === "buy" ? "ซื้อ" : "เช่า", href: routes.search({ mode: p.mode }) },
    { label: propertyTypeLabels[p.type], href: routes.search({ mode: p.mode, type: p.type }) },
    {
      label: p.district.split(" ")[0],
      href: routes.search({ mode: p.mode, type: p.type, q: p.district.split(" ")[0] }),
    },
  ];
  return (
    <nav aria-label="เส้นทางหน้า" className="overflow-x-auto">
      <ol className="flex items-center gap-1.5 text-sm whitespace-nowrap text-slate">
        {crumbs.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            <Link href={c.href} className="hover:text-ink hover:underline">
              {c.label}
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </li>
        ))}
        <li aria-current="page" className="text-ink">
          {p.code}
        </li>
      </ol>
    </nav>
  );
}

function ListingHeader({ property: p }: { property: PropertyDetail }) {
  const pricePerSqm = p.mode === "buy" && p.type !== "land" ? Math.round(p.price / p.area) : undefined;
  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <PropertyTags mode={p.mode} type={p.type} />
            {p.isPinned && (
              <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-brand px-2 text-[13px] font-medium text-white">
                <Pin className="size-3.5 fill-white" aria-hidden="true" />
                ปักหมุด
              </span>
            )}
            {p.isVerified && (
              <span className="inline-flex h-6 items-center gap-1 rounded-sm px-1 text-[13px] font-medium text-brand-strong">
                <BadgeCheck className="size-4" aria-hidden="true" />
                ตรวจสอบเอกสารแล้ว
              </span>
            )}
          </div>
          <h1
            id="listing-title"
            className="text-[26px] leading-[1.3] font-semibold tracking-[-0.015em] text-ink sm:text-[32px]"
          >
            {p.title}
          </h1>
          <a href="#location" className="inline-flex items-start gap-1.5 text-[15px] text-slate hover:text-ink">
            <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              {[p.projectName, p.district].filter(Boolean).join(", ")}
              <span className="ml-2 text-brand-strong underline underline-offset-4">ดูแผนที่</span>
            </span>
          </a>
        </div>
        <div className="flex shrink-0 gap-2">
          <FavoriteButton propertyId={p.id} propertyTitle={p.title} className={listingIconButton} />
          <ShareMenu title={p.title} />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-[34px] leading-none font-semibold tracking-tight text-ink tabular-nums sm:text-[40px]">
            {formatListingPrice(p.price, p.mode)}
          </p>
          <p className="mt-2 text-[15px] text-slate tabular-nums">
            {pricePerSqm
              ? `฿${formatNumber(pricePerSqm)} ต่อ ตร.ม.`
              : p.depositMonths
                ? `เงินประกัน ${p.depositMonths} เดือน ค่าเช่าล่วงหน้า ${p.advanceMonths} เดือน`
                : p.landSize
                  ? `฿${formatNumber(Math.round(p.price / p.landSize))} ต่อ ตร.ว.`
                  : null}
            {p.commonFee ? `  ค่าส่วนกลาง ฿${formatNumber(p.commonFee)}/เดือน` : ""}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate">
          <li>รหัส {p.code}</li>
          <li>ลงประกาศ {formatRelativeDays(p.postedAt)}</li>
          <li>อัปเดต {formatThaiDate(p.updatedAt)}</li>
          {p.viewCount !== undefined && (
            <li className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="size-3.5" aria-hidden="true" />
              เข้าชม {formatNumber(p.viewCount)} ครั้ง
            </li>
          )}
        </ul>
      </div>
    </header>
  );
}

function NotFoundPanel() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-5 py-20">
      <SearchX className="size-10 text-brand" aria-hidden="true" />
      <div>
        <h1 className="text-[28px] font-semibold text-ink">ไม่พบประกาศนี้</h1>
        <p className="mt-2 max-w-[52ch] text-[16px] text-slate">
          ประกาศอาจถูกปิดไปแล้วหรือลิงก์ไม่ถูกต้อง ลองค้นหาทรัพย์ในย่านเดียวกันจากหน้าแรก
        </p>
      </div>
      <Button asChild size="lg">
        <Link href={routes.home}>กลับไปค้นหาประกาศ</Link>
      </Button>
    </Container>
  );
}

export function PropertyDetailView() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(propertyQueries.detail(slug));
  const property = data?.data;

  useEffect(() => {
    if (property) document.title = `${property.title} | PropertyHub`;
  }, [property]);

  if (isPending) return <PropertyDetailSkeleton />;
  if (isError && error instanceof ApiError && error.status === 404) return <NotFoundPanel />;
  if (isError || !property) {
    return (
      <Container className="py-16">
        <QueryError what="ประกาศ" onRetry={() => refetch()} retrying={isFetching} />
      </Container>
    );
  }

  const gallery = property.gallery?.length ? property.gallery : [property.image];

  return (
    <>
      <Container className="pt-5 pb-28 lg:pb-16">
        <Breadcrumb property={property} />

        <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <article aria-labelledby="listing-title" className="flex min-w-0 flex-col gap-8">
            <ListingGallery images={gallery} title={property.title} />
            <ListingHeader property={property} />
            <KeyFacts property={property} />

            <Section id="transit-title" title="การเดินทางไปรถไฟฟ้า">
              <StationRoutes stations={property.location.stations} />
            </Section>

            <Section id="description-title" title="รายละเอียด">
              <Description text={property.description} />
            </Section>

            <Section id="specs-title" title="ข้อมูลทรัพย์">
              <SpecSheet property={property} />
            </Section>

            {(property.features.length > 0 || property.facilities.length > 0) && (
              <Section id="amenities-title" title="สิ่งอำนวยความสะดวก">
                <div className="flex flex-col gap-7">
                  <AmenityList ids={property.features} label={property.type === "condo" ? "ภายในห้อง" : "ภายในบ้าน"} />
                  <AmenityList
                    ids={property.facilities}
                    label={property.projectName ? "ส่วนกลางโครงการ" : "ส่วนกลาง"}
                  />
                </div>
              </Section>
            )}

            <Section id="location-title" title="ทำเลที่ตั้งและสถานที่ใกล้เคียง">
              <div id="location" className="scroll-mt-28">
                <LocationMap property={property} />
              </div>
            </Section>
          </article>

          <div className="lg:sticky lg:top-[88px] lg:self-start">
            <PosterCard property={property} />
          </div>
        </div>
      </Container>

      <NearbyListings property={property} />
      <MobileContactBar property={property} />
    </>
  );
}
