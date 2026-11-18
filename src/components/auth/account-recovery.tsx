"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { Check, KeyRound, Link2Off, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert, TextField } from "@/components/ui/field";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { safeNext } from "@/lib/auth-gate";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/auth-schemas";
import { useZodForm } from "@/lib/use-zod-form";
import { MOCK_RESET_TOKEN, MOCK_VERIFY_TOKEN } from "@/mocks/constants";
import { useApplySession, useSession } from "@/providers/session";
import { MockHint, PasswordField, PasswordStrength } from "./auth-fields";
import { AuthBadge, AuthCardPage } from "./auth-shell";

const RESEND_SECONDS = 45;

const title = "text-[22px] font-semibold tracking-[-0.01em] text-ink";
const body = "text-[15px] leading-[1.65] text-slate";
const link = "font-medium text-brand-strong underline-offset-4 hover:underline";

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  return { left, restart: () => setLeft(seconds) };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** B3 "check your email" after sign-up, and the landing page of the link in that email (`?token=`). */
export function VerifyEmailView() {
  const params = useSearchParams();
  const token = params.get("token");
  const next = safeNext(params.get("next"));
  return token ? <VerifyToken token={token} next={next} /> : <CheckInbox email={params.get("email")} next={next} />;
}

function CheckInbox({ email: emailParam, next }: { email: string | null; next: string }) {
  const { user } = useSession();
  const email = emailParam ?? user?.email ?? "";
  const { left, restart } = useCountdown(RESEND_SECONDS);
  const resend = useMutation({ mutationFn: api.resendVerification, onSuccess: restart });
  const gmail = /@(gmail|googlemail)\.com$/i.test(email);

  return (
    <AuthCardPage>
      <AuthBadge>
        <Mail aria-hidden="true" />
      </AuthBadge>
      <h1 className={title}>ตรวจสอบอีเมลของคุณ</h1>
      <p className={body}>
        เราส่งลิงก์ยืนยันไปที่ {email ? <strong className="text-ink">{email}</strong> : "อีเมลของคุณ"} กดลิงก์ภายใน 24
        ชั่วโมงเพื่อเปิดใช้งานบัญชี
      </p>
      {gmail && (
        <Button asChild size="lg">
          <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
            เปิด Gmail
          </a>
        </Button>
      )}
      <Button variant="outline" size="lg" disabled={left > 0 || resend.isPending} onClick={() => resend.mutate()}>
        {left > 0 ? `ส่งอีเมลอีกครั้งได้ใน ${clock(left)}` : resend.isPending ? "กำลังส่ง..." : "ส่งอีเมลอีกครั้ง"}
      </Button>
      {resend.isSuccess && left > 0 && (
        <p role="status" className="text-sm text-success">
          ส่งอีเมลยืนยันอีกครั้งแล้ว
        </p>
      )}
      {resend.isError && <FormAlert>ส่งอีเมลไม่สำเร็จ ลองอีกครั้งในอีกสักครู่</FormAlert>}
      <p className="text-sm text-slate">
        ไม่เจออีเมล ลองดูในโฟลเดอร์สแปม หรือ{" "}
        <Link href={routes.register()} className={link}>
          เปลี่ยนอีเมล
        </Link>
      </p>
      <MockHint>
        ไม่มีอีเมลจริง{" "}
        <Link
          href={`${routes.verifyEmail}?token=${MOCK_VERIFY_TOKEN}&next=${encodeURIComponent(next)}`}
          className={link}
        >
          เปิดลิงก์ยืนยันจำลอง
        </Link>
      </MockHint>
    </AuthCardPage>
  );
}

function VerifyToken({ token, next }: { token: string; next: string }) {
  const apply = useApplySession();
  const verify = useMutation({ mutationFn: api.verifyEmail, onSuccess: ({ data }) => apply(data) });
  const sent = useRef(false);
  useEffect(() => {
    // Strict Mode mounts twice; the token is single-use, so send it once.
    if (sent.current) return;
    sent.current = true;
    verify.mutate(token);
  }, [token, verify]);

  if (verify.isPending || verify.isIdle) {
    return (
      <AuthCardPage>
        <p role="status" className={body}>
          กำลังยืนยันอีเมล...
        </p>
      </AuthCardPage>
    );
  }

  if (verify.isError) {
    const signedOut = verify.error instanceof ApiError && verify.error.status === 401;
    const here = `${routes.verifyEmail}?token=${encodeURIComponent(token)}`;
    return (
      <AuthCardPage>
        <AuthBadge tone="danger">
          <Link2Off aria-hidden="true" />
        </AuthBadge>
        <h1 className={title}>{signedOut ? "เข้าสู่ระบบเพื่อยืนยันอีเมล" : "ลิงก์ยืนยันใช้ไม่ได้"}</h1>
        <p className={body}>
          {signedOut
            ? "เปิดลิงก์นี้ในเครื่องที่เข้าสู่ระบบอยู่ หรือเข้าสู่ระบบก่อน แล้วเราจะยืนยันให้ทันที"
            : "ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่ได้จากหน้าตรวจสอบอีเมล"}
        </p>
        <Button asChild size="lg">
          <Link href={signedOut ? routes.login({ next: here }) : routes.verifyEmail}>
            {signedOut ? "เข้าสู่ระบบ" : "ขอลิงก์ใหม่"}
          </Link>
        </Button>
      </AuthCardPage>
    );
  }

  return (
    <AuthCardPage>
      <AuthBadge tone="success">
        <Check strokeWidth={2.5} aria-hidden="true" />
      </AuthBadge>
      <h1 className={title}>ยืนยันอีเมลแล้ว</h1>
      <p className={body}>บัญชีของคุณพร้อมใช้งาน บอกเราอีกนิดว่ากำลังหาอะไร เพื่อแนะนำประกาศที่ตรงขึ้น</p>
      {verify.data.data.onboarded ? (
        <Button asChild size="lg">
          <Link href={next}>ไปต่อ</Link>
        </Button>
      ) : (
        <>
          <Button asChild size="lg">
            <Link href={`${routes.onboarding}?next=${encodeURIComponent(next)}`}>เริ่มใช้งาน</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={next}>ข้ามไปหน้าแรก</Link>
          </Button>
        </>
      )}
    </AuthCardPage>
  );
}

