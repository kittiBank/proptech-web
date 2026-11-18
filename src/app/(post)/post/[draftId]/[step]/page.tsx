import { Suspense } from "react";
import type { Metadata } from "next";
import { PostWizard } from "@/components/post/post-wizard";

export const metadata: Metadata = { title: "ลงประกาศ", robots: { index: false } };

/** One wizard step: `type`, `location`, `details`, `photos` or `publish`. */
export default function PostStepPage() {
  return (
    <Suspense>
      <PostWizard />
    </Suspense>
  );
}
