import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/auth/account-recovery";

export const metadata: Metadata = {
  title: "ตั้งรหัสผ่านใหม่",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
