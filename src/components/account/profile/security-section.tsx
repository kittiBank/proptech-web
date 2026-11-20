"use client";

import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PasswordField } from "@/components/auth/auth-fields";
import { LineMark } from "@/components/listing/line-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { changePasswordSchema } from "@/lib/account-schemas";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import { formatTimeAgo } from "@/lib/format";
import { useZodForm } from "@/lib/use-zod-form";
import type { ProfileDto } from "@/types/api";
import { SettingsRow, SettingsSection } from "./section";
import { useApplyProfile } from "./use-profile";

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const id = useId();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.profile });
      onOpenChange(false);
      toast("เปลี่ยนรหัสผ่านแล้ว");
    },
  });
  const { errors, setErrors, formProps } = useZodForm(changePasswordSchema, (values) => mutation.mutate(values));
  const wrongCurrent = mutation.error instanceof ApiError && mutation.error.status === 400;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setErrors({});
          mutation.reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent aria-describedby={`${id}-desc`} className="sm:w-[min(440px,calc(100vw-48px))]">
        <form {...formProps} className="flex flex-col gap-4 p-6 pt-5">
          <div className="pr-10">
            <DialogTitle className="text-lg font-semibold text-ink">เปลี่ยนรหัสผ่าน</DialogTitle>
            <DialogDescription id={`${id}-desc`} className="mt-1 text-sm text-slate">
              อย่างน้อย 8 ตัวอักษร และมีตัวเลขอย่างน้อย 1 ตัว
            </DialogDescription>
          </div>
          <PasswordField
            id={`${id}-current`}
            name="currentPassword"
            label="รหัสผ่านปัจจุบัน"
            autoComplete="current-password"
            error={errors.currentPassword}
          />
          <PasswordField
            id={`${id}-new`}
            name="newPassword"
            label="รหัสผ่านใหม่"
            autoComplete="new-password"
            error={errors.newPassword}
          />
          {mutation.isError && (
            <FormAlert>
              {wrongCurrent ? "รหัสผ่านปัจจุบันไม่ถูกต้อง" : "เปลี่ยนรหัสผ่านไม่สำเร็จ ลองอีกครั้ง"}
            </FormAlert>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProviderBadge({ provider }: { provider: "google" | "line" }) {
  return provider === "line" ? (
    <span className="inline-flex size-10 items-center justify-center [&>span]:size-10 [&>span]:text-base">
      <LineMark />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="inline-flex size-10 items-center justify-center rounded-full border-[1.5px] border-line-strong font-bold text-ink"
    >
      G
    </span>
  );
}

/** "ความปลอดภัยและการเข้าสู่ระบบ" (B7): password, linked sign-ins and devices. */
export function SecuritySection({ profile }: { profile: ProfileDto }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const apply = useApplyProfile();
  const client = useQueryClient();
  const link = useMutation({
    mutationFn: ({ provider, linked }: { provider: "google" | "line"; linked: boolean }) =>
      api.setLinkedAccount(provider, linked),
    onSuccess: ({ data }, { provider, linked }) => {
      apply(data);
      toast(`${linked ? "เชื่อม" : "ยกเลิกการเชื่อม"} ${provider === "line" ? "LINE" : "Google"} แล้ว`);
    },
    onError: () => toast("ทำรายการไม่สำเร็จ ลองอีกครั้ง"),
  });
  const devices = useMutation({
    mutationFn: api.signOutOtherDevices,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.profile });
      toast("ออกจากระบบอุปกรณ์อื่นแล้ว");
    },
  });

  const others = profile.devices.filter((d) => !d.current);
  const current = profile.devices.find((d) => d.current);
  const busy = (provider: "google" | "line") => link.isPending && link.variables?.provider === provider;

  return (
    <SettingsSection id="security" title="ความปลอดภัยและการเข้าสู่ระบบ">
      <div className="mt-3">
        <SettingsRow
          title="รหัสผ่าน"
          detail={
            profile.passwordChangedAt
              ? `เปลี่ยนล่าสุด ${formatTimeAgo(profile.passwordChangedAt)}`
              : "ยังไม่ได้ตั้งรหัสผ่าน"
          }
          action={
            <Button variant="outline" onClick={() => setPasswordOpen(true)}>
              เปลี่ยนรหัสผ่าน
            </Button>
          }
        />
        <SettingsRow
          leading={<ProviderBadge provider="google" />}
          title="Google"
          detail={profile.linked.google ? `เชื่อมกับ ${profile.linked.google}` : "เข้าสู่ระบบด้วยบัญชี Google"}
          action={
            profile.linked.google ? (
              <Button
                variant="ghost"
                className="text-slate"
                disabled={busy("google")}
                onClick={() => link.mutate({ provider: "google", linked: false })}
              >
                ยกเลิกการเชื่อม
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={busy("google")}
                onClick={() => link.mutate({ provider: "google", linked: true })}
              >
                เชื่อม Google
              </Button>
            )
          }
        />
        <SettingsRow
          leading={<ProviderBadge provider="line" />}
          title="LINE"
          detail={
            profile.linked.line
              ? "เชื่อมแล้ว รับการแจ้งเตือนทาง LINE ได้"
              : "เชื่อมเพื่อเข้าสู่ระบบและรับการแจ้งเตือนทาง LINE"
          }
          action={
            profile.linked.line ? (
              <Button
                variant="ghost"
                className="text-slate"
                disabled={busy("line")}
                onClick={() => link.mutate({ provider: "line", linked: false })}
              >
                ยกเลิกการเชื่อม
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={busy("line")}
                onClick={() => link.mutate({ provider: "line", linked: true })}
              >
                เชื่อม LINE
              </Button>
            )
          }
        />
        <SettingsRow
          title="อุปกรณ์ที่เข้าสู่ระบบอยู่"
          detail={[
            current && `${current.name} (เครื่องนี้)`,
            ...others.map((d) => `${d.name} ใช้งานล่าสุด ${formatTimeAgo(d.lastActiveAt)}`),
          ]
            .filter(Boolean)
            .join(" และ ")}
          action={
            <Button
              variant="outline"
              disabled={others.length === 0 || devices.isPending}
              onClick={() => devices.mutate()}
            >
              ออกจากระบบอุปกรณ์อื่น
            </Button>
          }
        />
      </div>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </SettingsSection>
  );
}
