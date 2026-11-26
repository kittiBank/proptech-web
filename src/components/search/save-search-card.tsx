"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import { useAuthGate, useResumeAction } from "@/lib/auth-gate";
import { defaultSearchState, describeSearch, toSearchQueryString, type SearchState } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { MAX_SAVED_SEARCHES } from "@/types/api";

/** The filters only: page, sort and view are not part of a saved search. */
export function savedSearchQuery(state: SearchState): string {
  return toSearchQueryString({
    ...state,
    page: 1,
    sort: defaultSearchState.sort,
    view: defaultSearchState.view,
  });
}

/**
 * Saves a search for alerts (`POST /me/saved-searches`). Signed-out visitors log in first and the
 * save resumes afterwards. Used by D11 and the closed-listing "notify me" (D9).
 */
export function useSaveSearch(state: SearchState, name = describeSearch(state)) {
  const router = useRouter();
  const client = useQueryClient();
  const requireAuth = useAuthGate();
  const query = savedSearchQuery(state);

  const mutation = useMutation({
    mutationFn: () => api.createSavedSearch({ name, query }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.savedSearches });
      toast("บันทึกการค้นหาแล้ว เราจะแจ้งเมื่อมีประกาศใหม่", {
        action: { label: "ดูทั้งหมด", onClick: () => router.push(routes.savedSearches) },
      });
    },
  });

  const run = () => mutation.mutate();
  useResumeAction("save-search", query, run);

  const limit = mutation.error instanceof ApiError && mutation.error.status === 409;
  return {
    save: () => requireAuth({ intent: "save-search", key: query, preview: { title: name } }, run),
    // Changing the filters afterwards offers saving the new search.
    saved: mutation.isSuccess && mutation.data.data.query === query,
    pending: mutation.isPending,
    error: mutation.isError
      ? limit
        ? `บันทึกได้สูงสุด ${MAX_SAVED_SEARCHES} รายการ ลบรายการเก่าที่การค้นหาที่บันทึกไว้ก่อน`
        : "บันทึกไม่สำเร็จ ลองอีกครั้ง"
      : undefined,
  };
}

/** D11 "บันทึกการค้นหานี้ไว้": saves the current filters for alerts. */
export function SaveSearchCard({ state, className }: { state: SearchState; className?: string }) {
  const { save, saved, pending, error } = useSaveSearch(state);

  return (
    <div
      className={cn("flex flex-col gap-4 rounded-xl bg-brand-soft px-5 py-5 sm:flex-row sm:items-center", className)}
    >
      <div className="flex-1">
        <p className="font-semibold text-ink">บันทึกการค้นหานี้ไว้</p>
        <p className="text-sm text-slate">เราจะแจ้งทาง LINE หรืออีเมลทันทีที่มีประกาศตรงทุกเงื่อนไข</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {saved ? (
        <Button variant="outline" disabled className="disabled:opacity-100">
          <Check aria-hidden="true" />
          บันทึกแล้ว
        </Button>
      ) : (
        <Button disabled={pending} onClick={save}>
          <BellRing aria-hidden="true" />
          {pending ? "กำลังบันทึก…" : "รับแจ้งเตือน"}
        </Button>
      )}
    </div>
  );
}
