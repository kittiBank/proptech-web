"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { threadQueries, unreadCountsQuery } from "@/lib/api/queries";
import { formatShortStamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ThreadDto, ThreadFilter } from "@/types/api";

function ThreadRow({ thread, active }: { thread: ThreadDto; active: boolean }) {
  const unread = thread.unreadCount > 0;
  const preview = `${thread.lastMessage.from === "me" ? "คุณ: " : ""}${thread.lastMessage.text}`;
  return (
    <li>
      <Link
        href={routes.thread(thread.id)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex gap-3 border-b border-line px-4 py-3.5 text-ink transition-colors hover:bg-mist focus-visible:-outline-offset-2",
          active && "bg-brand-soft shadow-[inset_3px_0_0_var(--color-brand)] hover:bg-brand-soft",
        )}
      >
        <span className="relative shrink-0">
          <Avatar name={thread.counterpart.name} size="md" className="size-11" />
          {thread.listing && (
            <PropertyPhoto
              image={thread.listing.image}
              sizes="22px"
              className="absolute -right-1 -bottom-1 size-[22px] rounded-sm border-2 border-white"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <strong className="truncate font-semibold">{thread.counterpart.name}</strong>
            <time dateTime={thread.lastMessage.createdAt} className="shrink-0 text-xs text-slate">
              {formatShortStamp(thread.lastMessage.createdAt)}
            </time>
          </span>
          <span className="block truncate text-[13px] text-slate">
            {thread.listing?.title ?? (thread.counterpart.kind === "agent" ? "นายหน้า" : "ผู้ลงประกาศ")}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={cn("truncate text-sm", unread ? "font-semibold text-ink" : "text-slate")}>{preview}</span>
            {unread && (
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white tabular-nums">
                {thread.unreadCount}
                <span className="sr-only"> ข้อความใหม่</span>
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** B14 left pane / B15: chats with unread and viewing filters. */
export function ThreadList({ activeId, className }: { activeId?: string; className?: string }) {
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const { data, isPending, isError, isFetching, refetch } = useQuery(threadQueries.list(filter));
  const { data: unread } = useQuery(unreadCountsQuery);
  const threads = data?.data ?? [];
  const unreadCount = unread?.messages ?? 0;

  const filters: { value: ThreadFilter; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "unread", label: unreadCount ? `ยังไม่อ่าน ${unreadCount}` : "ยังไม่อ่าน" },
    { value: "viewing", label: "นัดดูทรัพย์" },
  ];

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="px-4 pt-[18px] pb-3">
        <h1 className="mb-3 text-2xl font-semibold text-ink lg:text-[22px]">ข้อความ</h1>
        <div role="group" aria-label="กรองแชต" className="flex gap-1.5 overflow-x-auto">
          {filters.map((f) => (
            <ChoiceChip
              key={f.value}
              type="radio"
              name="thread-filter"
              checked={filter === f.value}
              onChange={() => setFilter(f.value)}
            >
              {f.label}
            </ChoiceChip>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
        {isPending ? (
          <div role="status" aria-label="กำลังโหลดแชต" className="flex flex-col gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <QueryError what="แชต" onRetry={() => refetch()} retrying={isFetching} className="m-4" />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={filter === "all" ? "ยังไม่มีข้อความ" : "ไม่มีแชตในหมวดนี้"}
            body="ทักผู้ลงประกาศจากหน้าประกาศ แล้วคุยต่อได้ที่นี่ ไม่ต้องเปิดเผยเบอร์โทร"
            action={
              filter === "all" ? (
                <Button asChild>
                  <Link href={routes.search({ mode: "buy" })}>ค้นหาประกาศ</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul aria-label="รายการแชต">
            {threads.map((t) => (
              <ThreadRow key={t.id} thread={t} active={t.id === activeId} />
            ))}
          </ul>
        )}
        <p className="p-4 text-center text-xs text-slate">แชตที่ไม่มีความเคลื่อนไหว 90 วันจะถูกเก็บเข้าคลัง</p>
      </div>
    </div>
  );
}
