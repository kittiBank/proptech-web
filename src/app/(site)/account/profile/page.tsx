import type { Metadata } from "next";
import { ProfileView } from "@/components/account/profile/profile-view";

export const metadata: Metadata = { title: "โปรไฟล์และการตั้งค่า" };

/** Profile, security, notification settings and privacy (B7), from `GET /me/profile`. */
export default function ProfilePage() {
  return <ProfileView />;
}
