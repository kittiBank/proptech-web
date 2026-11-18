import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailView } from "@/components/auth/account-recovery";

export const metadata: Metadata = {
  title: "ยืนยันอีเมล",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  );
}
