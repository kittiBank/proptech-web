"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import type { AvailabilityDto, BulkListingsRequest, PromoteListingsRequest } from "@/types/api";

/** Refreshes every seller view (listings, counts, overview, package usage). */
function useRefreshSeller() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.seller.all });
}

const bulkDone = { renew: "ต่ออายุ", close: "ปิดประกาศ" } as const;

/** `POST /me/listings/bulk`: renew or close, with a toast that says how many changed. */
export function useBulkListings() {
  const refresh = useRefreshSeller();
  return useMutation({
    mutationFn: (body: BulkListingsRequest) => api.bulkUpdateListings(body),
    onSuccess: ({ data }, { action }) => {
      const skipped = data.skipped.length ? ` (ข้าม ${data.skipped.length} รายการที่ทำไม่ได้)` : "";
      toast(`${bulkDone[action]}แล้ว ${data.updated.length} ประกาศ${skipped}`);
    },
    onError: () => toast("ทำรายการไม่สำเร็จ ลองอีกครั้ง"),
    onSettled: refresh,
  });
}

/** Thai message for a failed promote call. */
export function promoteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 402) return "เครดิตไม่พอ เติมเครดิตหรือเลือกตัวเลือกอื่น";
    if (error.status === 409 && error.body?.message === "sold_out") return "ที่ปักหมุดหน้าแรกเต็มแล้วในสัปดาห์นี้";
    if (error.status === 409) return "โปรโมตได้เฉพาะประกาศที่เผยแพร่อยู่";
  }
  return "เริ่มโปรโมตไม่สำเร็จ ลองอีกครั้ง";
}

/** `POST /me/listings/promote`. Errors are shown in the dialog, so there is no error toast. */
export function usePromoteListings() {
  const refresh = useRefreshSeller();
  return useMutation({
    mutationFn: (body: PromoteListingsRequest) => api.promoteListings(body),
    onSuccess: ({ data }) =>
      toast(
        `เริ่มโปรโมต ${data.promoted.length} ประกาศแล้ว${data.charged ? ` หักเครดิต ฿${formatNumber(data.charged)}` : ""}`,
      ),
    onSettled: refresh,
  });
}

/** `PUT /me/availability`. */
export function useSaveAvailability() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AvailabilityDto) => api.updateAvailability(body),
    onSuccess: ({ data }) => {
      client.setQueryData(queryKeys.seller.availability, data);
      toast("บันทึกเวลารับนัดแล้ว");
    },
    onError: () => toast("บันทึกไม่สำเร็จ ตรวจเวลาเริ่มให้อยู่ก่อนเวลาสิ้นสุด"),
  });
}
