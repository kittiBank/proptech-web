import type { Metadata } from "next";
import { CmsEditor } from "@/components/admin/cms-editor";

export const metadata: Metadata = { title: "แก้ไขบทความ" };

/** E9: the editor reads the id with `useParams`. */
export default function CmsEditorPage() {
  return <CmsEditor />;
}
