"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { routes } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { safeNext } from "@/lib/auth-gate";
import { useSession } from "@/providers/session";
import type { UserDto } from "@/types/api";
import { OrDivider, SsoButtons } from "./auth-fields";
import { AuthSplit } from "./auth-shell";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

const formTitle = "text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]";

/** Where to go once signed in: unfinished onboarding first, then `next`. */
export function afterSignIn(user: UserDto, next: string) {
  return user.onboarded ? next : `${routes.onboarding}?next=${encodeURIComponent(next)}`;
}

/**
 * Visitors who were already signed in when they opened /login or /register go
 * straight on. Only the first session answer counts, so signing in on this
 * page leaves the redirect to the form's own handler.
 */
function useRedirectWhenSignedIn(next: string) {
  const { user } = useSession();
  const router = useRouter();
  const checked = useRef(false);
  useEffect(() => {
    if (user === undefined || checked.current) return;
    checked.current = true;
    if (user) router.replace(next);
  }, [user, next, router]);
}

export function LoginView() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  useRedirectWhenSignedIn(next);
  const done = (user: UserDto) => router.replace(afterSignIn(user, next));

  return (
    <AuthSplit
      aside={{
        heading: "ยินดีต้อนรับกลับมา",
        body: "เข้าสู่ระบบเพื่อดูรายการโปรดและการค้นหาที่บันทึกไว้ ได้จากทุกอุปกรณ์",
        perks: [
          "บันทึกประกาศไว้ดูภายหลัง",
          "แจ้งเตือนเมื่อมีห้องใหม่ใกล้สถานีที่คุณสนใจ",
          "คุยกับผู้ลงประกาศได้ในที่เดียว",
        ],
        line: "green",
      }}
    >
      {/* Phones hide the aside and its H1, so there the form title is the page heading. */}
      <h1 className={cn(formTitle, "lg:hidden")}>เข้าสู่ระบบ</h1>
      <h2 className={cn(formTitle, "max-lg:hidden")}>เข้าสู่ระบบ</h2>
      <p className="mt-1.5 mb-7 text-[15px] text-slate">
        <span className="lg:hidden">ดูรายการโปรดและการค้นหาที่บันทึกไว้ได้ทุกเครื่อง </span>
        <span className="hidden lg:inline">ยังไม่มีบัญชี </span>
        <Link
          href={routes.register(next === "/" ? undefined : next)}
          className="hidden font-medium text-brand-strong underline-offset-4 hover:underline lg:inline"
        >
          สมัครสมาชิก
        </Link>
      </p>
      <SsoButtons onSignedIn={done} />
      <OrDivider>หรือใช้อีเมล</OrDivider>
      <LoginForm onSignedIn={done} />
      <p className="mt-6 text-center text-[15px] text-slate lg:hidden">
        ยังไม่มีบัญชี{" "}
        <Link
          href={routes.register(next === "/" ? undefined : next)}
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          สมัครสมาชิก
        </Link>
      </p>
      <p className="mt-7 text-[13px] text-slate">
        การเข้าสู่ระบบถือว่าคุณยอมรับ{" "}
        <Link href="/legal/terms" className="text-brand-strong underline underline-offset-4">
          ข้อกำหนดการใช้งาน
        </Link>{" "}
        และ{" "}
        <Link href="/legal/privacy" className="text-brand-strong underline underline-offset-4">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </AuthSplit>
  );
}

export function RegisterView() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  useRedirectWhenSignedIn(next);

  return (
    <AuthSplit
      aside={{
        heading: (
          <>
            สร้างบัญชีฟรี
            <br />
            ใช้เวลาไม่ถึงนาที
          </>
        ),
        body: "บัญชีเดียวใช้ได้ทั้งหาบ้าน และลงประกาศขายหรือให้เช่าทรัพย์ของคุณเอง",
        line: "blue",
      }}
    >
      {/* Phones hide the aside and its H1, so there the form title is the page heading. */}
      <h1 className={cn(formTitle, "lg:hidden")}>สมัครสมาชิก</h1>
      <h2 className={cn(formTitle, "max-lg:hidden")}>สมัครสมาชิก</h2>
      <p className="mt-1.5 mb-6 text-[15px] text-slate">
        มีบัญชีแล้ว{" "}
        <Link
          href={routes.login({ next: next === "/" ? undefined : next })}
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
      <SsoButtons compact onSignedIn={(user) => router.replace(afterSignIn(user, next))} />
      <OrDivider>หรือสมัครด้วยอีเมล</OrDivider>
      <RegisterForm
        onRegistered={(user) =>
          router.replace(
            `${routes.verifyEmail}?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(next)}`,
          )
        }
      />
      <p className="mt-4 text-[13px] text-slate">
        เราจะส่งลิงก์ยืนยันไปที่อีเมลของคุณ ต้องยืนยันก่อนส่งข้อความถึงผู้ลงประกาศ
      </p>
    </AuthSplit>
  );
}
