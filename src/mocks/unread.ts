import { unreadMessageCount } from "./inbox";
import { unreadNotificationCount } from "./notifications";

/** Unread badges behind `GET /me/unread-counts`, from the inbox and notification stores. */
export function unreadCounts(userId: string): { messages: number; notifications: number } {
  return { messages: unreadMessageCount(userId), notifications: unreadNotificationCount(userId) };
}
