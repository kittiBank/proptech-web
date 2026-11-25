import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyView } from "@/components/kyc/verify-view";

export const metadata: Metadata = { title: "ยืนยันตัวตนนายหน้า" };

/** Agent verification (C16). The step lives in `?step=`, so the view reads search params on the client. */
export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyView />
    </Suspense>
  );
}
