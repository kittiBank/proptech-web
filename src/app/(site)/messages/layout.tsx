import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { MessagesShell } from "@/components/messages/messages-shell";

export const metadata: Metadata = { title: "ข้อความ", robots: { index: false, follow: false } };

/** Chats (B14–B16): the list and the open chat share this frame. Reads route params, so it renders on the client. */
export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <MessagesShell>{children}</MessagesShell>
    </Suspense>
  );
}
