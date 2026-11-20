import { Suspense } from "react";
import { MessagesIndex } from "@/components/messages/messages-index";

/** Chat list on phones; on desktop the right pane prompts to pick a chat, or opens `?to=` recipients. */
export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesIndex />
    </Suspense>
  );
}
