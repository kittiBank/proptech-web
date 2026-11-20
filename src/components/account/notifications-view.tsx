"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BadgePercent, CalendarCheck, Building2, CircleOff, Sparkles, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { api } from "@/lib/api/endpoints";
import { notificationsQuery, queryKeys } from "@/lib/api/queries";
import { bangkokDay, formatShortStamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ListNotificationsResponse, NotificationDto, NotificationKind } from "@/types/api";

const filters: { value: NotificationKind | "all"; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "price_drop", label: "ราคาลด" },
  { value: "viewing", label: "นัดหมาย" },
  { value: "new_match", label: "ประกาศใหม่" },
];

const kindStyle: Record<NotificationKind, { icon: LucideIcon; className: string; label: string }> = {
  price_drop: { icon: BadgePercent, className: "bg-danger-soft text-danger", label: "ราคาลด" },
  viewing: { icon: CalendarCheck, className: "bg-success-soft text-success", label: "นัดหมาย" },
  new_match: { icon: Sparkles, className: "bg-brand-soft text-violet-700", label: "ประกาศใหม่" },
  listing_closed: { icon: CircleOff, className: "bg-mist text-slate", label: "ประกาศถูกปิด" },
  new_project: { icon: Building2, className: "bg-brand-soft text-violet-700", label: "โครงการใหม่" },
};

/** Marks read in the cache first so the dot disappears on tap, and refreshes the badge counts. */
function useReadActions() {
  const client = useQueryClient();
  const markInCache = (match: (n: NotificationDto) => boolean) =>
    client.setQueriesData<ListNotificationsResponse>({ queryKey: queryKeys.notifications.all }, (old) =>
      old ? { data: old.data.map((n) => (match(n) ? { ...n, read: true } : n)) } : old,
    );
  const refresh = () => {
    client.invalidateQueries({ queryKey: queryKeys.unreadCounts });
    client.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };

  const readOne = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onMutate: (id) => markInCache((n) => n.id === id),
    onSettled: refresh,
  });
  const readAll = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onMutate: () => markInCache(() => true),
    onSuccess: () => toast("อ่านการแจ้งเตือนทั้งหมดแล้ว"),
    onError: () => toast("ทำรายการไม่สำเร็จ ลองอีกครั้ง"),
    onSettled: refresh,
  });
  return { readOne, readAll };
}

function NotificationItem({ n, onOpen }: { n: NotificationDto; onOpen: () => void }) {
  const { icon: Icon, className, label } = kindStyle[n.kind];
  return (
    <li>
      <Link
        href={n.href}
        onClick={() => !n.read && onOpen()}
        className={cn(
          "flex gap-3 border-b border-line px-4 py-3.5 text-ink transition-colors hover:bg-mist focus-visible:-outline-offset-2",
          !n.read && "bg-[#FAF8FF]",
        )}
      >
        <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full", className)}>
          <Icon className="size-5" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm", !n.read && "font-semibold")}>{n.title}</span>
          <span className="block text-[13px] text-slate">{n.detail}</span>
          <span className="mt-0.5 block text-xs text-slate">
            <time dateTime={n.createdAt}>{formatShortStamp(n.createdAt)}</time>
          </span>
        </span>
        {!n.read && (
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand">
            <span className="sr-only">ยังไม่อ่าน</span>
          </span>
        )}
      </Link>
    </li>
  );
}

function Group({ title, items, onOpen }: { title: string; items: NotificationDto[]; onOpen: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="px-4 pt-3.5 pb-1.5 text-[13px] font-semibold text-slate">{title}</h2>
      <ul>
        {items.map((n) => (
          <NotificationItem key={n.id} n={n} onOpen={() => onOpen(n.id)} />
        ))}
      </ul>
    </section>
  );
}

/** `/notifications` (B19): price drops, viewings and new matches; unread first in tint, mark all read. */
export function NotificationsView() {
  const [filter, setFilter] = useState<NotificationKind | "all">("all");
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useQuery(
    notificationsQuery(filter === "all" ? undefined : filter),
  );
  const { readOne, readAll } = useReadActions();
  const items = data?.data ?? [];
  const today = bangkokDay(new Date());
  const todays = items.filter((n) => bangkokDay(new Date(n.createdAt)) === today);
  const earlier = items.filter((n) => bangkokDay(new Date(n.createdAt)) !== today);
  const unread = items.some((n) => !n.read);

  return (
    <div className="-mx-4 -mt-6 bg-white sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-lg sm:border sm:border-line">
      <div className="flex items-center gap-2 px-4 pt-3 sm:pt-5">
        <h1 className="flex-1 text-lg font-semibold text-ink sm:text-[22px]">การแจ้งเตือน</h1>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 text-brand-strong"
          onClick={() => readAll.mutate()}
          disabled={!unread || readAll.isPending}
        >
          อ่านทั้งหมด
        </Button>
      </div>
      <div
        role="group"
        aria-label="กรองการแจ้งเตือน"
        className="flex gap-1.5 overflow-x-auto border-b border-line px-4 pt-2 pb-3"
      >
        {filters.map((f) => (
          <ChoiceChip
            key={f.value}
            type="radio"
            name="notification-filter"
            checked={filter === f.value}
            onChange={() => setFilter(f.value)}
          >
            {f.label}
          </ChoiceChip>
        ))}
      </div>

      {isPending ? (
        <div role="status" aria-label="กำลังโหลดการแจ้งเตือน" className="flex flex-col gap-2 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="การแจ้งเตือน" onRetry={() => refetch()} retrying={isFetching} className="m-4" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "all" ? "ยังไม่มีการแจ้งเตือน" : "ไม่มีการแจ้งเตือนในหมวดนี้"}
          body="เราจะแจ้งที่นี่เมื่อราคาลด มีประกาศใหม่ตรงการค้นหา หรือผู้ลงประกาศตอบนัดหมาย"
        />
      ) : (
        <div aria-busy={isPlaceholderData} className={cn(isPlaceholderData && "opacity-60")}>
          <Group title="วันนี้" items={todays} onOpen={(id) => readOne.mutate(id)} />
          <Group title="ก่อนหน้านี้" items={earlier} onOpen={(id) => readOne.mutate(id)} />
        </div>
      )}

      <p className="px-4 py-3.5 text-center text-[13px] text-slate">
        เลือกเรื่องที่จะแจ้งได้ที่{" "}
        <Link
          href={`${routes.profile}#notifications`}
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          ตั้งค่าการแจ้งเตือน
        </Link>
      </p>
    </div>
  );
}
