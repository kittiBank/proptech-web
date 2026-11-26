import { Suspense } from "react";
import type { Metadata } from "next";
import { RevenueView } from "@/components/admin/revenue-view";

export const metadata: Metadata = { title: "รายได้และการชำระเงิน" };

/** E7. The month lives in the URL. */
export default function Page() {
  return (
    <Suspense>
      <RevenueView />
    </Suspense>
  );
}
