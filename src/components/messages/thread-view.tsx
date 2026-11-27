"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, ChevronLeft, MessageCircleOff, Phone, SendHorizontal } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { TransitBadge } from "@/components/property/transit-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { toast } from "@/components/ui/toast";
import { CalendarLink, ViewingRequestCard } from "@/components/viewing/viewing-request-card";
import { RequestViewingDialog } from "@/components/viewing/request-viewing-dialog";
import { useUpdateViewing } from "@/components/viewing/use-viewing-actions";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { queryKeys, threadQueries } from "@/lib/api/queries";
import { telHref } from "@/lib/contact";
import { bangkokDay } from "@/lib/format";
import { formatResponseTime } from "@/lib/listing";
import { formatSlot, slotParts } from "@/lib/viewing";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import type { MessageDto, ThreadDetailResponse, ThreadDto, ViewingRequestDto } from "@/types/api";

type Detail = ThreadDetailResponse["data"];

const quickReplies = ["ห้องยังว่างอยู่ไหม", "ขอดูสัญญาก่อนได้ไหม", "ต่อรองราคาได้ไหม"];
const kindLabel = {
  agent: "นายหน้า",
  owner: "เจ้าของ",
  developer: "โครงการ",
  buyer: "ผู้สนใจ",
  support: "ทีมงาน",
} as const;

const thaiDay = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "long",
  year: "numeric",
});
function dayLabel(iso: string, now = new Date()) {
  const d = bangkokDay(new Date(iso));
  if (d === bangkokDay(now)) return "วันนี้";
  if (d === bangkokDay(new Date(now.getTime() - 86_400_000))) return "เมื่อวาน";
  return thaiDay.format(new Date(iso));
}

/** Marks the chat read when it opens and whenever new messages arrive while it is open. */
function useMarkRead(thread: ThreadDto | undefined) {
  const client = useQueryClient();
  const read = useMutation({
    mutationFn: (id: string) => api.markThreadRead(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.unreadCounts });
      client.invalidateQueries({ queryKey: ["me", "threads", "list"] });
    },
  });
  const { mutate } = read;
  const pending = thread && thread.unreadCount > 0 ? thread.id : undefined;
  useEffect(() => {
    if (pending) mutate(pending);
  }, [pending, mutate]);
}

function Header({ thread }: { thread: ThreadDto }) {
  const c = thread.counterpart;
  const name = c.profileSlug ? (
    <Link href={routes.agent(c.profileSlug)} className="hover:text-brand-strong hover:underline">
      {c.name}
    </Link>
  ) : (
    c.name
  );
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-line px-1 sm:h-[68px] sm:gap-3 sm:px-5">
      <Link
        href={routes.messages}
        aria-label="กลับไปรายการแชต"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-mist lg:hidden"
      >
        <ChevronLeft className="size-[22px]" aria-hidden="true" />
      </Link>
      <Avatar name={c.name} size="md" className="max-sm:size-9 max-sm:text-sm" />
      <div className="min-w-0 flex-1">
        {/* Phones hide the chat list and its H1, so there the contact name is the page heading. */}
        <h1 className="truncate font-semibold text-ink lg:hidden">{name}</h1>
        <h2 className="truncate font-semibold text-ink max-lg:hidden">{name}</h2>
        <p className="truncate text-xs text-success sm:text-[13px]">
          {kindLabel[c.kind]}
          {c.idVerified && " · ยืนยันตัวตนแล้ว"} · มักตอบ{formatResponseTime(c.responseMinutes)}
        </p>
      </div>
      <Button asChild variant="outline" size="base" className="max-sm:size-11 max-sm:border-0 max-sm:px-0">
        <a href={telHref(c.phone)}>
          <Phone aria-hidden="true" className="!size-4" />
          <span className="max-sm:sr-only">โทร</span>
        </a>
      </Button>
    </header>
  );
}

/** Phone and tablet strip under the header (B16); desktop shows the aside instead. */
function ListingStrip({ thread }: { thread: ThreadDto }) {
  const l = thread.listing;
  if (!l) return null;
  return (
    <Link
      href={l.href}
      className="flex shrink-0 items-center gap-2.5 border-b border-line bg-mist px-4 py-2.5 text-ink xl:hidden"
    >
      <PropertyPhoto image={l.image} sizes="52px" className="h-10 w-[52px] shrink-0 rounded-sm" />
      <span className="min-w-0 flex-1 text-[13px]">
        <span className="block truncate font-semibold">{l.title}</span>
        <span className="font-medium tabular-nums">{l.priceLabel}</span>
        {l.station && <span className="text-slate"> · {l.station.name}</span>}
      </span>
      <span className="shrink-0 text-[13px] font-medium text-brand-strong">ดูประกาศ</span>
    </Link>
  );
}

