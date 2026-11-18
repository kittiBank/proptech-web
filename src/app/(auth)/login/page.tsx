import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginView } from "@/components/auth/login-view";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