/** B3 "forgot password": asks for the email, then confirms without saying whether the account exists. */
export function ForgotPasswordView() {
  const id = useId();
  const mutation = useMutation({ mutationFn: api.forgotPassword });
  const { errors, formProps } = useZodForm(forgotPasswordSchema, (values) => mutation.mutate(values));

  if (mutation.isSuccess) {
    return (
      <AuthCardPage>
        <AuthBadge>
          <Mail aria-hidden="true" />
        </AuthBadge>
        <h1 className={title}>ส่งลิงก์แล้ว</h1>
        <p className={body}>
          ถ้า <strong className="text-ink">{mutation.variables.email}</strong> มีบัญชีกับเรา
          คุณจะได้อีเมลพร้อมลิงก์ตั้งรหัสผ่านใหม่ภายในไม่กี่นาที ลิงก์ใช้ได้ 1 ชั่วโมง
        </p>
        <Link href={routes.login()} className={`${link} text-center text-sm`}>
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
        <MockHint>
          <Link href={`${routes.resetPassword}?token=${MOCK_RESET_TOKEN}`} className={link}>
            เปิดลิงก์ตั้งรหัสผ่านจำลอง
          </Link>
        </MockHint>
      </AuthCardPage>
    );
  }

  return (
    <AuthCardPage>
      <AuthBadge>
        <KeyRound aria-hidden="true" />
      </AuthBadge>
      <h1 className={title}>ตั้งรหัสผ่านใหม่</h1>
      <p className={body}>กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้</p>
      <form {...formProps} className="flex flex-col gap-3.5">
        <TextField
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          label="อีเมล"
          error={errors.email}
        />
        {mutation.isError && <FormAlert>ส่งลิงก์ไม่สำเร็จ ลองอีกครั้ง</FormAlert>}
        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่าน"}
        </Button>
      </form>
      <Link href={routes.login()} className={`${link} text-center text-sm`}>
        กลับไปหน้าเข้าสู่ระบบ
      </Link>
    </AuthCardPage>
  );
}

/** B3 "new password": landing page of the reset link (`?token=`). */
export function ResetPasswordView() {
  const id = useId();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: api.resetPassword });
  const { errors, formProps } = useZodForm(resetPasswordSchema, (values) =>
    mutation.mutate({ token: token ?? "", password: values.password }),
  );
  const badToken = !token || (mutation.error instanceof ApiError && mutation.error.status === 400 && !errors.password);

  if (mutation.isSuccess) {
    return (
      <AuthCardPage>
        <AuthBadge tone="success">
          <Check strokeWidth={2.5} aria-hidden="true" />
        </AuthBadge>
        <h1 className={title}>ตั้งรหัสผ่านใหม่แล้ว</h1>
        <p className={body}>เราออกจากระบบในอุปกรณ์อื่นทั้งหมดแล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
        <Button asChild size="lg">
          <Link href={routes.login()}>เข้าสู่ระบบ</Link>
        </Button>
      </AuthCardPage>
    );
  }

  if (badToken) {
    return (
      <AuthCardPage>
        <AuthBadge tone="danger">
          <Link2Off aria-hidden="true" />
        </AuthBadge>
        <h1 className={title}>ลิงก์ตั้งรหัสผ่านใช้ไม่ได้</h1>
        <p className={body}>ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่ได้ภายในไม่กี่วินาที</p>
        <Button asChild size="lg">
          <Link href={routes.forgotPassword}>ขอลิงก์ใหม่</Link>
        </Button>
      </AuthCardPage>
    );
  }

  return (
    <AuthCardPage>
      <h1 className={title}>รหัสผ่านใหม่</h1>
      <form {...formProps} className="flex flex-col gap-3.5">
        <PasswordField
          id={`${id}-password`}
          name="password"
          label="รหัสผ่านใหม่"
          autoComplete="new-password"
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength password={password} />
        <PasswordField
          id={`${id}-confirm`}
          name="confirm"
          label="ยืนยันรหัสผ่าน"
          autoComplete="new-password"
          error={errors.confirm}
        />
        {mutation.isError && <FormAlert>บันทึกรหัสผ่านไม่สำเร็จ ลองอีกครั้ง</FormAlert>}
        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
        </Button>
      </form>
      <p className="text-[13px] text-slate">บันทึกแล้วระบบจะออกจากระบบในอุปกรณ์อื่นทั้งหมด</p>
    </AuthCardPage>
  );
}
