"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import type { UpdateViewingRequest } from "@/types/api";

/** Refreshes everything that shows viewings: chats, appointments, badges and the seller dashboard. */
export function useRefreshViewings() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: queryKeys.threads.all });
    client.invalidateQueries({ queryKey: queryKeys.appointments });
    client.invalidateQueries({ queryKey: queryKeys.unreadCounts });
    // Seller dashboard badges and the overview's to-do list.
    client.invalidateQueries({ queryKey: queryKeys.seller.all });
  };
}

const done: Partial<Record<UpdateViewingRequest["action"], string>> = {
  cancel: "ยกเลิกแล้ว",
  accept: "รับเวลาใหม่แล้ว นัดของคุณได้รับการยืนยัน",
  confirm: "ยืนยันนัดแล้ว",
  decline: "ปฏิเสธคำขอแล้ว",
  propose: "ส่งเวลาใหม่ให้ผู้สนใจแล้ว",
};

/** `PATCH /me/viewings/:id` with a toast and a refresh of every view that lists viewings. */
export function useUpdateViewing() {
  const refresh = useRefreshViewings();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateViewingRequest & { id: string }) => api.updateViewing(id, body),
    onSuccess: (_d, { action }) => toast(done[action] ?? "บันทึกแล้ว"),
    onError: () => toast("ทำรายการไม่สำเร็จ สถานะอาจเปลี่ยนไปแล้ว ลองโหลดใหม่"),
    onSettled: refresh,
  });
}
