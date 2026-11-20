"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { MockHint } from "@/components/auth/auth-fields";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, NativeSelect, TextField, fieldA11y, inputClass } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { otpSchema, profileSchema } from "@/lib/account-schemas";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { formatThaiPhone } from "@/lib/profile";
import { useZodForm } from "@/lib/use-zod-form";
import { cn } from "@/lib/utils";
import { MOCK_OTP_CODE } from "@/mocks/constants";
import type { ProfileDto } from "@/types/api";
import { SettingsSection } from "./section";
import { useApplyProfile, useUpdateProfile } from "./use-profile";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AvatarPicker({ profile }: { profile: ProfileDto }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const update = useUpdateProfile();
  const name = `${profile.firstName} ${profile.lastName}`;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return setError("ใช้ไฟล์ JPG หรือ PNG เท่านั้น");
    if (file.size > MAX_AVATAR_BYTES) return setError("ไฟล์ใหญ่เกิน 5 MB");
    setError(undefined);
    update.mutate({ avatarUrl: await readAsDataUrl(file) }, { onSuccess: () => toast("เปลี่ยนรูปโปรไฟล์แล้ว") });
  };

  return (
    <div className="my-5 flex flex-wrap items-center gap-x-5 gap-y-3">
      <Avatar name={name} src={profile.avatarUrl} size="xl" className="sm:size-20 sm:text-[32px]" />
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={update.isPending}>
            {update.isPending ? "กำลังอัปโหลด…" : "เปลี่ยนรูปโปรไฟล์"}
          </Button>
          {profile.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              className="text-slate"
              onClick={() => update.mutate({ avatarUrl: null }, { onSuccess: () => toast("ลบรูปโปรไฟล์แล้ว") })}
            >
              ลบรูป
            </Button>
          )}
        </div>
        <p className={cn("text-[13px]", error ? "text-danger" : "text-slate")} role={error ? "alert" : undefined}>
          {error ?? "JPG หรือ PNG ไม่เกิน 5 MB"}
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFile}
      />
    </div>
  );
}

