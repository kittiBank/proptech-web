import { Suspense } from "react";
import type { Metadata } from "next";
import { PromoSlotsView } from "@/components/admin/promo-slots-view";

export const metadata: Metadata = { title: "ช่องปักหมุดหน้าแรก" };

/** E8. The week lives in the URL. */
export default function Page() {
  return (
    <Suspense>
      <PromoSlotsView />
    </Suspense>
  );
}
