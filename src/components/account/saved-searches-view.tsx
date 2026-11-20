"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect, TextField } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { savedSearchNameSchema } from "@/lib/account-schemas";
import { api } from "@/lib/api/endpoints";
import { propertyQueries, queryKeys, savedSearchesQuery } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import { formatThaiDate } from "@/lib/listing";
import { parseSearchParams, searchCriteria, toListQuery } from "@/lib/search-params";
import { useZodForm } from "@/lib/use-zod-form";
import {
  MAX_SAVED_SEARCHES,
  type AlertFrequency,
  type ListSavedSearchesResponse,
  type SavedSearchDto,
  type UpdateSavedSearchRequest,
} from "@/types/api";

const frequencies: { value: AlertFrequency; label: string }[] = [
  { value: "instant", label: "ทันทีที่มีประกาศใหม่" },
  { value: "daily", label: "วันละครั้ง" },
  { value: "weekly", label: "สัปดาห์ละครั้ง" },
];

/** Cache-first edits: the list changes at once and rolls back if the request fails. */
function useSavedSearchActions() {
  const client = useQueryClient();
  const key = queryKeys.savedSearches;
  const patchCache = (fn: (rows: SavedSearchDto[]) => SavedSearchDto[]) =>
    client.setQueryData<ListSavedSearchesResponse>(key, (old) => (old ? { data: fn(old.data) } : old));

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSavedSearchRequest }) => api.updateSavedSearch(id, body),
    onMutate: async ({ id, body }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ListSavedSearchesResponse>(key);
      patchCache((rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, name: body.name ?? r.name, alerts: { ...r.alerts, ...body.alerts } } : r,
        ),
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      client.setQueryData(key, context?.previous);
      toast("บันทึกไม่สำเร็จ ลองอีกครั้ง");
    },
  });

  const restore = useMutation({
    mutationFn: async (search: SavedSearchDto) => {
      const { data } = await api.createSavedSearch({ name: search.name, query: search.query });
      return api.updateSavedSearch(data.id, { alerts: search.alerts });
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (search: SavedSearchDto) => api.deleteSavedSearch(search.id),
    onMutate: async (search) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ListSavedSearchesResponse>(key);
      patchCache((rows) => rows.filter((r) => r.id !== search.id));
      return { previous };
    },
    onError: (_e, _v, context) => {
      client.setQueryData(key, context?.previous);
      toast("ลบไม่สำเร็จ ลองอีกครั้ง");
    },
    onSuccess: (_d, search) =>
      toast(`ลบ “${search.name}” แล้ว`, { action: { label: "เลิกทำ", onClick: () => restore.mutate(search) } }),
  });

  return { update, remove };
}

