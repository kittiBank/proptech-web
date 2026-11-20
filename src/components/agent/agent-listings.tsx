"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyRow } from "@/components/property/property-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton, QueryError } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { routes } from "@/data/navigation";
import {
  agentModeTabs,
  agentShortName,
  agentSortOptions,
  agentTypeOptions,
  parseAgentParams,
  toAgentListingsQuery,
  toAgentQueryString,
  updateAgentState,
  type AgentListingsState,
} from "@/lib/agent-params";
import { propertyQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AgentProfileDto } from "@/types/api";

/** Listing tab, filters and page in the URL. Page changes push history; filter changes replace it. */
function useAgentListingsState(slug: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseAgentParams(searchParams), [searchParams]);
  const update = useCallback(
    (change: Partial<AgentListingsState>) => {
      const url = routes.agent(slug, toAgentQueryString(updateAgentState(state, change)));
      router[Object.keys(change).every((k) => k === "page") ? "push" : "replace"](url, { scroll: false });
    },
    [router, slug, state],
  );
  return { state, update };
}

/** "ประกาศของ…" (A7) / "ประกาศ N รายการ" (A9): all/sale/rent tabs, type and sort, paginated. */
export function AgentListings({ agent }: { agent: AgentProfileDto }) {
  const { state, update } = useAgentListingsState(agent.slug);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useQuery(
    propertyQueries.list(toAgentListingsQuery(agent.slug, state)),
  );
  const listings = data?.data ?? [];

  const goToPage = (page: number) => {
    update({ page });
    headingRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <section
      aria-labelledby="agent-listings"
      className="-mx-4 mt-8 border-t-8 border-mist px-4 pt-5 sm:mx-0 sm:mt-12 sm:border-t-0 sm:px-0 sm:pt-0"
    >
      <h2
        ref={headingRef}
        id="agent-listings"
        className="scroll-mt-24 text-[17px] font-semibold text-ink sm:mb-2 sm:text-[26px]"
      >
        <span className="sm:hidden">ประกาศ {formatNumber(agent.counts.all)} รายการ</span>
        <span className="hidden sm:inline">ประกาศของ{agentShortName(agent)}</span>
      </h2>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:mt-0">
        <div role="group" aria-label="ประเภทประกาศ" className="flex gap-2 sm:gap-7 sm:border-b sm:border-line">
          {agentModeTabs.map((tab) => {
            const active = state.mode === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => update({ mode: tab.value })}
                className={cn(
                  // Phone: pill chips (A9). sm+: underline tabs (A7).
                  "inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors sm:-mb-px sm:h-12 sm:rounded-none sm:border-0 sm:border-b-2 sm:px-0 sm:text-[15px]",
                  active
                    ? "border-ink bg-ink text-white sm:border-brand sm:bg-transparent sm:text-ink"
                    : "border-line-strong text-ink hover:border-ink sm:border-transparent sm:text-slate sm:hover:text-ink",
                )}
              >
                {tab.label}{" "}
                <span className={cn("text-[13px] font-normal tabular-nums", active ? "sm:text-slate" : "text-slate")}>
                  {formatNumber(agent.counts[tab.value])}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <FilterSelect
            label="ประเภททรัพย์"
            value={state.type}
            options={agentTypeOptions}
            onChange={(type) => update({ type })}
          />
          <FilterSelect
            label="เรียงตาม"
            value={state.sort}
            options={agentSortOptions.map((o) => ({ value: o.value, label: `เรียง: ${o.label}` }))}
            onChange={(sort) => update({ sort })}
          />
        </div>
      </div>

      <div className="mt-2 sm:mt-6" aria-live="polite" aria-busy={isPlaceholderData || isPending}>
        {isPending ? (
          <CardGridSkeleton count={3} columns={3} label="กำลังโหลดประกาศ" />
        ) : isError ? (
          <QueryError what="ประกาศของนายหน้า" onRetry={() => refetch()} retrying={isFetching} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={state.type === "all" ? "ยังไม่มีประกาศในหมวดนี้" : "ไม่พบประกาศที่ตรงกับตัวกรอง"}
            body="ลองเลือกแท็บอื่นหรือเปลี่ยนประเภททรัพย์"
            action={
              <Button variant="outline" onClick={() => update({ mode: "all", type: "all" })}>
                ดูประกาศทั้งหมด
              </Button>
            }
          />
        ) : (
          <>
            {/* Phone: compact rows (A9). sm+: card grid (A7). */}
            <ul className={cn("divide-y divide-line sm:hidden", isPlaceholderData && "opacity-60")}>
              {listings.map((p) => (
                <li key={p.id}>
                  <PropertyRow property={p} />
                </li>
              ))}
            </ul>
            <ul
              className={cn(
                "hidden gap-5 transition-opacity sm:grid sm:grid-cols-2 lg:grid-cols-3",
                isPlaceholderData && "opacity-60",
              )}
            >
              {listings.map((p) => (
                <li key={p.id} className="flex">
                  <PropertyCard property={p} className="w-full" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {data && listings.length > 0 && (
        <Pagination
          page={data.meta.page}
          pageCount={data.meta.totalPages}
          onPageChange={goToPage}
          className="mt-8 sm:mt-9"
          label="หน้ารายการประกาศของนายหน้า"
        />
      )}
    </section>
  );
}
