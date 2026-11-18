import type { Metadata } from "next";
import { PostStart } from "@/components/post/post-start";

export const metadata: Metadata = { title: "ลงประกาศ", robots: { index: false } };

/** Creates a draft (or offers unfinished ones), then redirects into the wizard. */
export default function PostPage() {
  return <PostStart />;
}
