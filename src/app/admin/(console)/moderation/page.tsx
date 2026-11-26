import { Suspense } from "react";
import type { Metadata } from "next";
import { ModerationQueue } from "@/components/admin/moderation-queue";

export const metadata: Metadata = { title: "ตรวจประกาศ" };

/** E2. Filters live in the URL, so the view reads search params inside Suspense. */
export default function ModerationPage() {
  return (
    <Suspense>
      <ModerationQueue />
    </Suspense>
  );
}
