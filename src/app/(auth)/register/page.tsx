import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterView } from "@/components/auth/login-view";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <RegisterView />
    </Suspense>
  );
}
