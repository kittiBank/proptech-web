import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutView } from "@/components/billing/checkout-view";

export const metadata: Metadata = { title: "ชำระเงิน" };

/** Pay an order (C13) from `GET /me/orders/:id`. Reads the route param, so it renders on the client. */
export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutView />
    </Suspense>
  );
}
