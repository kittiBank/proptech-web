"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { MockHint, PasswordField } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { FormAlert, TextField } from "@/components/ui/field";
import { safeAdminNext } from "@/lib/admin";
import { adminApi, adminKeys, adminSessionQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { DEMO_ADMIN } from "@/mocks/constants";
import { ADMIN_IDLE_MINUTES, type AdminLoginResponse } from "@/types/api";
import { AdminBrand } from "./admin-brand";
import { CodeInput } from "./code-input";

type Challenge = AdminLoginResponse["data"];

function codeError(error: unknown): string {
  if (!(error instanceof ApiError)) return "ยืนยันไม่สำเร็จ การเชื่อมต่อขัดข้อง ลองอีกครั้ง";
  if (error.status === 401) {
    const left = /(\d+) attempts left/.exec(String(error.body?.message))?.[1];
    return left ? `รหัสไม่ถูกต้อง ลองได้อีก ${left} ครั้ง` : "รหัสไม่ถูกต้อง";
  }
  if (error.status === 429) return "ใส่รหัสผิดหลายครั้ง ระบบล็อกการยืนยันนี้แล้ว เริ่มเข้าสู่ระบบใหม่";
  if (error.status === 410) return "หมดเวลายืนยัน เริ่มเข้าสู่ระบบใหม่";
  return "ยืนยันไม่สำเร็จ ลองอีกครั้ง";
}

function PasswordStep({ onChallenge }: { onChallenge: (c: Challenge) => void }) {
  const id = useId();
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const mutation = useMutation({ mutationFn: adminApi.login, onSuccess: ({ data }) => onChallenge(data) });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const next = {
      email: email ? undefined : "กรอกอีเมลบริษัท",
      password: password ? undefined : "กรอกรหัสผ่าน",
    };
    setErrors(next);
    if (!next.email && !next.password) mutation.mutate({ email, password });
  };

  const wrong = mutation.error instanceof ApiError && mutation.error.status === 401;
  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h1 id={`${id}-title`} className="mt-5 text-[22px] font-semibold text-ink">
        เข้าสู่ระบบแอดมิน
      </h1>
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        label="อีเมลบริษัท"
        autoComplete="username"
        error={errors.email}
        autoFocus
      />
      <PasswordField
        id={`${id}-password`}
        name="password"
        label="รหัสผ่าน"
        autoComplete="current-password"
        error={errors.password}
      />
      {mutation.isError && (
        <FormAlert>
          <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          <span>{wrong ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : "เข้าสู่ระบบไม่สำเร็จ การเชื่อมต่อขัดข้อง ลองอีกครั้ง"}</span>
        </FormAlert>
      )}
      <Button type="submit" size="md" disabled={mutation.isPending}>
        {mutation.isPending ? "กำลังตรวจสอบ…" : "ถัดไป"}
      </Button>
      <MockHint>
        ใช้ {DEMO_ADMIN.email} รหัส {DEMO_ADMIN.password}
      </MockHint>
    </form>
  );
}

function CodeStep({ challenge, onRestart }: { challenge: Challenge; onRestart: () => void }) {
  const id = useId();
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [code, setCode] = useState("");
  const [keyNote, setKeyNote] = useState(false);
  const mutation = useMutation({
    mutationFn: adminApi.verify,
    onSuccess: ({ data }) => {
      client.removeQueries({ queryKey: adminKeys.all });
      client.setQueryData(adminKeys.session, data);
      router.replace(safeAdminNext(params.get("next")));
    },
    onError: () => setCode(""),
  });
  const dead = mutation.error instanceof ApiError && (mutation.error.status === 429 || mutation.error.status === 410);
  const error = mutation.isError ? codeError(mutation.error) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === 6) mutation.mutate({ challengeId: challenge.challengeId, code });
  };

  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${id}-title`}>
      <h1 id={`${id}-title`} className="mt-5 text-[22px] font-semibold text-ink">
        ยืนยันตัวตนขั้นที่ 2
      </h1>
      <p className="mt-0.5 text-sm text-slate">
        {challenge.name} · {challenge.email}
      </p>
      <label htmlFor={`${id}-code`} className="mt-5 mb-2 block font-medium text-ink">
        รหัส 6 หลักจากแอป Authenticator
      </label>
      <CodeInput
        id={`${id}-code`}
        value={code}
        onChange={setCode}
        invalid={Boolean(error)}
        describedBy={error ? `${id}-error` : undefined}
        disabled={dead || mutation.isPending}
        autoFocus
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {dead ? (
        <Button type="button" className="mt-5 w-full" onClick={onRestart}>
          เริ่มเข้าสู่ระบบใหม่
        </Button>
      ) : (
        <Button type="submit" className="mt-5 w-full" disabled={code.length < 6 || mutation.isPending}>
          {mutation.isPending ? "กำลังยืนยัน…" : "ยืนยัน"}
        </Button>
      )}
      <p className="mt-3.5 text-center text-sm">
        <Button type="button" variant="link" onClick={() => setKeyNote(true)}>
          ใช้ security key แทน
        </Button>
      </p>
      {keyNote && (
        <p role="status" className="mt-1 text-center text-[13px] text-slate">
          เสียบ security key แล้วแตะเมื่อไฟกะพริบ (ใช้ได้เมื่อเชื่อมระบบจริง)
        </p>
      )}
      <div className="mt-4">
        <MockHint>รหัสจากแอปคือ {DEMO_ADMIN.code}</MockHint>
      </div>
    </form>
  );
}

/** E11: password, then a TOTP code. Admins have no other way in. */
export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: admin } = useQuery(adminSessionQuery);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const expired = params.get("reason") === "idle";

  // Already signed in (e.g. a second tab): go straight on.
  useEffect(() => {
    if (admin) router.replace(safeAdminNext(params.get("next")));
  }, [admin, params, router]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-ink px-4 py-10">
      <section className="w-full max-w-[400px] rounded-xl bg-white p-6 sm:p-8">
        <AdminBrand className="text-[17px]" />
        {expired && !challenge && (
          <p role="status" className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
            ออกจากระบบอัตโนมัติเพราะไม่ได้ใช้งานเกิน {ADMIN_IDLE_MINUTES} นาที
          </p>
        )}
        {challenge ? (
          <CodeStep key={challenge.challengeId} challenge={challenge} onRestart={() => setChallenge(null)} />
        ) : (
          <PasswordStep onChallenge={setChallenge} />
        )}
        <p className="mt-5 border-t border-line pt-3.5 text-xs text-slate">
          เข้าระบบจาก VPN บริษัท · หมดเวลาเมื่อไม่ใช้งาน {ADMIN_IDLE_MINUTES} นาที · ทุกการเข้าใช้งานถูกบันทึก
        </p>
      </section>
    </main>
  );
}
