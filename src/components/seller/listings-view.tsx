"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Ellipsis, House, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { DomainStatus, StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { sellerQueries } from "@/lib/api/queries";
import { formatListingPrice, formatNumber, formatTimeAgo } from "@/lib/format";
import {
  canClose,
  canEdit,
  canPromote,
  canRenew,
  daysUntil,
  formatDayMonth,
  listingModeOptions,
  listingSortOptions,
  listingTabs,
  listingsCsv,
  parseListingsParams,
  promotionNote,
  toListingsApiQuery,
  toListingsQueryString,
  updateListingsState,
  type SellerListingsState,
} from "@/lib/seller";
import { listingStatuses } from "@/lib/status";
import { downloadText } from "@/lib/csv";
import { cn } from "@/lib/utils";
import type { SellerListingDto } from "@/types/api";
import { BoostDialog } from "./boost-dialog";
import { ListingCell, ListingPhoto, listingHref } from "./listing-thumb";
import { useBulkListings } from "./use-seller-actions";

const PAGE_SIZE = 10;

const noteTone = {
  violet: "",
  warning: "font-medium text-warning",
  danger: "text-danger",
  muted: "text-slate",
} as const;

function PromotionCell({ listing }: { listing: SellerListingDto }) {
  const note = promotionNote(listing);
  if (listing.status === "pending_review" && listing.submittedAt) {
    return <span className="text-[13px] text-slate">ส่งเมื่อ{formatTimeAgo(listing.submittedAt)}</span>;
  }
  if (!note) return <span className="text-slate">–</span>;
  if (note.tone === "violet") return <StatusPill tone="violet">{note.text}</StatusPill>;
  return <span className={cn("text-[13px]", noteTone[note.tone])}>{note.text}</span>;
}

interface RowActionsProps {
  listing: SellerListingDto;
  onBoost: (ids: string[]) => void;
  onRenew: (ids: string[]) => void;
  onClose: (ids: string[]) => void;
}

/** "⋯" menu: view, edit, renew, close. */
function MoreMenu({ listing, onRenew, onClose, className }: Omit<RowActionsProps, "onBoost"> & { className?: string }) {
  const [open, setOpen] = useState(false);
  const href = listingHref(listing);
  const item = "flex h-11 w-full items-center rounded-sm px-3 text-left text-[15px] text-ink hover:bg-mist";
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  if (!href && !canEdit(listing) && !canRenew(listing) && !canClose(listing)) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`ตัวเลือกเพิ่มเติม ${listing.title}`}
          className={cn("inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-mist", className)}
        >
          <Ellipsis className="size-5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        {href && (
          <Link href={href} className={item} onClick={() => setOpen(false)}>
            {listing.status === "draft" ? "ทำต่อ" : "ดูประกาศ"}
          </Link>
        )}
        {canEdit(listing) && (
          <Link href={routes.editListing(listing.id)} className={item} onClick={() => setOpen(false)}>
            แก้ไขประกาศ
          </Link>
        )}
        {canRenew(listing) && (
          <button type="button" className={item} onClick={run(() => onRenew([listing.id]))}>
            ต่ออายุ 60 วัน
          </button>
        )}
        {canClose(listing) && (
          <button type="button" className={cn(item, "text-danger")} onClick={run(() => onClose([listing.id]))}>
            ปิดประกาศ
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The one main button a row offers for its status. */
function PrimaryAction({
  listing,
  onBoost,
  onRenew,
  className,
}: Omit<RowActionsProps, "onClose"> & { className?: string }) {
  if (canPromote(listing)) {
    return (
      <Button variant="outline" size="sm" className={className} onClick={() => onBoost([listing.id])}>
        {listing.promotion ? "ดูผลโปรโมต" : "ดันประกาศ"}
        <span className="sr-only"> {listing.title}</span>
      </Button>
    );
  }
  if (listing.status === "rejected") {
    return (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href={routes.editListing(listing.id)}>
          แก้ไข<span className="sr-only"> {listing.title}</span>
        </Link>
      </Button>
    );
  }
  if (listing.status === "expired") {
    return (
      <Button variant="outline" size="sm" className={className} onClick={() => onRenew([listing.id])}>
        ต่ออายุ<span className="sr-only"> {listing.title}</span>
      </Button>
    );
  }
  const href = listingHref(listing);
  if (listing.status === "draft" && href) {
    return (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href={href}>
          ทำต่อ<span className="sr-only"> {listing.title}</span>
        </Link>
      </Button>
    );
  }
  return null;
}

function MobileCard({ listing, ...actions }: RowActionsProps) {
  const exp = listing.expiresAt;
  const soon = listing.status === "published" && exp && daysUntil(exp) <= 3;
  return (
    <li>
      <article aria-label={listing.title} className="border-b-8 border-mist bg-white px-4 py-3.5">
        <div className="flex gap-3">
          <ListingPhoto listing={listing} className="h-[72px] w-[92px] shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap gap-1.5">
              <DomainStatus info={listingStatuses[listing.status]} className="h-5 px-2 text-[11px]" />
              {listing.promotion && (
                <StatusPill tone="violet" className="h-5 px-2 text-[11px]">
                  {promotionNote(listing)?.text}
                </StatusPill>
              )}
            </p>
            <h2 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-ink">{listing.title}</h2>
            <p className="font-semibold text-ink tabular-nums">
              {listing.price ? formatListingPrice(listing.price, listing.mode) : "ยังไม่ใส่ราคา"}
            </p>
          </div>
        </div>
        {(listing.status === "published" || listing.status === "expired") && (
          <dl className="mt-2.5 grid grid-cols-3 text-xs text-slate">
            <div>
              <dt>เข้าชม</dt>
              <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatNumber(listing.views7d)}</dd>
            </div>
            <div>
              <dt>ผู้สนใจ</dt>
              <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatNumber(listing.leads)}</dd>
            </div>
            <div>
              <dt>หมดอายุ</dt>
              <dd className={cn("text-[15px] font-semibold tabular-nums", soon ? "text-warning" : "text-ink")}>
                {exp ? (soon ? `อีก ${daysUntil(exp)} วัน` : formatDayMonth(exp)) : "–"}
              </dd>
            </div>
          </dl>
        )}
        {listing.status !== "published" && listing.status !== "expired" && (
          <p className="mt-2 text-[13px]">
            <PromotionCell listing={listing} />
          </p>
        )}
        <div className="mt-2.5 flex gap-2">
          <PrimaryAction listing={listing} {...actions} className="h-[38px] flex-1" />
          {soon && canPromote(listing) && (
            <Button
              variant="outline"
              size="sm"
              className="h-[38px] flex-1"
              onClick={() => actions.onRenew([listing.id])}
            >
              ต่ออายุ
            </Button>
          )}
          <MoreMenu listing={listing} {...actions} className="size-[38px] border border-line-strong" />
        </div>
      </article>
    </li>
  );
}

