import { ThreadView } from "@/components/messages/thread-view";

/** One chat (B14 centre, B16 on phones), from `GET /me/threads/:id`. */
export default function ThreadPage() {
  return <ThreadView />;
}