function ContextAside({ thread, viewings }: { thread: ThreadDto; viewings: ViewingRequestDto[] }) {
  const l = thread.listing;
  const next = viewings.filter((v) => v.status === "confirmed").sort((a, b) => a.slot.localeCompare(b.slot))[0];
  return (
    <aside
      aria-label="ประกาศที่คุยกันอยู่"
      className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-l border-line p-5 xl:flex"
    >
      {l ? (
        <>
          <p className="text-[13px] text-slate">ประกาศที่คุยกันอยู่</p>
          <PropertyPhoto image={l.image} sizes="280px" className="aspect-[16/10] w-full rounded-lg" />
          <p className="font-semibold text-ink">{l.title}</p>
          <p className="text-[22px] font-semibold text-ink tabular-nums">{l.priceLabel}</p>
          {l.station && <TransitBadge station={l.station} distance={l.stationDistance} />}
          <Button asChild variant="outline">
            <Link href={l.href}>เปิดประกาศ</Link>
          </Button>
        </>
      ) : (
        <p className="text-sm text-slate">แชตนี้ยังไม่ได้ผูกกับประกาศ ส่งลิงก์ประกาศที่สนใจในแชตได้เลย</p>
      )}
      {next && (
        <div className="border-t border-line pt-3 text-sm">
          <p className="font-semibold text-ink">นัดดูทรัพย์</p>
          <p className="mt-0.5 text-slate">{formatSlot(next.slot)}</p>
          <CalendarLink viewing={next} title={l?.title ?? thread.counterpart.name} />
        </div>
      )}
    </aside>
  );
}

/** Optimistic messages not yet confirmed by the server (or waiting for a connection). */
const PENDING_PREFIX = "pending-";

function Bubble({ m, showRead }: { m: MessageDto; showRead: boolean }) {
  const mine = m.from === "me";
  return (
    <div className={cn("flex flex-col gap-0.5", mine ? "items-end" : "items-start")}>
      <p
        className={cn(
          "max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap sm:max-w-[70%]",
          mine ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-mist text-ink",
        )}
      >
        <span className="sr-only">{mine ? "คุณ: " : "อีกฝ่าย: "}</span>
        {m.text}
      </p>
      <span className="text-[11px] text-slate sm:text-xs">
        <time dateTime={m.createdAt}>{slotParts(m.createdAt).time}</time>
        {m.id.startsWith(PENDING_PREFIX) ? " · รอส่ง" : showRead && " · อ่านแล้ว"}
      </span>
    </div>
  );
}

