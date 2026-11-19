"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowRight, Calculator, Search, SearchX, X } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { articleCategories, guidesLineUrl } from "@/data/articles";
import { routes } from "@/data/navigation";
import { articleQueries } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import type { ArticleCategory } from "@/types/api";
import { ArticleCard, ArticleGridSkeleton, FeaturedArticle } from "./article-card";

/** Articles per "load more" page: two rows of the 3-column grid. */
export const GUIDES_PAGE_SIZE = 6;

const categoryValues = articleCategories.map((c) => c.value);

interface GuidesState {
  category: ArticleCategory | "all";
  q: string;
}

/** Reads `?category=&q=`; an unknown category falls back to "all". */
export function parseGuidesParams(params: Pick<URLSearchParams, "get">): GuidesState {
  const category = params.get("category");
  return {
    category: category && (categoryValues as string[]).includes(category) ? (category as ArticleCategory) : "all",
    q: params.get("q")?.trim() ?? "",
  };
}

function toGuidesUrl({ category, q }: GuidesState): string {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `${routes.guides}?${qs}` : routes.guides;
}

const tools = [
  {
    title: "คำนวณค่างวดผ่อนบ้าน",
    body: "รู้ค่างวดและรายได้ขั้นต่ำที่ธนาคารอยากเห็น",
    href: routes.mortgageTool,
  },
  { title: "ค่าโอนและภาษี", body: "คำนวณค่าธรรมเนียมวันโอนกรรมสิทธิ์" },
  { title: "เช่าหรือซื้อดีกว่า", body: "เทียบเงินที่จ่ายไปใน 5 และ 10 ปี" },
];

