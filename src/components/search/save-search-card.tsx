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

/** D11 "บันทึกการค้นหานี้ไว้": saves the current filters for alerts. Signed-out visitors log in first. */
export function SaveSearchCard({ state, className }: { state: SearchState; className?: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const requireAuth = useAuthGate();
  const query = savedSearchQuery(state);
  const name = describeSearch(state);

  const mutation = useMutation({
    mutationFn: () => api.createSavedSearch({ name, query }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.savedSearches });
      toast("บันทึกการค้นหาแล้ว เราจะแจ้งเมื่อมีประกาศใหม่", {
        action: { label: "ดูทั้งหมด", onClick: () => router.push(routes.savedSearches) },
      });
    },
  });

  const save = () => mutation.mutate();
  useResumeAction("save-search", query, save);

  // Changing the filters afterwards offers saving the new search.
  const saved = mutation.isSuccess && mutation.data.data.query === query;
  const limit = mutation.error instanceof ApiError && mutation.error.status === 409;

  return (
    <div
      className={cn("flex flex-col gap-4 rounded-xl bg-brand-soft px-5 py-5 sm:flex-row sm:items-center", className)}
    >
      <div className="flex-1">
        <p className="font-semibold text-ink">บันทึกการค้นหานี้ไว้</p>
        <p className="text-sm text-slate">เราจะแจ้งทาง LINE หรืออีเมลทันทีที่มีประกาศตรงทุกเงื่อนไข</p>
        {mutation.isError && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {limit
              ? `บันทึกได้สูงสุด ${MAX_SAVED_SEARCHES} รายการ ลบรายการเก่าที่การค้นหาที่บันทึกไว้ก่อน`
              : "บันทึกไม่สำเร็จ ลองอีกครั้ง"}
          </p>
        )}
      </div>
      {saved ? (
        <Button variant="outline" disabled className="disabled:opacity-100">
          <Check aria-hidden="true" />
          บันทึกแล้ว
        </Button>
      ) : (
        <Button
          disabled={mutation.isPending}
          onClick={() => requireAuth({ intent: "save-search", key: query, preview: { title: name } }, save)}
        >
          <BellRing aria-hidden="true" />
          {mutation.isPending ? "กำลังบันทึก…" : "รับแจ้งเตือน"}
        </Button>
      )}
    </div>
  );
}
