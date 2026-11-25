import type { Metadata } from "next";
import { BillingView } from "@/components/billing/billing-view";

export const metadata: Metadata = { title: "การชำระเงินและใบกำกับภาษี" };

/** Credit, plan, invoice details, payment history and saved cards (C15). */
export default function BillingPage() {
  return <BillingView />;
}
