"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton, QueryError, Skeleton } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { routes } from "@/data/navigation";
import { projectQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import {
  defaultProjectsState,
  hasProjectFilters,
  parseProjectsParams,
  projectLineOptions,
  projectPriceRanges,
  projectSortOptions,
  projectStatusTabs,
  projectTypeOptions,
  toProjectsQuery,
  toProjectsQueryString,
  updateProjectsState,
  type ProjectsState,
} from "@/lib/project-params";
import { cn } from "@/lib/utils";
import { FeaturedProjectCard, ProjectCard } from "./project-card";

/** /projects state in the URL. Page changes push history; filter changes replace it. */
function useProjectsState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseProjectsParams(searchParams), [searchParams]);

  const update = useCallback(
    (change: Partial<ProjectsState>) => {
      const next = updateProjectsState(state, change);
      const qs = toProjectsQueryString(next);
      const url = qs ? `${routes.newProjects}?${qs}` : routes.newProjects;
      router[Object.keys(change).every((k) => k === "page") ? "push" : "replace"](url, { scroll: false });
    },
    [router, state],
  );

  return { state, update };
}

export function ProjectsView() {
  const { state, update } = useProjectsState();
  const listRef = useRef<HTMLHeadingElement>(null);
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } = useQuery(
    projectQueries.list(toProjectsQuery(state)),
  );
  const showFeatured = state.page === 1 && !hasProjectFilters(state);
  const featured = useQuery({ ...projectQueries.list({ featured: true, limit: 1 }), enabled: showFeatured });
  const featuredProject = showFeatured ? featured.data?.data[0] : undefined;

  const projects = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const counts = data?.counts;
  const filtered = hasProjectFilters(state);

  const goToPage = (page: number) => {
    update({ page });
    listRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <Container className="pt-8 pb-16 sm:pt-9 sm:pb-[72px]">
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
        โครงการใหม่ในกรุงเทพฯ และปริมณฑล
      </h1>
      <p className="mt-2 max-w-[62ch] text-[16px] text-slate">
        ราคาเริ่มต้น แบบห้อง และความคืบหน้าก่อสร้าง อัปเดตจากผู้พัฒนาโครงการโดยตรง
        ลงทะเบียนกับโครงการได้โดยไม่มีค่าใช้จ่าย
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <div
          role="group"
          aria-label="สถานะโครงการ"
          className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-mist p-1"
        >
          {projectStatusTabs.map((tab) => {
            const active = state.status === tab.value;
            const count = counts?.[tab.value];
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => update({ status: tab.value })}
                className={cn(
                  "inline-flex h-[38px] shrink-0 items-center gap-2 rounded-sm px-4 text-[15px] font-medium whitespace-nowrap text-slate transition-colors hover:text-ink",
                  active && "bg-white text-ink ring-1 ring-line-strong",
                )}
              >
                {tab.label}
                {count !== undefined && <span className="text-xs font-normal text-slate tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>
        <FilterSelect
          label="ประเภทโครงการ"
          value={state.type}
          options={projectTypeOptions}
          onChange={(type) => update({ type })}
        />
        <FilterSelect
          label="ทำเลหรือสายรถไฟฟ้า"
          value={state.line}
          options={projectLineOptions}
          onChange={(line) => update({ line })}
        />
        <FilterSelect
          label="ราคาเริ่มต้น"
          value={state.price}
          options={projectPriceRanges}
          onChange={(price) => update({ price })}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm text-slate">เรียง:</span>
          <FilterSelect
            label="เรียงตาม"
            value={state.sort}
            options={projectSortOptions}
            onChange={(sort) => update({ sort })}
          />
        </div>
      </div>

      {showFeatured &&
        (featured.isPending ? (
          <Skeleton className="mt-7 h-[380px] w-full rounded-lg" />
        ) : featuredProject ? (
          <div className="mt-7">
            <FeaturedProjectCard project={featuredProject} />
          </div>
        ) : null)}

      <h2 ref={listRef} className="mt-12 mb-5 scroll-mt-24 text-[22px] font-semibold text-ink" aria-live="polite">
        {data ? `โครงการ${filtered ? "ที่ตรงกับตัวกรอง" : "ทั้งหมด"} ${formatNumber(total)} โครงการ` : "โครงการทั้งหมด"}
      </h2>

      {isPending ? (
        <CardGridSkeleton count={6} columns={3} label="กำลังโหลดโครงการ" />
      ) : isError ? (
        <QueryError what="รายการโครงการ" onRetry={() => refetch()} retrying={isFetching} />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-line-strong p-8 sm:p-10">
          <Building2 className="size-8 text-brand" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-ink">
              {total > 0 ? "หน้านี้ไม่มีโครงการแล้ว" : "ไม่พบโครงการที่ตรงกับตัวกรอง"}
            </p>
            <p className="mt-1 text-[15px] text-slate">ลองเปลี่ยนสถานะ ทำเล หรือช่วงราคาเริ่มต้น</p>
          </div>
          {total > 0 ? (
            <Button variant="outline" onClick={() => goToPage(1)}>
              กลับไปหน้าแรก
            </Button>
          ) : (
            filtered && (
              <Button variant="outline" onClick={() => update({ ...defaultProjectsState, sort: state.sort })}>
                ล้างตัวกรองทั้งหมด
              </Button>
            )
          )}
        </div>
      ) : (
        <ul
          aria-busy={isPlaceholderData}
          className={cn(
            "grid gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
            isPlaceholderData && "opacity-60",
          )}
        >
          {projects.map((p, i) => (
            <li key={p.id} className="flex">
              <ProjectCard project={p} priority={!showFeatured && i < 3} className="w-full" />
            </li>
          ))}
        </ul>
      )}

      {data && projects.length > 0 && (
        <Pagination
          page={data.meta.page}
          pageCount={data.meta.totalPages}
          onPageChange={goToPage}
          className="mt-10"
          label="หน้ารายการโครงการ"
        />
      )}
    </Container>
  );
}

export function ProjectsSkeleton() {
  return (
    <Container className="pt-8 pb-16 sm:pt-9">
      <Skeleton className="h-10 w-3/5" />
      <Skeleton className="mt-3 h-5 w-4/5" />
      <Skeleton className="mt-6 h-12 w-full" />
      <Skeleton className="mt-7 h-[380px] w-full rounded-lg" />
      <CardGridSkeleton count={3} columns={3} label="กำลังโหลดหน้าโครงการ" className="mt-12" />
    </Container>
  );
}
