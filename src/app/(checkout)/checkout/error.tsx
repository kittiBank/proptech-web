"use client";

import { RouteError } from "@/components/system/route-error";

/** Payment is confirmed by the server, so a page crash never charges twice. */
export default function CheckoutError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} note="หากชำระเงินไปแล้ว ระบบจะยืนยันให้อัตโนมัติ ไม่ต้องจ่ายซ้ำ" />;
}
