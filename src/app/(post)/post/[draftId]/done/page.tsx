import { Suspense } from "react";
import type { Metadata } from "next";
import { PostDone } from "@/components/post/post-done";

export const metadata: Metadata = { title: "ส่งประกาศเรียบร้อย", robots: { index: false } };

export default function PostDonePage() {
  return (
    <Suspense>
      <PostDone />
    </Suspense>
  );
}
