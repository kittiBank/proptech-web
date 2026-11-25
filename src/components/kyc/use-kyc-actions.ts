"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import type { KycDto, UpdateKycRequest, UploadKycDocumentRequest } from "@/types/api";

/** Keeps the KYC cache and the seller shell's status pill in step with the server. */
function useKycCache() {
  const client = useQueryClient();
  return {
    set: (data: KycDto) => client.setQueryData(queryKeys.kyc, data),
    refresh: () => {
      client.invalidateQueries({ queryKey: queryKeys.kyc });
      client.invalidateQueries({ queryKey: queryKeys.seller.account });
    },
  };
}

export function useUpdateKyc() {
  const cache = useKycCache();
  return useMutation({
    mutationFn: (body: UpdateKycRequest) => api.updateKyc(body),
    onSuccess: ({ data }) => {
      cache.set(data);
      cache.refresh();
    },
    onError: () => toast("บันทึกไม่สำเร็จ ลองอีกครั้ง"),
  });
}

export function useUploadKycDocument() {
  const cache = useKycCache();
  return useMutation({
    mutationFn: (body: UploadKycDocumentRequest) => api.uploadKycDocument(body),
    onSettled: cache.refresh,
  });
}

export function useRemoveKycDocument() {
  const cache = useKycCache();
  return useMutation({
    mutationFn: (slot: string) => api.removeKycDocument(slot),
    onSuccess: ({ data }) => cache.set(data),
    onError: () => toast("ลบไฟล์ไม่สำเร็จ"),
  });
}

export function useSubmitKyc() {
  const cache = useKycCache();
  return useMutation({
    mutationFn: () => api.submitKyc(),
    onSuccess: ({ data }) => {
      cache.set(data);
      cache.refresh();
      toast("ส่งเอกสารแล้ว ทีมงานจะตรวจภายใน 1 วันทำการ");
    },
    onError: () => toast("ส่งไม่สำเร็จ ตรวจว่าทุกขั้นครบแล้วลองอีกครั้ง"),
  });
}

export function useRestartKyc() {
  const cache = useKycCache();
  return useMutation({
    mutationFn: () => api.restartKyc(),
    onSuccess: ({ data }) => {
      cache.set(data);
      cache.refresh();
    },
  });
}
