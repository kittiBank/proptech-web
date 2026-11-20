"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { FormAlert } from "@/components/ui/field";
import { routes } from "@/data/navigation";
import { api } from "@/lib/api/endpoints";

/**
 * `/messages` right pane. With `?to=agent:<slug>` (or property/project) it
 * opens that chat, starting one if needed; otherwise desktop shows a prompt.
 */
export function MessagesIndex() {
  const router = useRouter();
  const to = useSearchParams().get("to");
  const start = useMutation({
    mutationFn: (recipient: string) => api.startThread(recipient),
    onSuccess: ({ data }) => router.replace(routes.thread(data.id)),
  });
  const started = useRef<string | null>(null);
  const { mutate } = start;

  useEffect(() => {
    if (!to || started.current === to) return;
    started.current = to;
    mutate(to);
  }, [to, mutate]);

  if (to && start.isError) {
    return (
      <div className="p-6">
        <FormAlert>เปิดแชตไม่สำเร็จ ผู้ลงประกาศอาจปิดบัญชีไปแล้ว</FormAlert>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <MessagesSquare className="size-10 text-violet-200" aria-hidden="true" />
      <p className="text-lg font-semibold text-ink">{to ? "กำลังเปิดแชต…" : "เลือกแชตเพื่ออ่านข้อความ"}</p>
      {!to && <p className="max-w-[36ch] text-sm text-slate">คุยกับผู้ลงประกาศและขอนัดดูทรัพย์ได้ในแชตเดียว</p>}
    </div>
  );
}
