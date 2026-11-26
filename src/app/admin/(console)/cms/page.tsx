import type { Metadata } from "next";
import { CmsList } from "@/components/admin/cms-list";

export const metadata: Metadata = { title: "บทความ" };

/** E9: article list. */
export default function CmsPage() {
  return <CmsList />;
}
