"use client";

import { RouteError } from "@/components/system/route-error";

/** The wizard auto-saves each step, so the draft survives a crash. */
export default function PostError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} withLogo note="ข้อมูลที่กรอกไว้ในแบบร่างยังอยู่ครบ" />;
}
