import type { Metadata } from "next";
import { AppointmentsView } from "@/components/account/appointments-view";

export const metadata: Metadata = { title: "นัดดูทรัพย์ของฉัน" };

/** The buyer's viewing requests and appointments (B17), from `GET /me/viewings`. */
export default function AppointmentsPage() {
  return <AppointmentsView />;
}
