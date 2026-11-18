"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, FileQuestion } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { draftQueries } from "@/lib/api/queries";
import { promotionCatalog } from "@/lib/post-wizard";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";
import { PostShellMessage, SignInToPost } from "./post-wizard";
import { ListingPreviewCard } from "./preview-card";

const dateTime = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** C6: listing sent for review, what happens next, and a pending preview. */
export function PostDone() {
  const { draftId } = useParams<{ draftId: string }>();
  const { user, isPending: sessionPending } = useSession();
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    ...draftQueries.submission(draftId),
    enabled: Boolean(user),
  });
  const [copied, setCopied] = useState(false);

  if (sessionPending || (user && isPending)) {
    return (
      <PostShellMessage>
        <Skeleton className="h-96 w-full rounded-xl" />
      </PostShellMessage>
    );
  }
  if (!user) return <SignInToPost next={routes.postDone(draftId)} />;
  if (isError || !data) {
    return (
      <PostShellMessage>
        {isError && !isFetching ? (
          <EmptyState
            icon={FileQuestion}
            title="ไม่พบประกาศที่ส่ง"
            body="แบบร่างนี้อาจยังไม่ได้เผยแพร่ กลับไปทำต่อได้จากหน้าลงประกาศ"
            action={
              <Button asChild>
                <Link href={routes.postProperty}>ไปที่หน้าลงประกาศ</Link>
              </Button>
            }
            secondary={
              <button
                type="button"
                onClick={() => refetch()}
                className="font-medium text-brand-strong underline-offset-4 hover:underline"
              >
                ลองโหลดอีกครั้ง
              </button>
            }
            className="rounded-xl bg-white"
          />
        ) : (
          <QueryError what="ประกาศ" onRetry={() => refetch()} retrying={isFetching} />
        )}
      </PostShellMessage>
    );
  }

  const listing = data.data;
  const promotion = promotionCatalog.find((p) => p.id === listing.values.promotion && p.price > 0);
  const url =
    typeof window === "undefined"
      ? routes.property(listing.slug)
      : `${window.location.origin}${routes.property(listing.slug)}`;
  const timeline = [
    { title: "ส่งประกาศแล้ว", body: dateTime.format(new Date(listing.submittedAt)), done: true },
    { title: "กำลังตรวจสอบ", body: "ตรวจรูป ราคา และข้อมูลติดต่อ ไม่ต้องทำอะไรเพิ่ม", done: false },
    {
      title: promotion ? `เผยแพร่และเริ่ม${promotion.title}` : "เผยแพร่ประกาศ",
      body: promotion
        ? "ถ้าไม่ผ่าน เราจะบอกว่าต้องแก้อะไร และคืนเงินค่าโปรโมตเต็มจำนวน"
        : "ถ้าไม่ผ่าน เราจะบอกว่าต้องแก้อะไร",
      done: false,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <PostShellHeader />
      <main
        id="main"
        className="mx-auto grid w-full max-w-[1000px] flex-1 gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="size-7" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">
            ส่งประกาศเรียบร้อย
          </h1>
          <p className="mt-2 text-[15px] text-slate">
            ทีมงานกำลังตรวจประกาศ {listing.code} จะแจ้งผลทางอีเมลและ LINE ภายใน 2 ชม.
          </p>
          <ol className="mt-7 flex flex-col">
            {timeline.map((t, i) => (
              <li key={t.title} className="relative grid grid-cols-[28px_1fr] gap-x-3.5 pb-5 last:pb-0">
                {i < timeline.length - 1 && (
                  <span aria-hidden="true" className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-line" />
                )}
                <span
                  className={cn(
                    "relative z-[1] inline-flex size-7 items-center justify-center rounded-full border-2 text-[13px] font-semibold",
                    t.done
                      ? "border-brand bg-brand text-white"
                      : i === 1
                        ? "border-brand bg-white text-brand-strong"
                        : "border-line-strong bg-white text-slate",
                  )}
                >
                  {t.done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span className="pt-0.5">
                  <span className="block font-semibold text-ink">{t.title}</span>
                  <span className="block text-sm text-slate">{t.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">ไปที่แดชบอร์ด</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={routes.postProperty}>ลงประกาศถัดไป</Link>
            </Button>
          </div>
          <div className="mt-7 rounded-lg bg-mist p-4 text-sm">
            <p className="font-semibold text-ink">ระหว่างรอ</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate">
              <li>
                <Link href="/account/profile" className="font-medium text-brand-strong underline underline-offset-4">
                  ยืนยันเบอร์โทร
                </Link>{" "}
                ผู้หาบ้านกดโทรหาคุณได้ทันที
              </li>
              <li>ตั้งเวลารับนัดดูห้องในแดชบอร์ด เพื่อให้ผู้หาบ้านส่งคำขอนัดได้เฉพาะช่วงที่คุณสะดวก</li>
            </ul>
          </div>
        </div>
        <aside aria-label="ตัวอย่างประกาศ" className="flex flex-col gap-3">
          <ListingPreviewCard values={listing.values} status="รอตรวจสอบ" />
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm">
            <span className="text-slate">ลิงก์ประกาศ</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="inline-flex items-center gap-1.5 font-medium text-brand-strong"
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              <span aria-live="polite">{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

function PostShellHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1000px] items-center px-4 sm:px-8">
        <Logo />
      </div>
    </header>
  );
}
