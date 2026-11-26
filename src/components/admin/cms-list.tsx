"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { articleCategoryLabels } from "@/data/articles";
import { adminRoutes } from "@/lib/admin";
import { cmsStatusInfo } from "@/lib/admin-queues";
import { adminApi, adminKeys, cmsArticlesQuery } from "@/lib/api/admin";
import type { CmsArticleSummaryDto } from "@/types/api";
import { AdminPageHeader } from "./admin-shell";

const stamp = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

const columns: DataColumn<CmsArticleSummaryDto>[] = [
  {
    id: "title",
    header: "บทความ",
    cell: (a) => (
      <>
        <Link href={adminRoutes.cmsArticle(a.id)} className="block font-semibold text-ink hover:text-brand-strong">
          {a.title}
        </Link>
        <span className="text-xs text-slate">/guides/{a.slug}</span>
      </>
    ),
  },
  { id: "category", header: "หมวด", cell: (a) => articleCategoryLabels[a.category] },
  {
    id: "status",
    header: "สถานะ",
    cell: (a) => (
      <StatusPill tone={cmsStatusInfo[a.status].tone} className="h-5 px-2 text-[11px]">
        {cmsStatusInfo[a.status].label}
      </StatusPill>
    ),
  },
  {
    id: "updated",
    header: "แก้ไขล่าสุด",
    cell: (a) => (
      <span className="whitespace-nowrap">
        {stamp.format(new Date(a.updatedAt))}
        <span className="block text-xs text-slate">{a.updatedBy}</span>
      </span>
    ),
  },
  {
    id: "edit",
    header: <span className="sr-only">การดำเนินการ</span>,
    align: "right",
    cell: (a) => (
      <Button asChild variant="outline" size="sm" aria-label={`แก้ไข ${a.title}`}>
        <Link href={adminRoutes.cmsArticle(a.id)}>แก้ไข</Link>
      </Button>
    ),
  },
];

/** Article list for the CMS (E9). */
export function CmsList() {
  const router = useRouter();
  const client = useQueryClient();
  const { data, isPending, isError, refetch, isFetching } = useQuery(cmsArticlesQuery);
  const create = useMutation({
    mutationFn: adminApi.createCmsArticle,
    onSuccess: ({ data: article }) => {
      client.invalidateQueries({ queryKey: adminKeys.cms });
      router.push(adminRoutes.cmsArticle(article.id));
    },
    onError: () => toast("สร้างบทความไม่สำเร็จ ลองอีกครั้ง"),
  });

  return (
    <>
      <AdminPageHeader
        title="บทความ"
        description="คู่มือและบทความในหน้า /guides"
        actions={
          <Button size="sm" disabled={create.isPending} onClick={() => create.mutate()}>
            <Plus aria-hidden="true" />
            บทความใหม่
          </Button>
        }
      />
      {isPending ? (
        <div
          role="status"
          aria-label="กำลังโหลดบทความ"
          className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="บทความ" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <DataTable caption="บทความ" columns={columns} rows={data.data} getRowId={(a) => a.id} />
      )}
    </>
  );
}
