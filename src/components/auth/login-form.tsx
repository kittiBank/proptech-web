"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert, TextField } from "@/components/ui/field";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { loginSchema } from "@/lib/auth-schemas";
import { useZodForm } from "@/lib/use-zod-form";
import { DEMO_ACCOUNT } from "@/mocks/constants";
import { useApplySession } from "@/providers/session";
import type { UserDto } from "@/types/api";
import { Checkbox, MockHint, PasswordField } from "./auth-fields";

/** Email + password sign-in (B1, B5, B6). */
export function LoginForm({ onSignedIn, autoFocus }: { onSignedIn: (user: UserDto) => void; autoFocus?: boolean }) {
  const id = useId();
  const apply = useApplySession();
  const mutation = useMutation({
    mutationFn: api.login,
    onSuccess: ({ data }) => {
      apply(data);
      onSignedIn(data);
    },
  });
  const { errors, formProps } = useZodForm(loginSchema, (values) => mutation.mutate(values));
  const wrongPassword = mutation.error instanceof ApiError && mutation.error.status === 401;

  return (
    <form {...formProps} aria-label="เข้าสู่ระบบด้วยอีเมล" className="flex flex-col gap-4">
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        label="อีเมล"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        autoFocus={autoFocus}
        error={errors.email}
      />
      <PasswordField
        id={`${id}-password`}
        name="password"
        label="รหัสผ่าน"
        autoComplete="current-password"
        error={errors.password}
        labelAside={
          <Link
            href={routes.forgotPassword}
            className="text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            ลืมรหัสผ่าน
          </Link>
        }
      />
      <Checkbox name="remember" defaultChecked>
        จำการเข้าสู่ระบบในเครื่องนี้
      </Checkbox>
      {mutation.isError && (
        <FormAlert>
          <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          <span>
            {wrongPassword
              ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองอีกครั้ง หรือกด “ลืมรหัสผ่าน” เพื่อตั้งรหัสใหม่"
              : "เข้าสู่ระบบไม่สำเร็จ การเชื่อมต่อขัดข้อง ลองอีกครั้ง"}
          </span>
        </FormAlert>
      )}
      <Button type="submit" size="lg" disabled={mutation.isPending} className="font-semibold">
        {mutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
      <MockHint>
        ใช้ {DEMO_ACCOUNT.email} รหัส {DEMO_ACCOUNT.password} หรือปุ่ม Google/LINE
      </MockHint>
    </form>
  );
}
