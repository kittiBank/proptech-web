import { AgentProfileSkeleton } from "@/components/agent/agent-profile-view";

/** Shown instantly on navigation while an agent profile loads. */
export default function Loading() {
  return <AgentProfileSkeleton />;
}
