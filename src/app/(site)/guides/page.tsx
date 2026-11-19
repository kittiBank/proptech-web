import { Suspense } from "react";
import type { Metadata } from "next";
import { GuidesSkeleton, GuidesView } from "@/components/guides/guides-view";

export const metadata: Metadata = {
  title: "บทความ & คู่มือ",
  description: "คู่มือซื้อ เช่า ขายบ้านและคอนโด สินเชื่อ ภาษี และทำเลรถไฟฟ้า พร้อมเครื่องมือคำนวณค่างวด",
};

/**
 * Guides hub (D1). Category and search live in the query string, read with
 * `useSearchParams` inside Suspense; articles come from `GET /articles`.
 */
export default function GuidesPage() {
  return (
    <Suspense fallback={<GuidesSkeleton />}>
      <GuidesView />
    </Suspense>
  );
}
