import { Suspense } from "react";
import type { Metadata } from "next";
import { HelpView } from "@/components/help/help-view";

export const metadata: Metadata = {
  title: "ศูนย์ช่วยเหลือ",
  description: "คำถามที่พบบ่อยเรื่องการลงประกาศ แพ็กเกจ นัดดูทรัพย์ บัญชี และความปลอดภัย พร้อมช่องทางติดต่อทีมงาน",
};

/** Help center (D4). Search and topic live in the URL, so the view renders on the client. */
export default function HelpPage() {
  return (
    <Suspense>
      <HelpView />
    </Suspense>
  );
}
