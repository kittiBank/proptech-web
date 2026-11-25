"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { RadioCard } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { sellerQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { canPromote, coverage } from "@/lib/seller";
import type { BoostKind, BoostOptionDto } from "@/types/api";
import { useCreateOrder } from "@/components/billing/use-billing-actions";
import { promoteErrorMessage, usePromoteListings } from "./use-seller-actions";

interface BoostDialogProps {
  /** Listing ids from `?boost=`. The dialog is open while there are any. */
  ids: string[];
  onClose: () => void;
  onDone?: () => void;
}

function optionNote(o: BoostOptionDto) {
  if (o.slotsLeft !== undefined) return `เหลือ ${o.slotsLeft} ที่ในสัปดาห์นี้`;
  if (o.packageLeft !== undefined && o.packageLeft > 0) {
    return o.kind === "featured"
      ? `ใช้ช่องแพ็กเกจได้ (เหลือ ${o.packageLeft} ช่อง)`
      : `ใช้โควตาแพ็กเกจ (เหลือ ${o.packageLeft})`;
  }
  return undefined;
}

/**
 * Boost dialog (C14), opened by `?boost=id1,id2` on the listings page. Picks a
 * promotion, shows what the package covers and what comes out of credit.
 */
export function BoostDialog({ ids, onClose, onDone }: BoostDialogProps) {
  const open = ids.length > 0;
  const listings = useQuery({ ...sellerQueries.listings({ ids: ids.join(","), limit: 50 }), enabled: open });
  const options = useQuery({ ...sellerQueries.boostOptions, enabled: open });
  const account = useQuery({ ...sellerQueries.account, enabled: open });
  const promote = usePromoteListings();
  // Credit short: pay the rest by PromptPay or card at checkout.
  const checkout = useCreateOrder();
  const [kind, setKind] = useState<BoostKind>("featured");

  const rows = listings.data?.data ?? [];
  const targets = rows.filter(canPromote);
  const skipped = rows.length - targets.length;
  const option = options.data?.find((o) => o.kind === kind);
  const cost = option ? coverage(option, targets.length) : undefined;
  const credit = account.data?.credit ?? 0;
  const short = cost ? cost.charge > credit : false;
  const soldOut = option?.slotsLeft !== undefined && targets.length > option.slotsLeft;
  const titles = targets.map((l) => l.title);

  const close = () => {
    promote.reset();
    onClose();
  };
  const submit = () =>
    promote.mutate(
      { ids: targets.map((l) => l.id), kind },
      {
        onSuccess: () => {
          onDone?.();
          close();
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:w-[min(560px,calc(100vw-48px))]">
        <div className="border-b border-line px-5 pt-5 pr-14 pb-4 sm:px-6">
          <DialogTitle className="text-xl font-semibold text-ink">
            โปรโมต {listings.isPending ? "" : `${targets.length} `}ประกาศ
          </DialogTitle>
          <DialogDescription className="mt-1 line-clamp-2 text-sm text-slate">
            {listings.isPending ? "กำลังโหลด…" : titles.length ? titles.join(" และ ") : "ไม่มีประกาศที่โปรโมตได้"}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {listings.isPending || options.isPending ? (
            <div role="status" aria-label="กำลังโหลดตัวเลือกโปรโมต" className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[76px] rounded-lg" />
              ))}
            </div>
          ) : listings.isError || options.isError ? (
            <QueryError
              what="ตัวเลือกโปรโมต"
              onRetry={() => {
                listings.refetch();
                options.refetch();
              }}
            />
          ) : (
            <>
              {skipped > 0 && (
                <Callout tone="info" className="mb-3">
                  ข้าม {skipped} ประกาศที่ยังไม่เผยแพร่ โปรโมตได้หลังประกาศผ่านการตรวจ
                </Callout>
              )}
              <fieldset className="flex flex-col gap-2.5">
                <legend className="sr-only">เลือกวิธีโปรโมต</legend>
                {options.data.map((o) => {
                  const note = optionNote(o);
                  return (
                    <RadioCard
                      key={o.kind}
                      name="boost"
                      checked={kind === o.kind}
                      onChange={() => setKind(o.kind)}
                      disabled={o.slotsLeft === 0}
                      title={o.title}
                      description={
                        <>
                          {o.description}
                          {note && <span className="mt-0.5 block font-medium text-violet-700">{note}</span>}
                        </>
                      }
                      aside={<span className="tabular-nums">฿{formatNumber(o.price)}</span>}
                    />
                  );
                })}
              </fieldset>
              {option?.estimate && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-brand-soft px-3 py-2.5 text-sm text-ink">
                  <TrendingUp className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span>
                    <b className="font-semibold">คาดการณ์ </b>
                    {option.estimate}
                  </span>
                </p>
              )}
              {short && (
                <Callout tone="warning" className="mt-3" role="alert">
                  เครดิตคงเหลือ ฿{formatNumber(credit)} ไม่พอ ชำระส่วนนี้ด้วย PromptPay หรือบัตรได้เลย หรือ{" "}
                  <Link href={routes.billing} className="font-semibold underline underline-offset-4">
                    เติมเครดิต
                  </Link>
                </Callout>
              )}
              {soldOut && (
                <Callout tone="warning" className="mt-3" role="alert">
                  ที่ปักหมุดหน้าแรกเหลือไม่พอสำหรับ {targets.length} ประกาศ
                </Callout>
              )}
              {promote.isError && (
                <Callout tone="danger" className="mt-3" role="alert">
                  {promoteErrorMessage(promote.error)}
                </Callout>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4 sm:px-6">
          {cost && targets.length > 0 && (
            <p className="mr-auto text-sm" aria-live="polite">
              {cost.covered > 0 && (
                <span className="block text-xs text-slate">
                  ใช้{kind === "featured" ? "ช่อง" : "โควตา"}แพ็กเกจ {cost.covered}{" "}
                  {kind === "featured" ? "ช่อง" : "ครั้ง"}
                </span>
              )}
              <b className="text-lg font-semibold text-ink tabular-nums">฿{formatNumber(cost.charge)}</b>
              {cost.charge < cost.fullPrice && (
                <s className="ml-2 text-slate tabular-nums">
                  <span className="sr-only">จากราคาเต็ม </span>฿{formatNumber(cost.fullPrice)}
                </s>
              )}
              {cost.charge > 0 && (
                <span className="block text-xs text-slate">{short ? "ชำระที่หน้าชำระเงิน" : "หักจากเครดิต"}</span>
              )}
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="base" onClick={close}>
              ยกเลิก
            </Button>
            {short ? (
              <Button
                size="base"
                disabled={!targets.length || soldOut || checkout.isPending}
                onClick={() =>
                  checkout.mutate({ kind: "promotion", promotion: kind, listingIds: targets.map((l) => l.id) })
                }
              >
                {checkout.isPending ? "กำลังสร้างรายการ…" : "ไปชำระเงิน"}
              </Button>
            ) : (
              <Button
                size="base"
                onClick={submit}
                disabled={!targets.length || !option || soldOut || promote.isPending}
              >
                {promote.isPending ? "กำลังเริ่ม…" : "เริ่มโปรโมต"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