/** `/dashboard/listings` (C9 desktop table, C11 phone cards, C14 boost dialog on `?boost=`). */
export function ListingsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const client = useQueryClient();
  const state = parseListingsParams(searchParams);
  const [selected, setSelected] = useState<string[]>([]);
  const [closing, setClosing] = useState<string[]>([]);
  const [query, setQuery] = useState(state.q);
  const [exporting, setExporting] = useState(false);
  const bulk = useBulkListings();

  const { data, isPending, isError, isFetching, refetch } = useQuery(
    sellerQueries.listings(toListingsApiQuery(state, PAGE_SIZE)),
  );
  const { data: account } = useQuery(sellerQueries.account);

  const go = (change: Partial<SellerListingsState>, mode: "push" | "replace" = "push") => {
    const qs = toListingsQueryString(updateListingsState(state, change));
    router[mode](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const setStatus = (status: SellerListingsState["status"]) => {
    setSelected([]);
    go({ status });
  };
  const search = (e: FormEvent) => {
    e.preventDefault();
    go({ q: query.trim() }, "replace");
  };
  const boost = (ids: string[]) => go({ boost: ids });
  const renew = (ids: string[]) => bulk.mutate({ ids, action: "renew" }, { onSuccess: () => setSelected([]) });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: SellerListingDto[] = [];
      for (let page = 1; ; page++) {
        const res = await client.fetchQuery(sellerQueries.listings({ ...toListingsApiQuery(state, 50), page }));
        rows.push(...res.data);
        if (page >= res.meta.totalPages) break;
      }
      downloadText("my-listings.csv", listingsCsv(rows));
    } catch {
      toast("ส่งออกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setExporting(false);
    }
  };

  const rows = data?.data ?? [];
  const counts = data?.counts;
  const promotable = (ids: string[]) => rows.filter((l) => ids.includes(l.id) && canPromote(l)).map((l) => l.id);

  const columns: DataColumn<SellerListingDto>[] = [
    { id: "listing", header: "ประกาศ", cell: (l) => <ListingCell listing={l} /> },
    { id: "status", header: "สถานะ", cell: (l) => <DomainStatus info={listingStatuses[l.status]} /> },
    {
      id: "price",
      header: "ราคา",
      align: "right",
      className: "whitespace-nowrap font-semibold",
      cell: (l) => (l.price ? formatListingPrice(l.price, l.mode) : "–"),
    },
    {
      id: "views",
      header: "เข้าชม 7 วัน",
      align: "right",
      cell: (l) => (l.status === "published" || l.status === "expired" ? formatNumber(l.views7d) : "–"),
    },
    {
      id: "leads",
      header: "ผู้สนใจ",
      align: "right",
      cell: (l) => (l.status === "published" || l.status === "expired" ? formatNumber(l.leads) : "–"),
    },
    {
      id: "expires",
      header: "หมดอายุ",
      className: "whitespace-nowrap tabular-nums",
      cell: (l) => (l.expiresAt ? formatDayMonth(l.expiresAt) : "–"),
    },
    { id: "promo", header: "โปรโมต", cell: (l) => <PromotionCell listing={l} /> },
    {
      id: "actions",
      header: <span className="sr-only">การจัดการ</span>,
      className: "whitespace-nowrap",
      cell: (l) => (
        <span className="flex items-center justify-end gap-1">
          <PrimaryAction listing={l} onBoost={boost} onRenew={renew} />
          <MoreMenu listing={l} onRenew={renew} onClose={setClosing} />
        </span>
      ),
    },
  ];

  const bulkButton =
    "h-9 rounded-md border border-violet-700 px-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50";
  const emptyState = (
    <EmptyState
      icon={House}
      title={state.q ? `ไม่พบประกาศที่ตรงกับ “${state.q}”` : "ยังไม่มีประกาศในหมวดนี้"}
      body={state.q ? "ลองค้นด้วยชื่ออื่น หรือรหัสประกาศ เช่น PH-1008" : "ลงประกาศใหม่ได้ฟรี ใช้เวลาไม่ถึง 10 นาที"}
      action={
        state.q ? (
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              go({ q: "" });
            }}
          >
            ล้างคำค้นหา
          </Button>
        ) : (
          <Button asChild>
            <Link href={routes.postProperty}>ลงประกาศใหม่</Link>
          </Button>
        )
      }
      className="py-10"
    />
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[28px]">ประกาศของฉัน</h1>
          {account && (
            <p className="mt-1 text-slate">
              ใช้โควตาแล้ว {formatNumber(account.usage.listings.used)} จาก {formatNumber(account.usage.listings.limit)}{" "}
              ประกาศ
            </p>
          )}
        </div>
        <div className="hidden gap-2 lg:flex">
          <Button variant="outline" size="base" onClick={exportCsv} disabled={exporting || !rows.length}>
            <Download aria-hidden="true" />
            {exporting ? "กำลังส่งออก…" : "ส่งออก CSV"}
          </Button>
          <Button asChild size="base">
            <Link href={routes.postProperty}>ลงประกาศใหม่</Link>
          </Button>
        </div>
      </div>

      {/* C11: 7-day totals and quota on phones. */}
      {data && account && (
        <dl className="grid grid-cols-3 rounded-lg border border-line bg-white py-2.5 text-center text-xs text-slate lg:hidden">
          <div>
            <dt>เข้าชม 7 วัน</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatNumber(data.totals.views7d)}</dd>
          </div>
          <div className="border-l border-line">
            <dt>ผู้สนใจ</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">{formatNumber(data.totals.leads)}</dd>
          </div>
          <div className="border-l border-line">
            <dt>โควตา</dt>
            <dd className="text-[15px] font-semibold text-ink tabular-nums">
              {account.usage.listings.used}/{account.usage.listings.limit}
            </dd>
          </div>
        </dl>
      )}

      <Tabs value={state.status} onValueChange={(v) => setStatus(v as SellerListingsState["status"])}>
        <TabsList aria-label="สถานะประกาศ" className="hidden gap-[22px] overflow-x-auto border-b border-line lg:flex">
          {listingTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="shrink-0 text-sm whitespace-nowrap">
              {t.label}
              {counts && <span className="font-normal tabular-nums">{formatNumber(counts[t.value])}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* C11 chips on phones. */}
        <div
          role="radiogroup"
          aria-label="สถานะประกาศ"
          className="relative -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:hidden"
        >
          {listingTabs.map((t) => (
            <ChoiceChip
              key={t.value}
              type="radio"
              name="listing-status"
              checked={state.status === t.value}
              onChange={() => setStatus(t.value)}
            >
              {t.short}
              {counts && <span className="tabular-nums">{counts[t.value]}</span>}
            </ChoiceChip>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <form role="search" onSubmit={search} className="relative w-full sm:w-[340px]">
            <Search className="absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-slate" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="ค้นหาจากชื่อหรือรหัสประกาศ"
              placeholder="ค้นหาจากชื่อหรือรหัสประกาศ"
              className="h-11 w-full rounded-md border border-line-strong bg-white pr-10 pl-10 text-[15px] text-ink placeholder:text-slate hover:border-ink [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => {
                  setQuery("");
                  go({ q: "" }, "replace");
                }}
                className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </form>
          <FilterSelect
            label="ประเภทดีล"
            value={state.mode}
            options={listingModeOptions}
            onChange={(mode) => go({ mode })}
          />
          <FilterSelect
            label="เรียงตาม"
            value={state.sort}
            options={listingSortOptions.map((o) => ({ ...o, label: `เรียง: ${o.label}` }))}
            onChange={(sort) => go({ sort })}
          />
        </div>

        <TabsContent value={state.status} className="mt-4">
          {isPending ? (
            <div role="status" aria-label="กำลังโหลดประกาศ" className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[72px] w-full" />
              ))}
            </div>
          ) : isError ? (
            <QueryError what="ประกาศของคุณ" onRetry={() => refetch()} retrying={isFetching} />
          ) : (
            <div className={cn("transition-opacity", isFetching && "opacity-60")}>
              <DataTable
                caption="ประกาศของฉัน"
                className="hidden lg:block"
                columns={columns}
                rows={rows}
                getRowId={(l) => l.id}
                rowLabel={(l) => l.title}
                selection={{ selected, onChange: setSelected }}
                bulkActions={(ids) => (
                  <>
                    <button
                      type="button"
                      className={bulkButton}
                      disabled={!promotable(ids).length}
                      onClick={() => boost(promotable(ids))}
                    >
                      ดันประกาศ
                    </button>
                    <button type="button" className={bulkButton} disabled={bulk.isPending} onClick={() => renew(ids)}>
                      ต่ออายุ
                    </button>
                    <button type="button" className={bulkButton} onClick={() => setClosing(ids)}>
                      ปิดประกาศ
                    </button>
                  </>
                )}
                pagination={{
                  page: data.meta.page,
                  pageCount: data.meta.totalPages,
                  onPageChange: (page) => go({ page }),
                }}
                footer={
                  data.meta.total > 0 &&
                  `แสดง ${(data.meta.page - 1) * data.meta.limit + 1} ถึง ${Math.min(data.meta.page * data.meta.limit, data.meta.total)} จาก ${formatNumber(data.meta.total)}`
                }
                empty={emptyState}
              />

              <div className="-mx-4 border-t border-line lg:hidden">
                {rows.length === 0 ? (
                  <div className="bg-white">{emptyState}</div>
                ) : (
                  <ul aria-label="ประกาศของฉัน">
                    {rows.map((l) => (
                      <MobileCard key={l.id} listing={l} onBoost={boost} onRenew={renew} onClose={setClosing} />
                    ))}
                  </ul>
                )}
                {data.meta.totalPages > 1 && (
                  <nav aria-label="เลือกหน้า" className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                    <Button
                      variant="outline"
                      size="base"
                      disabled={data.meta.page <= 1}
                      onClick={() => go({ page: data.meta.page - 1 })}
                    >
                      <ChevronLeft aria-hidden="true" />
                      ก่อนหน้า
                    </Button>
                    <span className="text-sm text-slate tabular-nums">
                      หน้า {data.meta.page} จาก {data.meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="base"
                      disabled={data.meta.page >= data.meta.totalPages}
                      onClick={() => go({ page: data.meta.page + 1 })}
                    >
                      ถัดไป
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </nav>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-[13px] text-slate">
        ปิดประกาศเมื่อขายหรือปล่อยเช่าแล้ว ผู้ที่บันทึกไว้จะได้รับแจ้ง และประกาศจะไม่นับในโควตา
      </p>

      <Link
        href={routes.postProperty}
        className="fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 inline-flex h-[52px] items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white shadow-[0_8px_24px_rgba(112,71,235,.35)] hover:bg-brand-strong lg:hidden"
      >
        <Plus className="size-5" aria-hidden="true" />
        ลงประกาศ
      </Link>

      <BoostDialog ids={state.boost} onClose={() => go({ boost: [] }, "replace")} onDone={() => setSelected([])} />

      <Dialog open={closing.length > 0} onOpenChange={(open) => !open && setClosing([])}>
        <DialogContent className="sm:w-[min(440px,calc(100vw-48px))]">
          <div className="p-6 pr-14">
            <DialogTitle className="text-xl font-semibold text-ink">ปิด {closing.length} ประกาศ?</DialogTitle>
            <DialogDescription className="mt-2 text-[15px] text-slate">
              ประกาศจะหายจากผลค้นหา ผู้ที่บันทึกไว้จะได้รับแจ้ง และไม่นับในโควตาอีก โปรโมตที่เหลือจะหยุดทันที
            </DialogDescription>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <Button variant="outline" size="base" onClick={() => setClosing([])}>
              ยกเลิก
            </Button>
            <Button
              variant="danger-solid"
              size="base"
              disabled={bulk.isPending}
              onClick={() =>
                bulk.mutate(
                  { ids: closing, action: "close" },
                  {
                    onSuccess: () => {
                      setClosing([]);
                      setSelected([]);
                    },
                  },
                )
              }
            >
              ปิดประกาศ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
