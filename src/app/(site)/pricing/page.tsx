import type { Metadata } from "next";
import { PricingView } from "@/components/billing/pricing-view";

export const metadata: Metadata = {
  title: "แพ็กเกจและราคา",
  description: "ลงประกาศฟรี แพ็กเกจนายหน้า Pro และราคาโปรโมตประกาศ ราคารวม VAT แล้ว",
};

/** Public pricing (C12): plans, promotion prices and FAQ. */
export default function PricingPage() {
  return <PricingView />;
}
