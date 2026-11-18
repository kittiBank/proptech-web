"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Check, Columns3, Link2, Plus, X } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { Switch } from "@/components/ui/switch";
import { routes } from "@/data/navigation";
import { compareQuery } from "@/lib/api/queries";
import { buildCompareGroups, countSameRows, onlyDifferences, parseCompareIds } from "@/lib/compare";
import { formatListingPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { COMPARE_MAX } from "@/types/api";

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      <span aria-live="polite">{copied ? "คัดลอกลิงก์แล้ว" : "แชร์ตารางนี้"}</span>
    </Button>
  );
}

export function CompareView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = useMemo(() => parseCompareIds(searchParams.get("ids"), COMPARE_MAX), [searchParams]);
  const { data, isPending, isError, isFetching, refetch } = useQuery(compareQuery(ids));
  const [diffOnly, setDiffOnly] = useState(true);

  const listings = useMemo(() => data?.data ?? [], [data]);
  const groups = useMemo(() => buildCompareGroups(listings), [listings]);
  const hidden = countSameRows(groups);
  const shown = diffOnly ? onlyDifferences(groups) : groups;
  const canAdd = listings.length < COMPARE_MAX;

  const removeColumn = (id: string) => {
    const next = ids.filter((x) => x !== id);
    router.replace(next.length ? routes.compare(next) : routes.favorites, { scroll: false });
  };

  const back = (
    <Link
      href={routes.favorites}
      className="inline-flex h-11 items-center gap-1.5 text-[15px] font-medium text-ink hover:text-brand-strong"
    >
      <ArrowLeft className="size-[18px]" aria-hidden="true" />
      กลับไปรายการโปรด
    </Link>
  );

  if (ids.length === 0) {
    return (
      <Container className="py-6">
        {back}
        <EmptyState
          icon={Columns3}
          title="ยังไม่ได้เลือกประกาศที่จะเปรียบเทียบ"
          body="เลือก 2–3 ประกาศจากรายการโปรด แล้วกดเปรียบเทียบเพื่อดูราคา ขนาด และทำเลเทียบกัน"
          action={
            <Button asChild size="lg">
              <Link href={routes.favorites}>ไปที่รายการโปรด</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  // Label column plus one per listing, plus the "add" slot on wide screens.
  const gridStyle = {
    "--n": listings.length || ids.length,
    "--cols": (listings.length || ids.length) + (canAdd ? 1 : 0),
  } as CSSProperties;
  const grid =
    "grid grid-cols-[repeat(var(--n),minmax(0,1fr))] sm:grid-cols-[minmax(140px,220px)_repeat(var(--cols),minmax(0,1fr))]";

  return (
    <Container className="pt-4 pb-16 sm:pt-6">
      {back}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">เปรียบเทียบประกาศ</h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-slate">
            พื้นสีม่วงคือค่าที่ดีที่สุดในแถวนั้น เช่น ราคาต่อ ตร.ม. ต่ำสุด หรือใกล้สถานีที่สุด
            {diffOnly && hidden > 0 && ` ซ่อน ${hidden} แถวที่เหมือนกันอยู่`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Switch checked={diffOnly} onCheckedChange={setDiffOnly} label="แสดงเฉพาะที่ต่างกัน" />
          <CopyLinkButton />
        </div>
      </div>

      {isPending ? (
        <div role="status" aria-label="กำลังโหลดตารางเปรียบเทียบ" className="mt-6 grid gap-4 sm:grid-cols-3">
          {ids.map((id) => (
            <Skeleton key={id} className="h-[420px] rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="ตารางเปรียบเทียบ" onRetry={() => refetch()} retrying={isFetching} className="mt-6" />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Columns3}
          title="ไม่พบประกาศที่เลือกไว้"
          body="ลิงก์อาจเก่าเกินไป หรือประกาศถูกลบไปแล้ว ลองเลือกใหม่จากรายการโปรด"
          action={
            <Button asChild>
              <Link href={routes.favorites}>ไปที่รายการโปรด</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white" style={gridStyle}>
          <div className={cn(grid, "sticky top-[68px] z-10 bg-white sm:static")}>
            <div className="hidden items-end p-4 text-sm text-slate sm:flex">
              {listings.length} จาก {COMPARE_MAX} ประกาศ
            </div>
            {listings.map((p, i) => (
              <div
                key={p.id}
                className={cn("flex flex-col gap-2 border-line p-3 sm:border-l sm:p-4", i > 0 && "border-l")}
              >
                <div className="relative overflow-hidden rounded-md">
                  <PropertyPhoto
                    image={p.image}
                    sizes="(min-width: 640px) 300px, 50vw"
                    className="aspect-[4/3] sm:aspect-auto sm:h-[140px]"
                  />
                  {p.status === "closed" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-sm font-semibold text-white">
                      ปิดแล้ว
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeColumn(p.id)}
                    aria-label={`นำ ${p.title} ออกจากการเปรียบเทียบ`}
                    className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full bg-white text-ink hover:bg-mist"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <Link
                  href={routes.property(p.slug)}
                  className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink hover:text-brand-strong sm:text-[15px]"
                >
                  {p.title}
                </Link>
                <span className="text-base font-semibold text-ink tabular-nums sm:text-[22px]">
                  {formatListingPrice(p.price, p.mode)}
                </span>
                <Button asChild variant="ink" size="sm" className="mt-auto hidden sm:inline-flex">
                  <Link href={`${routes.property(p.slug)}#contact`}>ติดต่อผู้ลงประกาศ</Link>
                </Button>
              </div>
            ))}
            {canAdd && (
              <div className="hidden border-l border-line p-4 sm:block">
                <Link
                  href={routes.favorites}
                  className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong font-medium text-brand-strong hover:border-brand"
                >
                  <Plus className="size-5" aria-hidden="true" />
                  เพิ่มจากรายการโปรด
                </Link>
              </div>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="border-t border-line p-6 text-[15px] text-slate">
              ทุกแถวเหมือนกัน ปิด “แสดงเฉพาะที่ต่างกัน” เพื่อดูทั้งหมด
            </p>
          ) : (
            <table className="block w-full">
              <caption className="sr-only">ตารางเปรียบเทียบ {listings.map((p) => p.title).join(" กับ ")}</caption>
              {shown.map((g) => (
                <tbody key={g.title} className="block">
                  <tr className={cn(grid, "border-t border-line bg-mist")}>
                    <th
                      scope="colgroup"
                      colSpan={listings.length + 1}
                      className="col-span-full px-4 pt-4 pb-2 text-left text-[15px] font-semibold text-ink sm:pt-5"
                    >
                      {g.title}
                    </th>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.key} className={cn(grid, "border-t border-line")}>
                      <th
                        scope="row"
                        className="col-span-full px-4 pt-3 text-left text-xs font-normal text-slate sm:col-span-1 sm:py-3.5 sm:text-sm"
                      >
                        {r.label}
                      </th>
                      {r.values.map((v, i) => (
                        <Fragment key={i}>
                          <td
                            className={cn(
                              "px-4 pt-0.5 pb-3 text-sm font-medium text-ink sm:border-l sm:border-line sm:py-3.5 sm:text-[15px] sm:font-normal",
                              r.best[i] && "text-violet-700 sm:bg-brand-soft",
                              v === "–" && "text-line-strong",
                            )}
                          >
                            {r.best[i] && (
                              <span
                                aria-hidden="true"
                                className="mr-1.5 inline-block size-2 rounded-full bg-brand align-[1px] sm:hidden"
                              />
                            )}
                            {v}
                            {r.best[i] && (
                              <span className="ml-1.5 hidden rounded-sm bg-white px-1.5 align-[2px] text-[11px] font-semibold text-violet-700 sm:inline">
                                ดีที่สุด
                              </span>
                            )}
                            {r.best[i] && <span className="sr-only sm:hidden"> (ดีที่สุด)</span>}
                          </td>
                        </Fragment>
                      ))}
                      {canAdd && <td aria-hidden="true" className="hidden border-l border-line sm:block" />}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}

          <div className={cn(grid, "gap-2.5 border-t border-line p-4 sm:hidden")}>
            {listings.map((p) => (
              <Button key={p.id} asChild variant="ink" size="sm">
                <Link href={`${routes.property(p.slug)}#contact`}>ติดต่อ</Link>
              </Button>
            ))}
          </div>
        </div>
      )}

      {listings.length === 1 && (
        <p className="mt-4 text-[15px] text-slate">
          เหลือ 1 ประกาศ{" "}
          <Link href={routes.favorites} className="font-medium text-brand-strong underline-offset-4 hover:underline">
            เลือกเพิ่มจากรายการโปรด
          </Link>{" "}
          เพื่อเปรียบเทียบ
        </p>
      )}
    </Container>
  );
}
