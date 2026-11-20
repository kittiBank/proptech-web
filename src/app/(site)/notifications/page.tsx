import type { Metadata } from "next";
import { NotificationsView } from "@/components/account/notifications-view";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

/** In-app notifications (B19), from `GET /me/notifications`. */
export default function NotificationsPage() {
  return <NotificationsView />;
}
