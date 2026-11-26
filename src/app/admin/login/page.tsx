import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/admin-login";

export const metadata: Metadata = { title: "เข้าสู่ระบบแอดมิน" };

/** E11. Reads `?next=` and `?reason=`, so it renders on the client inside Suspense. */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main id="main" className="min-h-dvh bg-ink" />}>
      <AdminLogin />
    </Suspense>
  );
}
