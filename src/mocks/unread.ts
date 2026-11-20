import { unreadNotificationCount } from "./notifications";

/**
 * Unread badges behind `GET /me/unread-counts`. Notifications come from their
 * store; messages stay a fixed demo number until the inbox mock (FE-14).
 */
export function unreadCounts(userId: string): { messages: number; notifications: number } {
  return { messages: 2, notifications: unreadNotificationCount(userId) };
}
