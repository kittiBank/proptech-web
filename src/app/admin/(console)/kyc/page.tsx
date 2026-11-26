import { Suspense } from "react";
import type { Metadata } from "next";
import { KycReview } from "@/components/admin/kyc-review";

export const metadata: Metadata = { title: "ยืนยันตัวตนนายหน้า" };

/** E5 */
export default function KycPage() {
  return (
    <Suspense>
      <KycReview />
    </Suspense>
  );
}
