"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert, TextField } from "@/components/ui/field";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { registerSchema } from "@/lib/auth-schemas";
import { useZodForm } from "@/lib/use-zod-form";
import { useApplySession } from "@/providers/session";
import type { UserDto } from "@/types/api";
import { Checkbox, PasswordField, PasswordStrength } from "./auth-fields";

/** B2: name, email, password with strength rules, terms and marketing consent. */
export function RegisterForm({ onRegistered }: { onRegistered: (user: UserDto) => void }) {
  const id = useId();
  const apply = useApplySession();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const mutation = useMutation({
    mutationFn: api.register,
    onSuccess: ({ data }) => {
      apply(data);
      onRegistered(data);
    },
  });
  const { errors, formProps } = useZodForm(registerSchema, (values) => mutation.mutate(values));
  const taken = mutation.error instanceof ApiError && mutation.error.status === 409;

  return (
    <form {...formProps} aria-label="สมัครสมาชิกด้วยอีเมล" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id={`${id}-first`}
          name="firstName"
          label="ชื่อ"
          autoComplete="given-name"
          error={errors.firstName}
        />
        <TextField
          id={`${id}-last`}
          name="lastName"
          label="นามสกุล"
          autoComplete="family-name"
          error={errors.lastName}
        />
      </div>
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        inputMode="email"
        label="อีเมล"
        autoComplete="email"
        error={taken ? "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ" : errors.email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordField
        id={`${id}-password`}
        name="password"
        label="รหัสผ่าน"
        autoComplete="new-password"
        error={errors.password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordStrength password={password} email={email} />
      <Checkbox name="acceptTerms" error={errors.acceptTerms}>
        ฉันยอมรับ{" "}
        <Link href="/legal/terms" className="text-brand-strong underline underline-offset-4">
          ข้อกำหนดการใช้งาน
        </Link>{" "}
        และ{" "}
        <Link href="/legal/privacy" className="text-brand-strong underline underline-offset-4">
          นโยบายความเป็นส่วนตัว
        </Link>{" "}
        (จำเป็น)
      </Checkbox>
      <Checkbox name="marketing" className="text-slate">
        รับข่าวสารโครงการใหม่และโปรโมชันทางอีเมล (เลือกได้ ยกเลิกเมื่อไรก็ได้)
      </Checkbox>
      {mutation.isError && !taken && (
        <FormAlert>
          <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง
        </FormAlert>
      )}
      {taken && (
        <p className="text-sm text-ink">
          <Link href={routes.login()} className="font-medium text-brand-strong underline-offset-4 hover:underline">
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </p>
      )}
      <Button type="submit" size="lg" disabled={mutation.isPending} className="font-semibold">
        {mutation.isPending ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
      </Button>
    </form>
  );
}
