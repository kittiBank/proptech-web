"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import type { AddCardRequest, CreateOrderRequest, OrderDto, PayOrderRequest, UpdateBillingRequest } from "@/types/api";

/** Billing, credit and the seller dashboard all move when money does. */
function useRefreshBilling() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: queryKeys.billing.all });
    client.invalidateQueries({ queryKey: queryKeys.seller.all });
  };
}

/** `POST /me/orders`, then open checkout. */
export function useCreateOrder() {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: CreateOrderRequest) => api.createOrder(body),
    onSuccess: ({ data }) => router.push(routes.checkout(data.id)),
    onError: () => toast("สร้างรายการชำระเงินไม่สำเร็จ ลองอีกครั้ง"),
  });
}

export function payErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 402) return "เครดิตไม่พอสำหรับรายการนี้ เลือกวิธีชำระอื่น";
  if (error instanceof ApiError && error.status === 409) return "รายการนี้ชำระแล้วหรือถูกยกเลิก โหลดหน้าใหม่อีกครั้ง";
  return "ชำระเงินไม่สำเร็จ ลองอีกครั้ง";
}

/** `POST /me/orders/:id/pay`. The order in the cache is replaced with the answer. */
export function usePayOrder(id: string) {
  const client = useQueryClient();
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (body: PayOrderRequest) => api.payOrder(id, body),
    onSuccess: ({ data }) => {
      client.setQueryData<OrderDto>(queryKeys.billing.order(id), data);
      if (data.status === "paid") refresh();
    },
  });
}

export function useApplyCoupon(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.applyCoupon(id, code),
    onSuccess: ({ data }) => {
      client.setQueryData<OrderDto>(queryKeys.billing.order(id), data);
      toast(`ใช้โค้ด ${data.coupon} แล้ว`);
    },
  });
}

export function useRequestRefund() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (id: string) => api.requestRefund(id),
    onSuccess: () => toast("ส่งคำขอคืนเงินแล้ว ทีมงานจะตอบภายใน 3 วันทำการ"),
    onError: () => toast("ขอคืนเงินไม่สำเร็จ ลองอีกครั้ง"),
    onSettled: refresh,
  });
}

export function useUpdateBilling() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (body: UpdateBillingRequest) => api.updateBilling(body),
    onSuccess: (_d, body) =>
      toast(
        body.autoRenew === false
          ? "ยกเลิกการต่ออายุแล้ว ใช้แพ็กเกจได้ถึงสิ้นรอบบิล"
          : body.autoRenew
            ? "เปิดการต่ออายุอัตโนมัติแล้ว"
            : "บันทึกแล้ว",
      ),
    onError: () => toast("บันทึกไม่สำเร็จ ตรวจข้อมูลแล้วลองอีกครั้ง"),
    onSettled: refresh,
  });
}

export function useAddCard() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (body: AddCardRequest) => api.addCard(body),
    onSuccess: ({ data }) => toast(`เพิ่มบัตรลงท้าย ${data.last4} แล้ว`),
    onSettled: refresh,
  });
}

export function useRemoveCard() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (id: string) => api.removeCard(id),
    onSuccess: () => toast("ลบบัตรแล้ว"),
    onError: () => toast("ลบบัตรไม่สำเร็จ"),
    onSettled: refresh,
  });
}

export function useSetPrimaryCard() {
  const refresh = useRefreshBilling();
  return useMutation({
    mutationFn: (id: string) => api.setPrimaryCard(id),
    onSuccess: () => toast("ตั้งเป็นบัตรหลักแล้ว"),
    onSettled: refresh,
  });
}
