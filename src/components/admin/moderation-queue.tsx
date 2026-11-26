"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Play } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { adminRoutes } from "@/lib/admin";
import { formatSubmitted, formatWait, listingOverSla } from "@/lib/admin-queues";
import { adminApi, adminKeys, moderationListQuery } from "@/lib/api/admin";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import {
  MODERATION_PAGE_SIZE,
  type ListModerationQuery,
  type ModerationItemDto,
  type ModerationSort,
  type ModerationTab,
} from "@/types/api";
import { AdminTabs, useAfterDecision } from "./admin-ui";
import { AdminPageHeader } from "./admin-shell";

const tabLabels: Record<ModerationTab, string> = {
  pending: "รอตรวจ",
  returned: "ถูกตีกลับรอแก้",
  spot_check: "สุ่มตรวจซ้ำ",
  done: "ตรวจแล้ววันนี้",
};
const tabs: ModerationTab[] = ["pending", "returned", "spot_check", "done"];

type FlagFilter = NonNullable<ListModerationQuery["flags"]>;
type PosterFilter = NonNullable<ListModerationQuery["poster"]>;

const flagOptions: { value: FlagFilter; label: string }[] = [
  { value: "any", label: "ธง: ทั้งหมด" },
  { value: "flagged", label: "ธง: มีธงจากระบบ" },
  { value: "clean", label: "ธง: ไม่มีธง" },
];
const posterOptions: { value: PosterFilter; label: string }[] = [
  { value: "all", label: "ประเภทผู้ลง: ทั้งหมด" },
  { value: "agent", label: "ประเภทผู้ลง: นายหน้า" },
  { value: "owner", label: "ประเภทผู้ลง: เจ้าของ" },
];
const sortOptions: { value: ModerationSort; label: string }[] = [
  { value: "paid_first", label: "เรียง: จ่ายโปรโมตก่อน" },
  { value: "oldest", label: "เรียง: รอนานสุด" },
  { value: "newest", label: "เรียง: ส่งล่าสุด" },
];

function pick<T extends string>(value: string | null, options: { value: T }[], fallback: T): T {
  return options.some((o) => o.value === value) ? (value as T) : fallback;
}

/** E2 filters live in the URL so a link reproduces the view. */
function useQueueParams() {
  const params = useSearchParams();
  const tab = pick(
    params.get("tab"),
    tabs.map((value) => ({ value })),
    "pending",
  );
  const query: ListModerationQuery = {
    tab,
    flags: pick(params.get("flags"), flagOptions, "any"),
    poster: pick(params.get("poster"), posterOptions, "all"),
    paid: params.get("paid") === "1",
    sort: pick(params.get("sort"), sortOptions, "paid_first"),
    page: Math.max(1, Number(params.get("page")) || 1),
  };
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    // Any filter change starts again at page 1.
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    return `${adminRoutes.moderation}${qs ? `?${qs}` : ""}`;
  };
  return { query, href };
}

function Flags({ item }: { item: ModerationItemDto }) {
  if (item.flags.length === 0) return <span className="text-slate">-</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {item.flags.map((f) => (
        <StatusPill
          key={f.code}
          tone={f.tone === "danger" ? "danger" : f.tone === "warning" ? "warning" : "neutral"}
          className="h-5 px-2 text-[11px]"
        >
          {f.label}
        </StatusPill>
      ))}
    </span>
  );
}

const decisionTime = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

