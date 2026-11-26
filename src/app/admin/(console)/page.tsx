import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "แดชบอร์ด" };

/** E1 */
export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
