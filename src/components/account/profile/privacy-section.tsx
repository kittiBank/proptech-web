"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import type { ProfileDto } from "@/types/api";
import { SettingsRow, SettingsSection } from "./section";
import { useUpdateProfile } from "./use-profile";

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const id = useId();
  const router = useRouter();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      client.setQueryData(queryKeys.session, null);
      client.removeQueries({ queryKey: ["me"] });
      router.push(routes.home);
      toast("ลบบัญชีแล้ว ขอบคุณที่ใช้ PropertyHub");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={`${id}-desc`} className="sm:w-[min(460px,calc(100vw-48px))]">
        <div className="flex flex-col gap-4 p-6 pt-5">
          <DialogTitle className="pr-10 text-lg font-semibold text-ink">ลบบัญชีถาวร?</DialogTitle>
          <DialogDescription id={`${id}-desc`} className="text-[15px] text-slate">
            โปรไฟล์ รายการโปรด การค้นหาที่บันทึกไว้ และข้อความทั้งหมดจะถูกลบ กู้คืนไม่ได้
          </DialogDescription>
          <Callout tone="warning" title="ประกาศของคุณจะถูกปิดด้วย">
            ถ้ามีประกาศที่ยังเปิดอยู่ ผู้สนใจจะติดต่อคุณไม่ได้อีก
          </Callout>
          {mutation.isError && <FormAlert>ลบบัญชีไม่สำเร็จ ลองอีกครั้ง</FormAlert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger-solid" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "กำลังลบ…" : "ลบบัญชีถาวร"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** "ข้อมูลส่วนบุคคล" (B7): PDPA data copy, marketing consent and account deletion. */
export function PrivacySection({ profile }: { profile: ProfileDto }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const marketing = useUpdateProfile({ optimistic: true });
  const exportData = useMutation({
    mutationFn: api.requestDataExport,
    onSuccess: () => toast(`เราจะส่งไฟล์ข้อมูลไปที่ ${profile.email} ภายใน 24 ชั่วโมง`),
    onError: () => toast("ส่งคำขอไม่สำเร็จ ลองอีกครั้ง"),
  });

  return (
    <SettingsSection id="privacy" title="ข้อมูลส่วนบุคคล">
      <div className="mt-3">
        <SettingsRow
          title="ดาวน์โหลดข้อมูลของฉัน"
          detail="ไฟล์ข้อมูลบัญชี รายการโปรด และข้อความ ตามสิทธิ์ใน พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล"
          action={
            <Button
              variant="outline"
              onClick={() => exportData.mutate()}
              disabled={exportData.isPending || exportData.isSuccess}
            >
              {exportData.isSuccess ? "ส่งคำขอแล้ว" : "ขอไฟล์ข้อมูล"}
            </Button>
          }
        />
        <SettingsRow
          title="รับข่าวสารและโปรโมชัน"
          detail="โครงการใหม่และข้อเสนอจากพาร์ทเนอร์"
          action={
            <Switch
              hideLabel
              label="รับข่าวสารและโปรโมชัน"
              checked={profile.marketingOptIn}
              onCheckedChange={(on) => marketing.mutate({ marketingOptIn: on })}
            />
          }
        />
        <SettingsRow
          tone="danger"
          title="ลบบัญชี"
          detail="ลบโปรไฟล์ รายการโปรด และการค้นหาที่บันทึกไว้ทั้งหมด กู้คืนไม่ได้"
          action={
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              ลบบัญชี
            </Button>
          }
        />
      </div>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </SettingsSection>
  );
}