function columns(tab: ModerationTab, now: number | null): DataColumn<ModerationItemDto>[] {
  const decided = tab === "returned" || tab === "done";
  return [
    {
      id: "listing",
      header: "ประกาศ",
      cell: (i) => (
        <span className="flex items-center gap-2.5">
          <PropertyPhoto image={i.listing.image} sizes="56px" className="h-[42px] w-14 shrink-0 rounded" />
          <span className="min-w-0">
            <Link
              href={adminRoutes.listingReview(i.id)}
              className="block truncate font-semibold text-ink hover:text-brand-strong"
            >
              {i.listing.title}
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-slate">
              {i.id}
              {i.promotion && (
                <StatusPill tone="violet" className="h-5 px-2 text-[11px]">
                  {i.promotion.label} ฿{i.promotion.amount}
                </StatusPill>
              )}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: "poster",
      header: "ผู้ลงประกาศ",
      cell: (i) => (
        <>
          {i.poster.name}
          <span className="block text-xs text-slate">{i.poster.badge}</span>
        </>
      ),
    },
    { id: "flags", header: "System scan", cell: (i) => <Flags item={i} /> },
    {
      id: "submitted",
      header: "วันที่ส่งคำขอ",
      cell: (i) => <span className="whitespace-nowrap tabular-nums">{formatSubmitted(i.submittedAt)}</span>,
    },
    decided
      ? {
          id: "decision",
          header: "ผลการตรวจ",
          cell: (i) => (
            <>
              {i.decision?.outcome === "approved" ? "ผ่าน" : "ตีกลับ"}
              <span className="block text-xs text-slate">
                {i.decision?.by} · {i.decision && decisionTime.format(new Date(i.decision.at))}
              </span>
            </>
          ),
        }
      : {
          id: "wait",
          header: "เวลาที่รอ",
          cell: (i) => {
            if (now === null) return null;
            const late = listingOverSla(i.submittedAt, now);
            return (
              <span className={cn("whitespace-nowrap tabular-nums", late && "font-semibold text-danger")}>
                {formatWait(now - Date.parse(i.submittedAt))}
                {late && <span className="sr-only"> เกิน SLA</span>}
              </span>
            );
          },
        },
    {
      id: "action",
      header: <span className="sr-only">การดำเนินการ</span>,
      align: "right",
      cell: (i) => (
        <Button asChild variant="outline" size="sm" aria-label={`${decided ? "ดู" : "ตรวจ"} ${i.id}`}>
          <Link href={adminRoutes.listingReview(i.id)}>{decided ? "ดู" : "ตรวจ"}</Link>
        </Button>
      ),
    },
  ];
}

/** E2: listings the automated review passed to people. Paid promotions first, SLA 2 hours. */
export function ModerationQueue() {
  const router = useRouter();
  const now = useNow(60_000);
  const { query, href } = useQueueParams();
  const { data, isPending, isError, refetch, isFetching } = useQuery(moderationListQuery(query));
  const [selected, setSelected] = useState<string[]>([]);
  const refresh = useAfterDecision(adminKeys.moderation);
  const bulk = useMutation({
    mutationFn: (ids: string[]) => adminApi.bulkApprove({ ids }),
    onSuccess: ({ data: { approved } }) => {
      toast(`อนุมัติแล้ว ${approved} ประกาศ`);
      setSelected([]);
      refresh();
    },
    onError: () => toast("อนุมัติไม่สำเร็จ ลองอีกครั้ง"),
  });

  const tab = query.tab!;
  const reviewable = tab === "pending" || tab === "spot_check";
  const rows = data?.data ?? [];
  const first = rows[0];
  const meta = data?.meta;
  const from = meta && meta.total > 0 ? (meta.page - 1) * MODERATION_PAGE_SIZE + 1 : 0;
  const to = meta ? Math.min(meta.page * MODERATION_PAGE_SIZE, meta.total) : 0;

  return (
    <>
      <AdminPageHeader title="ตรวจประกาศ" description="ประกาศที่ระบบอัตโนมัติส่งต่อให้คนตรวจ" />
      <AdminTabs
        label="สถานะการตรวจ"
        current={tab}
        tabs={tabs.map((t) => ({ value: t, label: tabLabels[t], count: data?.counts[t] }))}
        href={(t) => `${adminRoutes.moderation}${t === "pending" ? "" : `?tab=${t}`}`}
      />

      {reviewable && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="ธง"
            value={query.flags!}
            options={flagOptions}
            onChange={(v) => router.replace(href({ flags: v === "any" ? undefined : v }))}
          />
          <FilterSelect
            label="ประเภทผู้ลง"
            value={query.poster!}
            options={posterOptions}
            onChange={(v) => router.replace(href({ poster: v === "all" ? undefined : v }))}
          />
          <Button
            variant="outline"
            size="sm"
            aria-pressed={query.paid}
            // Same 44px height and type as the filter dropdowns next to it.
            className={cn(
              "h-11 px-3.5 text-[14px] font-normal",
              query.paid && "border-ink bg-ink text-white hover:border-ink",
            )}
            onClick={() => router.replace(href({ paid: query.paid ? undefined : "1" }))}
          >
            มีโปรโมตจ่ายเงิน
          </Button>
          <FilterSelect
            label="เรียง"
            value={query.sort!}
            options={sortOptions}
            onChange={(v) => router.replace(href({ sort: v === "paid_first" ? undefined : v }))}
          />
          <span className="ml-auto text-[13px] text-slate">SLA 2 ชม. · ประกาศที่จ่ายโปรโมตขึ้นก่อน</span>
          {first && (
            <Button asChild size="sm">
              <Link href={adminRoutes.listingReview(first.id)}>
                <Play aria-hidden="true" />
                เริ่มตรวจต่อเนื่อง
              </Link>
            </Button>
          )}
        </div>
      )}

      {isPending ? (
        <div
          role="status"
          aria-label="กำลังโหลดคิวตรวจประกาศ"
          className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="คิวตรวจประกาศ" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <DataTable
          caption={`${tabLabels[tab]}: ประกาศ ${from} ถึง ${to} จาก ${meta?.total ?? 0}`}
          columns={columns(tab, now)}
          rows={rows}
          getRowId={(i) => i.id}
          rowLabel={(i) => `${i.id} ${i.listing.title}`}
          selection={tab === "pending" ? { selected, onChange: setSelected } : undefined}
          bulkActions={(ids) => (
            <Button size="sm" variant="success" disabled={bulk.isPending} onClick={() => bulk.mutate(ids)}>
              <Check aria-hidden="true" />
              ผ่านที่เลือก
            </Button>
          )}
          pagination={
            meta && meta.totalPages > 1
              ? {
                  page: meta.page,
                  pageCount: meta.totalPages,
                  onPageChange: (page) => router.replace(href({ page: String(page) })),
                }
              : undefined
          }
          footer={
            <span className="flex flex-wrap gap-x-4">
              <span className="tabular-nums">
                {from} ถึง {to} จาก {meta?.total ?? 0}
              </span>
              {reviewable && <span>คีย์ลัดในหน้าตรวจ: J/K เลื่อน · A ผ่าน · R ตีกลับ</span>}
            </span>
          }
          empty={<p className="py-10 text-center text-slate">ไม่มีประกาศในคิวนี้</p>}
        />
      )}
    </>
  );
}