function RenameDialog({
  search,
  onClose,
  onSave,
}: {
  search: SavedSearchDto | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const id = useId();
  const { errors, setErrors, formProps } = useZodForm(savedSearchNameSchema, ({ name }) => {
    onSave(name);
    onClose();
  });
  return (
    <Dialog
      open={Boolean(search)}
      onOpenChange={(open) => {
        if (!open) {
          setErrors({});
          onClose();
        }
      }}
    >
      <DialogContent aria-describedby={`${id}-desc`} className="sm:w-[min(440px,calc(100vw-48px))]">
        {search && (
          <form {...formProps} className="flex flex-col gap-4 p-6 pt-5">
            <div className="pr-10">
              <DialogTitle className="text-lg font-semibold text-ink">แก้ไขชื่อการค้นหา</DialogTitle>
              <DialogDescription id={`${id}-desc`} className="mt-1 text-sm text-slate">
                ชื่อนี้ใช้ในอีเมลและ LINE ที่แจ้งเตือน
              </DialogDescription>
            </div>
            <TextField id={`${id}-name`} name="name" label="ชื่อ" defaultValue={search.name} error={errors.name} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SavedSearchCard({
  search,
  onUpdate,
  onRename,
  onDelete,
}: {
  search: SavedSearchDto;
  onUpdate: (body: UpdateSavedSearchRequest) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const state = parseSearchParams(new URLSearchParams(search.query));
  const criteria = [state.mode === "buy" ? "ซื้อ" : "เช่า", ...searchCriteria(state).map((c) => c.label)];
  const { data } = useQuery(propertyQueries.list(toListQuery({ ...state, page: 1 })));
  const titleId = `${id}-title`;

  return (
    <li>
      <article
        aria-labelledby={titleId}
        className="grid gap-x-6 gap-y-4 rounded-[10px] border border-line bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6 sm:py-[22px]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {search.name}
            </h2>
            {search.newCount > 0 && (
              <span className="inline-flex h-6 items-center rounded-full bg-brand px-2.5 text-xs font-semibold text-white">
                ใหม่ {formatNumber(search.newCount)} ประกาศ
              </span>
            )}
          </div>
          <ul aria-label="เงื่อนไข" className="mt-2.5 flex flex-wrap gap-1.5">
            {criteria.map((c) => (
              <li
                key={c}
                className="inline-flex h-[30px] items-center rounded-full bg-mist px-2.5 text-[13px] text-ink"
              >
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[13px] text-slate">
            {data ? `${formatNumber(data.meta.total)} ประกาศตรงเงื่อนไขตอนนี้ · ` : ""}บันทึกเมื่อ{" "}
            {formatThaiDate(search.createdAt)}
          </p>
        </div>
        <div className="flex flex-row-reverse flex-wrap items-center justify-end gap-2 sm:flex-col sm:items-end">
          <Button asChild variant="ink">
            <Link href={`/search?${search.query}`} aria-describedby={titleId}>
              ดูผลการค้นหา
            </Link>
          </Button>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="sm" onClick={onRename} aria-describedby={titleId}>
              แก้ไข
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-soft"
              onClick={onDelete}
              aria-describedby={titleId}
            >
              ลบ
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3.5 text-sm sm:col-span-2">
          <span className="font-medium text-ink">แจ้งเตือน</span>
          <Switch
            label="อีเมล"
            checked={search.alerts.email}
            onCheckedChange={(email) => onUpdate({ alerts: { email } })}
          />
          <Switch
            label="LINE"
            checked={search.alerts.line}
            onCheckedChange={(line) => onUpdate({ alerts: { line } })}
          />
          <label htmlFor={`${id}-freq`} className="sr-only">
            ความถี่การแจ้งเตือน
          </label>
          <NativeSelect
            id={`${id}-freq`}
            value={search.alerts.frequency}
            onChange={(e) => onUpdate({ alerts: { frequency: e.target.value as AlertFrequency } })}
            disabled={!search.alerts.email && !search.alerts.line}
            className="h-10 w-auto text-sm"
          >
            {frequencies.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </article>
    </li>
  );
}

/** `/account/saved-searches` (B9): saved searches with new-listing counts and alert settings. */
export function SavedSearchesView() {
  const { data, isPending, isError, isFetching, refetch } = useQuery(savedSearchesQuery);
  const { update, remove } = useSavedSearchActions();
  const [renaming, setRenaming] = useState<SavedSearchDto | null>(null);
  const searches = data?.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">
            การค้นหาที่บันทึกไว้
          </h1>
          <p className="mt-1 text-slate">
            เราแจ้งเมื่อมีประกาศใหม่ที่ตรงเงื่อนไข บันทึกได้สูงสุด {MAX_SAVED_SEARCHES} รายการ
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.search({ mode: "buy" })}>
            <Plus aria-hidden="true" />
            ค้นหาใหม่
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div role="status" aria-label="กำลังโหลดการค้นหาที่บันทึกไว้" className="mt-6 flex flex-col gap-3.5">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-[10px]" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="การค้นหาที่บันทึกไว้" onRetry={() => refetch()} retrying={isFetching} className="mt-6" />
      ) : searches.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="ยังไม่มีการค้นหาที่บันทึกไว้"
          body="ค้นหาตามทำเลและงบที่สนใจ แล้วกด “รับแจ้งเตือน” เราจะบอกทันทีที่มีประกาศใหม่"
          action={
            <Button asChild size="lg">
              <Link href={routes.search({ mode: "buy" })}>เริ่มค้นหา</Link>
            </Button>
          }
          className="mt-6 rounded-lg bg-white"
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-3.5">
          {searches.map((s) => (
            <SavedSearchCard
              key={s.id}
              search={s}
              onUpdate={(body) => update.mutate({ id: s.id, body })}
              onRename={() => setRenaming(s)}
              onDelete={() => remove.mutate(s)}
            />
          ))}
        </ul>
      )}

      <p className="mt-5 text-sm text-slate">
        ปิดการแจ้งเตือนทั้งหมดได้ที่{" "}
        <Link
          href={`${routes.profile}#notifications`}
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          การตั้งค่าการแจ้งเตือน
        </Link>
      </p>

      <RenameDialog
        search={renaming}
        onClose={() => setRenaming(null)}
        onSave={(name) => renaming && update.mutate({ id: renaming.id, body: { name } })}
      />
    </div>
  );
}
