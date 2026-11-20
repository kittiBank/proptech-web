"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/query-state";
import { propertyQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { toListQuery, toSearchQueryString, type SearchState } from "@/lib/search-params";
import { buildRelaxations, pickRelaxations } from "@/lib/search-relax";
import { SaveSearchCard } from "./save-search-card";

/** At most this many suggestions, so the list stays a quick choice. */
const MAX_SUGGESTIONS = 4;

/**
 * D11: nothing matches every filter. Suggests loosening one filter at a time,
 * each with the number of listings it would find (the same request the result
 * page makes, so following a suggestion opens from cache), plus a save-search CTA.
 */
export function NoResults({ state, onClear }: { state: SearchState; onClear: () => void }) {
  const relaxations = buildRelaxations(state);
  const counts = useQueries({
    queries: relaxations.map((r) => ({ ...propertyQueries.list(toListQuery(r.state)), placeholderData: undefined })),
  });

  const loading = counts.some((c) => c.isPending);
  const found = pickRelaxations(
    relaxations,
    counts.map((c) => c.data?.meta.total ?? 0),
    MAX_SUGGESTIONS,
  );

  return (
    <div className="mt-6 max-w-[880px]">
      <h2 className="text-[22px] font-semibold text-ink sm:text-[28px]">ยังไม่มีประกาศที่ตรงทุกเงื่อนไข</h2>
      {relaxations.length > 0 && (loading || found.length > 0) ? (
        <>
          <p className="mt-1.5 text-slate">ลองผ่อนเงื่อนไขบางข้อ ตัวเลขด้านขวาคือจำนวนประกาศที่จะเจอ</p>
          {loading ? (
            <div role="status" aria-label="กำลังหาทางเลือกที่ใกล้เคียง" className="mt-6 flex flex-col gap-2">
              {Array.from({ length: Math.min(MAX_SUGGESTIONS, new Set(relaxations.map((r) => r.id)).size) }, (_, i) => (
                <Skeleton key={i} className="h-[68px] w-full" />
              ))}
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {found.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/search?${toSearchQueryString(r.state)}`}
                    className="flex min-h-[68px] items-center gap-3.5 px-5 py-4 text-ink transition-colors hover:bg-mist focus-visible:-outline-offset-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{r.title}</span>
                      <span className="block text-sm text-slate">{r.detail}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-violet-700 tabular-nums">
                      {formatNumber(r.total)} ประกาศ
                    </span>
                    <ChevronRight className="size-[18px] shrink-0 text-slate" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="mt-1.5 flex flex-col items-start gap-4">
          <p className="text-slate">ลองเปลี่ยนคำค้นหรือล้างตัวกรอง แล้วค้นหาใหม่อีกครั้ง</p>
          {relaxations.length > 0 && (
            <Button variant="outline" onClick={onClear}>
              ล้างตัวกรองทั้งหมด
            </Button>
          )}
        </div>
      )}
      <SaveSearchCard state={state} className="mt-6" />
    </div>
  );
}