function Conversation({ detail, onRebook }: { detail: Detail; onRebook: () => void }) {
  const { thread, messages, viewings } = detail;
  const listRef = useRef<HTMLDivElement>(null);
  const update = useUpdateViewing();
  const lastRead = [...messages].reverse().find((m) => m.from === "me" && m.readAt)?.id;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const days = messages.map((m) => dayLabel(m.createdAt));
  return (
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <Callout tone="warning" className="mx-auto mb-4 max-w-[520px] rounded-md border-l-0 py-2.5 text-[13px]">
        นัดดูทรัพย์จริงก่อนโอนเงินทุกครั้ง PropertyHub ไม่เรียกเก็บเงินมัดจำแทนผู้ลงประกาศ
      </Callout>
      <ol aria-label="ข้อความ" className="flex flex-col gap-2.5">
        {messages.map((m, i) => {
          const day = days[i];
          const divider = i === 0 || day !== days[i - 1];
          const viewing = m.kind === "viewing" ? viewings.find((v) => v.id === m.viewingId) : undefined;
          return (
            <li key={m.id} className="flex flex-col gap-2.5">
              {divider && <p className="mx-auto my-1 rounded-full bg-mist px-2.5 py-1 text-xs text-slate">{day}</p>}
              {viewing ? (
                <div className={cn("flex flex-col gap-0.5", m.from === "me" ? "items-end" : "items-start")}>
                  <ViewingRequestCard
                    viewing={viewing}
                    role={thread.role}
                    listingTitle={thread.listing?.title}
                    responseMinutes={thread.counterpart.responseMinutes}
                    busy={update.isPending}
                    onCancel={() => update.mutate({ id: viewing.id, action: "cancel" })}
                    onAccept={() => update.mutate({ id: viewing.id, action: "accept" })}
                    onRebook={
                      viewing.id === thread.viewing?.id
                        ? () =>
                            viewing.status === "counter_proposed"
                              ? update.mutate({ id: viewing.id, action: "cancel" }, { onSuccess: onRebook })
                              : onRebook()
                        : undefined
                    }
                  />
                  <span className="text-[11px] text-slate sm:text-xs">
                    <time dateTime={m.createdAt}>{slotParts(m.createdAt).time}</time>
                  </span>
                </div>
              ) : (
                <Bubble m={m} showRead={m.id === lastRead} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Composer({ thread, onRequestViewing: requestViewing }: { thread: ThreadDto; onRequestViewing?: () => void }) {
  const id = useId();
  const online = useOnline();
  // Messages queue while offline (the mutation pauses and sends on reconnect); viewing requests need a live answer.
  const onRequestViewing = online ? requestViewing : undefined;
  const client = useQueryClient();
  const [text, setText] = useState("");
  const key = queryKeys.threads.detail(thread.id);
  const send = useMutation({
    mutationFn: (value: string) => api.sendMessage(thread.id, value),
    onMutate: async (value) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Detail>(key);
      if (previous) {
        const optimistic: MessageDto = {
          id: `${PENDING_PREFIX}${Date.now()}`,
          threadId: thread.id,
          from: "me",
          kind: "text",
          text: value,
          createdAt: new Date().toISOString(),
        };
        client.setQueryData<Detail>(key, { ...previous, messages: [...previous.messages, optimistic] });
      }
      return { previous };
    },
    onError: (e, value, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
      setText(value);
      toast(e instanceof ApiError && e.status === 400 ? "ข้อความยาวเกินไป" : "ส่งข้อความไม่สำเร็จ ลองอีกครั้ง");
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: key });
      client.invalidateQueries({ queryKey: ["me", "threads", "list"] });
    },
  });

  const submit = (value = text) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setText("");
    send.mutate(trimmed);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 border-t border-line pb-[env(safe-area-inset-bottom)] lg:border-t-0">
      {!online && (
        <p className="bg-mist px-4 py-2 text-[13px] text-slate sm:px-5">
          ออฟไลน์อยู่ ข้อความที่ส่งจะรอในเครื่องและส่งให้เมื่อกลับมาออนไลน์ ขอนัดดูห้องได้เมื่อออนไลน์
        </p>
      )}
      <div role="group" aria-label="ข้อความด่วน" className="flex gap-2 overflow-x-auto px-4 pt-2.5 sm:px-5">
        {onRequestViewing && (
          <button
            type="button"
            onClick={onRequestViewing}
            className="h-9 shrink-0 rounded-full border border-violet-200 bg-brand-soft px-3 text-sm font-medium whitespace-nowrap text-brand-strong"
          >
            ขอนัดดูห้อง
          </button>
        )}
        {quickReplies.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => submit(q)}
            className="h-9 shrink-0 rounded-full border border-violet-200 bg-white px-3 text-sm whitespace-nowrap text-brand-strong hover:bg-brand-soft"
          >
            {q}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2 px-3 pt-2.5 pb-3 sm:gap-2.5 sm:px-5 sm:pb-5">
        {onRequestViewing && (
          <button
            type="button"
            aria-label="ขอนัดดูทรัพย์"
            onClick={onRequestViewing}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-mist"
          >
            <CalendarPlus className="size-5" aria-hidden="true" />
          </button>
        )}
        <label htmlFor={`${id}-text`} className="sr-only">
          พิมพ์ข้อความ
        </label>
        <textarea
          id={`${id}-text`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          placeholder="พิมพ์ข้อความ"
          className={cn(inputClass, "field-sizing-content max-h-32 min-h-11 resize-none rounded-[22px] px-4 py-2.5")}
        />
        <Button type="submit" className="size-11 shrink-0 rounded-full px-0 sm:w-auto sm:px-5" disabled={!text.trim()}>
          <SendHorizontal aria-hidden="true" className="sm:hidden" />
          <span className="max-sm:sr-only">ส่ง</span>
        </Button>
      </form>
    </div>
  );
}

/** `/messages/[threadId]` (B14 centre + aside, B16 on phones). Polls for replies and viewing updates. */
export function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(threadQueries.detail(threadId));
  const [requestOpen, setRequestOpen] = useState(false);
  useMarkRead(data?.thread);

  if (isPending) {
    return (
      <div role="status" aria-label="กำลังโหลดแชต" className="flex flex-col gap-3 p-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="ml-auto h-12 w-2/3" />
        <Skeleton className="h-12 w-1/2" />
      </div>
    );
  }
  if (isError) {
    return error instanceof ApiError && error.status === 404 ? (
      <div className="flex flex-col items-start gap-4 p-8">
        <MessageCircleOff className="size-8 text-brand" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-ink">ไม่พบแชตนี้</h1>
        <Button asChild variant="outline">
          <Link href={routes.messages}>กลับไปรายการแชต</Link>
        </Button>
      </div>
    ) : (
      <QueryError what="แชต" onRetry={() => refetch()} retrying={isFetching} className="m-6" />
    );
  }

  const { thread } = data;
  const canRequest =
    thread.role === "buyer" &&
    Boolean(thread.listing) &&
    !["requested", "counter_proposed"].includes(thread.viewing?.status ?? "");
  const openRequest = canRequest ? () => setRequestOpen(true) : undefined;

  return (
    <section
      aria-label={`แชตกับ ${thread.counterpart.name}`}
      className="grid h-[calc(100dvh-68px)] min-h-[480px] xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="flex min-h-0 min-w-0 flex-col">
        <Header thread={thread} />
        <ListingStrip thread={thread} />
        <Conversation detail={data} onRebook={() => setRequestOpen(true)} />
        <Composer thread={thread} onRequestViewing={openRequest} />
      </div>
      <ContextAside thread={thread} viewings={data.viewings} />
      <RequestViewingDialog thread={thread} open={requestOpen} onOpenChange={setRequestOpen} />
    </section>
  );
}
