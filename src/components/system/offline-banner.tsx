"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/use-online";

/**
 * D14: a strip at the top of every page while the connection is down. The live region is always
 * mounted so screen readers hear the change both ways.
 */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="flex items-center gap-2 bg-ink px-4 py-2.5 text-[13px] text-white sm:px-8">
          <WifiOff className="size-4 shrink-0" aria-hidden="true" />
          ไม่มีการเชื่อมต่ออินเทอร์เน็ต
          <span className="text-violet-200 max-sm:sr-only">หน้าที่เปิดไว้และรายการโปรดยังดูได้</span>
        </p>
      )}
    </div>
  );
}
