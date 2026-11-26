import type { Metadata } from "next";
import { RolesView } from "@/components/admin/roles-view";

export const metadata: Metadata = { title: "สิทธิ์และบันทึกการใช้งาน" };

/** E10 */
export default function AdminRolesPage() {
  return <RolesView />;
}