/** Phone verification (B7): send an OTP to the saved number, then type the 6-digit code. */
function PhoneVerify({ profile }: { profile: ProfileDto }) {
  const id = useId();
  const apply = useApplyProfile();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const send = useMutation({ mutationFn: api.sendPhoneOtp });
  const verify = useMutation({
    mutationFn: (value: string) => api.verifyPhone({ code: value }),
    onSuccess: ({ data }) => {
      apply(data);
      toast("ยืนยันเบอร์โทรแล้ว");
    },
    onError: (e) =>
      setCodeError(
        e instanceof ApiError && e.status === 400 ? "รหัสไม่ถูกต้องหรือหมดอายุ" : "ยืนยันไม่สำเร็จ ลองอีกครั้ง",
      ),
  });

  if (!profile.phone || profile.phoneVerified) return null;

  const submit = () => {
    const parsed = otpSchema.safeParse({ code });
    if (!parsed.success) return setCodeError(parsed.error.issues[0]?.message);
    setCodeError(undefined);
    verify.mutate(parsed.data.code);
  };

  if (!send.isSuccess) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="base" onClick={() => send.mutate()} disabled={send.isPending}>
          {send.isPending ? "กำลังส่ง…" : "ส่งรหัส OTP"}
        </Button>
        <span className="text-[13px] text-slate">ส่งรหัสไปที่ {formatThaiPhone(profile.phone)}</span>
        {send.isError && (
          <span role="alert" className="text-[13px] text-danger">
            ส่งรหัสไม่สำเร็จ ลองอีกครั้ง
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-md bg-mist p-3">
      <Field id={`${id}-otp`} label={`รหัส 6 หลักที่ส่งไปที่ ${formatThaiPhone(profile.phone)}`} error={codeError}>
        <div className="flex gap-2">
          <input
            {...fieldA11y(`${id}-otp`, codeError)}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => {
              // Enter must not submit the surrounding profile form.
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            className={cn(inputClass, "h-11 max-w-40 tracking-[0.3em] tabular-nums")}
          />
          <Button type="button" size="md" onClick={submit} disabled={verify.isPending}>
            {verify.isPending ? "กำลังยืนยัน…" : "ยืนยัน"}
          </Button>
        </div>
      </Field>
      <MockHint>รหัสคือ {MOCK_OTP_CODE}</MockHint>
    </div>
  );
}

/** "ข้อมูลส่วนตัว" (B7): avatar, names, email, phone with OTP, LINE ID and language. */
export function PersonalInfo({ profile }: { profile: ProfileDto }) {
  const id = useId();
  const update = useUpdateProfile();
  const { errors, setErrors, formProps } = useZodForm(profileSchema, (values) =>
    update.mutate(values, { onSuccess: () => toast("บันทึกข้อมูลส่วนตัวแล้ว") }),
  );
  const badRequest = update.error instanceof ApiError && update.error.status === 400;
  // Remount the form after a save so "ยกเลิก" resets to the saved values.
  const formKey = [profile.firstName, profile.lastName, profile.phone, profile.lineId, profile.language].join("|");

  return (
    <SettingsSection id="personal" title="ข้อมูลส่วนตัว">
      <AvatarPicker profile={profile} />
      <form
        key={formKey}
        {...formProps}
        onReset={() => setErrors({})}
        aria-label="ข้อมูลส่วนตัว"
        className="flex flex-col gap-5"
      >
        <div className="grid gap-x-5 gap-y-[18px] sm:grid-cols-2">
          <TextField
            id={`${id}-first`}
            name="firstName"
            label="ชื่อ"
            autoComplete="given-name"
            defaultValue={profile.firstName}
            error={errors.firstName}
          />
          <TextField
            id={`${id}-last`}
            name="lastName"
            label="นามสกุล"
            autoComplete="family-name"
            defaultValue={profile.lastName}
            error={errors.lastName}
          />
          <TextField
            id={`${id}-email`}
            label="อีเมล"
            labelAside={
              profile.emailVerified ? (
                <StatusPill tone="success">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  ยืนยันแล้ว
                </StatusPill>
              ) : (
                <StatusPill tone="warning">ยังไม่ยืนยัน</StatusPill>
              )
            }
            value={profile.email}
            readOnly
            hint="เปลี่ยนอีเมลได้ที่ศูนย์ช่วยเหลือ"
            className="bg-mist text-slate"
          />
          <div>
            <TextField
              id={`${id}-phone`}
              name="phone"
              type="tel"
              label="เบอร์โทร"
              labelAside={
                profile.phone ? (
                  profile.phoneVerified ? (
                    <StatusPill tone="success">ยืนยันแล้ว</StatusPill>
                  ) : (
                    <StatusPill tone="warning">ยังไม่ยืนยัน</StatusPill>
                  )
                ) : undefined
              }
              autoComplete="tel"
              inputMode="tel"
              placeholder="0812345678"
              defaultValue={profile.phone ? formatThaiPhone(profile.phone) : ""}
              error={errors.phone}
              hint="เปลี่ยนเบอร์แล้วต้องยืนยันใหม่"
            />
            <PhoneVerify profile={profile} />
          </div>
          <TextField
            id={`${id}-line`}
            name="lineId"
            label={
              <>
                LINE ID <span className="font-normal text-slate">(ไม่บังคับ)</span>
              </>
            }
            placeholder="เช่น somying.j"
            autoComplete="off"
            defaultValue={profile.lineId ?? ""}
            error={errors.lineId}
          />
          <Field id={`${id}-lang`} label="ภาษาที่ใช้ติดต่อ">
            <NativeSelect id={`${id}-lang`} name="language" defaultValue={profile.language}>
              <option value="th">ไทย</option>
              <option value="en">English</option>
            </NativeSelect>
          </Field>
        </div>
        {update.isError && (
          <FormAlert>{badRequest ? "ข้อมูลบางช่องไม่ถูกต้อง ตรวจอีกครั้ง" : "บันทึกไม่สำเร็จ ลองอีกครั้ง"}</FormAlert>
        )}
        <div className="flex justify-end gap-2">
          <Button type="reset" variant="ghost">
            ยกเลิก
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
