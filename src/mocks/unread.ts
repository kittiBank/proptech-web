/**
 * Unread badges behind `GET /me/unread-counts`. Fixed demo numbers until the
 * inbox (FE-14) and notifications (FE-13) mocks exist; those will derive the
 * counts from their own stores instead.
 */
export function unreadCounts(): { messages: number; notifications: number } {
  return { messages: 2, notifications: 2 };
}
