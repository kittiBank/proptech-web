import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotPasswordView } from "@/components/auth/account-recovery";

export const metadata: Metadata = {
  title: "ลืมรหัสผ่าน",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <ForgotPasswordView />
    </Suspense>
  );
}
