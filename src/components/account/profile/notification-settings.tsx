"use client";

import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { NotificationChannel, NotificationTopic, ProfileDto } from "@/types/api";
import { SettingsSection } from "./section";
import { useUpdateProfile } from "./use-profile";

const topics: { id: NotificationTopic; title: string; detail: string }[] = [
  { id: "saved_search", title: "ประกาศใหม่ตรงกับการค้นหาที่บันทึก", detail: "ตามความถี่ที่ตั้งไว้ในแต่ละการค้นหา" },
  { id: "price_drop", title: "ราคาลดในรายการโปรด", detail: "แจ้งทันทีที่ผู้ลงประกาศลดราคา" },
  { id: "message", title: "ข้อความตอบกลับจากผู้ลงประกาศ", detail: "แจ้งทันที" },
  { id: "listing_closed", title: "ประกาศในรายการโปรดถูกปิด", detail: "เช่น ขายหรือปล่อยเช่าไปแล้ว" },
  { id: "new_project", title: "โครงการใหม่ใกล้สถานีที่สนใจ", detail: "เดือนละครั้ง" },
];

const channels: { id: NotificationChannel; label: string }[] = [
  { id: "email", label: "อีเมล" },
  { id: "line", label: "LINE" },
  { id: "web", label: "ในเว็บ" },
];

/** "การแจ้งเตือน" (B7): which topics reach the user on which channel. Switches save as they change. */
export function NotificationSettings({ profile }: { profile: ProfileDto }) {
  const update = useUpdateProfile({ optimistic: true });
  const lineReady = profile.linked.line;

  const set = (topic: NotificationTopic, channel: NotificationChannel, on: boolean) =>
    update.mutate(
      { notifications: { [topic]: { ...profile.notifications[topic], [channel]: on } } as ProfileDto["notifications"] },
      { onError: () => toast("บันทึกการตั้งค่าไม่สำเร็จ ลองอีกครั้ง") },
    );

  return (
    <SettingsSection id="notifications" title="การแจ้งเตือน" description="เลือกว่าจะให้เราแจ้งเรื่องไหนทางช่องทางใด">
      <div className="-mx-5 mt-4 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[460px] border-collapse">
          <caption className="sr-only">ช่องทางการแจ้งเตือนแต่ละเรื่อง</caption>
          <thead>
            <tr>
              <th scope="col" className="pb-2.5 text-left text-[13px] font-medium text-slate">
                เรื่อง
              </th>
              {channels.map((c) => (
                <th key={c.id} scope="col" className="w-20 pb-2.5 text-center text-[13px] font-medium text-slate">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  <span className="block font-medium text-ink">{t.title}</span>
                  <span className="text-[13px] text-slate">{t.detail}</span>
                </th>
                {channels.map((c) => (
                  <td key={c.id} className="py-3 text-center">
                    <Switch
                      hideLabel
                      label={`${t.title} (${c.label})`}
                      checked={profile.notifications[t.id][c.id] && (c.id !== "line" || lineReady)}
                      disabled={c.id === "line" && !lineReady}
                      onCheckedChange={(on) => set(t.id, c.id, on)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!lineReady && (
        <p className="mt-3 text-[13px] text-slate">
          เชื่อม LINE ที่{" "}
          <a href="#security" className="font-medium text-brand-strong underline-offset-4 hover:underline">
            ความปลอดภัยและการเข้าสู่ระบบ
          </a>{" "}
          เพื่อรับแจ้งเตือนทาง LINE
        </p>
      )}
    </SettingsSection>
  );
}
