import { Suspense } from "react";
import type { Metadata } from "next";
import { MortgageTool } from "@/components/guides/mortgage-tool";

export const metadata: Metadata = {
  title: "คำนวณค่างวดผ่อนบ้าน",
  description: "คำนวณค่างวดผ่อนบ้านและคอนโดต่อเดือน วงเงินกู้ ดอกเบี้ยรวม และรายได้ขั้นต่ำที่ธนาคารอยากเห็น",
};

/**
 * Mortgage calculator (D3, D13). `?price=&down=&rate=&years=` prefill it,
 * so articles and listings can link straight to a worked example.
 */
export default function MortgageToolPage() {
  return (
    <Suspense>
      <MortgageTool />
    </Suspense>
  );
}