function ToolCards() {
  return (
    <section aria-labelledby="tools-title" className="mt-12">
      <h2 id="tools-title" className="mb-4 text-[22px] font-semibold text-ink">
        เครื่องมือคำนวณ
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {tools.map((tool) =>
          tool.href ? (
            <Link
              key={tool.title}
              href={tool.href}
              className="group flex items-start gap-3 rounded-lg border border-line bg-white px-5 py-[18px] transition-colors hover:border-ink"
            >
              <Calculator className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink group-hover:underline">{tool.title}</span>
                <span className="text-sm text-slate">{tool.body}</span>
              </span>
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-slate" aria-hidden="true" />
            </Link>
          ) : (
            <div
              key={tool.title}
              aria-disabled="true"
              className="flex items-start gap-3 rounded-lg border border-dashed border-line-strong bg-mist px-5 py-[18px]"
            >
              <Calculator className="mt-0.5 size-5 shrink-0 text-slate" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {tool.title}
                  <span className="ml-2 rounded-sm bg-white px-1.5 py-0.5 align-middle text-xs font-medium text-slate ring-1 ring-line">
                    เร็ว ๆ นี้
                  </span>
                </span>
                <span className="text-sm text-slate">{tool.body}</span>
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export function GuidesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseGuidesParams(searchParams), [searchParams]);
  const filtered = state.category !== "all" || state.q !== "";
  const [keyword, setKeyword] = useState(state.q);
  const [syncedQ, setSyncedQ] = useState(state.q);

  // Back/Forward changes the URL under the input; follow it (state adjusted during render, not in an effect).
  if (syncedQ !== state.q) {
    setSyncedQ(state.q);
    setKeyword(state.q);
  }

  const update = (change: Partial<GuidesState>) =>
    router.replace(toGuidesUrl({ ...state, ...change }), { scroll: false });

  const featured = useQuery({ ...articleQueries.list({ featured: true, limit: 1 }), enabled: !filtered });
  const featuredArticle = filtered ? undefined : featured.data?.data[0];

  const feed = useInfiniteQuery(
    articleQueries.feed({
      category: state.category === "all" ? undefined : state.category,
      q: state.q || undefined,
      // The featured article already has its own slot above the grid.
      featured: filtered ? undefined : false,
      limit: GUIDES_PAGE_SIZE,
    }),
  );
  const articles = feed.data?.pages.flatMap((p) => p.data) ?? [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: keyword.trim() });
  };

  return (
    <>
      <section className="border-b border-line bg-mist">
        <Container className="pt-8 pb-8 sm:pt-10 sm:pb-9">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink sm:text-[36px]">บทความ & คู่มือ</h1>
          <p className="mt-1.5 text-[16px] text-slate sm:text-[17px]">
            ความรู้เรื่องซื้อ เช่า ขาย และสินเชื่อ เขียนให้อ่านจบได้ในคืนเดียว
          </p>

          <form role="search" onSubmit={submit} className="relative mt-5 max-w-[480px] sm:mt-6">
            <label htmlFor="guides-q" className="sr-only">
              ค้นหาบทความ
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-slate"
              aria-hidden="true"
            />
            <input
              id="guides-q"
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ค้นหาบทความ เช่น ค่าโอน, สัญญาเช่า"
              enterKeyHint="search"
              className={cn(inputClass, "h-[46px] pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden")}
            />
            {keyword && (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => {
                  setKeyword("");
                  update({ q: "" });
                }}
                className="absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate hover:bg-mist hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </form>

          <div role="group" aria-label="หมวดบทความ" className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
            {[{ value: "all" as const, label: "ทั้งหมด" }, ...articleCategories].map((c) => {
              const active = state.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ category: c.value })}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors",
                    active ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:border-ink",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      <Container className="pt-9 pb-16">
        {!filtered &&
          (featured.isPending ? (
            <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]" aria-hidden="true">
              <Skeleton className="aspect-[16/10] rounded-xl md:aspect-auto md:h-[340px]" />
              <div className="flex flex-col justify-center gap-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            </div>
          ) : (
            featuredArticle && <FeaturedArticle article={featuredArticle} />
          ))}

        {!filtered && <ToolCards />}

        <section aria-labelledby="latest-title" className={cn(!filtered && "mt-12")}>
          <h2 id="latest-title" className="mb-4 text-[22px] font-semibold text-ink">
            {filtered ? (feed.data ? `พบ ${feed.data.pages[0].meta.total} บทความ` : "กำลังค้นหา…") : "บทความล่าสุด"}
          </h2>

          {feed.isPending ? (
            <ArticleGridSkeleton count={GUIDES_PAGE_SIZE} />
          ) : feed.isError && !articles.length ? (
            <QueryError what="บทความ" onRetry={() => feed.refetch()} retrying={feed.isFetching} />
          ) : articles.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="ไม่พบบทความที่ตรงกับการค้นหา"
              body="ลองใช้คำที่สั้นลง หรือเลือกหมวดอื่น"
              action={
                <Button variant="outline" onClick={() => update({ category: "all", q: "" })}>
                  ดูบทความทั้งหมด
                </Button>
              }
            />
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3",
                  feed.isPlaceholderData && "opacity-60 transition-opacity",
                )}
              >
                {articles.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
              {feed.hasNextPage && (
                <div className="mt-9 flex justify-center">
                  <Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
                    {feed.isFetchingNextPage ? "กำลังโหลด…" : "ดูบทความเพิ่ม"}
                  </Button>
                </div>
              )}
              {feed.isFetchNextPageError && (
                <p role="alert" className="mt-3 text-center text-sm text-danger">
                  โหลดบทความเพิ่มไม่สำเร็จ ลองอีกครั้ง
                </p>
              )}
            </>
          )}
        </section>

        <section className="mt-14 flex flex-col items-start gap-5 rounded-xl bg-hero px-6 py-7 text-white sm:flex-row sm:items-center sm:px-9 sm:py-8">
          <div className="flex-1">
            <p className="text-[20px] font-semibold sm:text-[22px]">รับบทความใหม่ทาง LINE เดือนละ 2 ครั้ง</p>
            <p className="text-violet-200">ไม่มีโฆษณาโครงการ ยกเลิกได้ทุกเมื่อ</p>
          </div>
          <Button asChild variant="light" className="font-semibold">
            <a href={guidesLineUrl} target="_blank" rel="noopener noreferrer">
              เพิ่มเพื่อน LINE
            </a>
          </Button>
        </section>
      </Container>
    </>
  );
}

export function GuidesSkeleton() {
  return (
    <>
      <div className="h-[260px] border-b border-line bg-mist" aria-hidden="true" />
      <Container className="pt-9 pb-16">
        <ArticleGridSkeleton count={GUIDES_PAGE_SIZE} />
      </Container>
    </>
  );
}
