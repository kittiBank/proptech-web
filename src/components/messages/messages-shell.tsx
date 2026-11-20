"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";
import { ThreadList } from "./thread-list";

/**
 * `/messages` frame (B14 desktop, B15/B16 phones). Desktop: chat list on the
 * left, the open chat (or a prompt) on the right. Phones: the list on
 * `/messages`, the chat alone on `/messages/[threadId]`.
 */
export function MessagesShell({ children }: { children: ReactNode }) {
  const { threadId } = useParams<{ threadId?: string }>();
  const { user, isPending } = useSession();

  if (isPending) {
    return (
      <div role="status" aria-label="กำลังโหลดข้อความ" className="mx-auto flex max-w-[1280px] flex-col gap-3 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="bg-mist px-4 py-8">
        <EmptyState
          icon={LogIn}
          title="เข้าสู่ระบบเพื่อดูข้อความ"
          body="ข้อความและนัดดูทรัพย์กับผู้ลงประกาศจะอยู่ที่นี่ เปิดดูได้จากทุกอุปกรณ์"
          action={
            <Button asChild size="lg">
              <Link href={routes.login({ next: threadId ? routes.thread(threadId) : routes.messages })}>
                เข้าสู่ระบบ
              </Link>
            </Button>
          }
          className="mx-auto max-w-xl rounded-lg bg-white"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] lg:h-[calc(100dvh-68px)] lg:grid-cols-[360px_minmax(0,1fr)] lg:border-x lg:border-line">
      <aside aria-label="รายการแชต" className={cn("min-h-0 lg:flex lg:border-r lg:border-line", threadId && "hidden")}>
        <ThreadList activeId={threadId} className="w-full" />
      </aside>
      <div className={cn("min-h-0 min-w-0", !threadId && "hidden lg:block")}>{children}</div>
    </div>
  );
}
