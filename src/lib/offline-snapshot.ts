/**
 * Last good copy of a signed-in user's data, kept in localStorage so a few views (favorites, D14)
 * still show something without a connection. Scoped by user id, and cleared on sign-out, so a
 * shared device never shows one person's data to another.
 */

const PREFIX = "propertyhub:offline:";

export interface OfflineSnapshot<T> {
  userId: string;
  /** Epoch ms when the data was fetched. */
  savedAt: number;
  data: T;
}

export function saveOfflineSnapshot<T>(key: string, snapshot: OfflineSnapshot<T>): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: the offline copy is a nicety.
  }
}

/**
 * The saved copy for `userId`. Pass `undefined` while the session itself cannot load (offline):
 * the copy belongs to whoever last used the device without signing out.
 */
export function readOfflineSnapshot<T>(key: string, userId: string | undefined): OfflineSnapshot<T> | undefined {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const snapshot = JSON.parse(raw) as OfflineSnapshot<T>;
    const owner = userId === undefined || snapshot.userId === userId;
    return owner && typeof snapshot.savedAt === "number" ? snapshot : undefined;
  } catch {
    return undefined;
  }
}

/** On sign-out: the next person on this device must not see the last one's data. */
export function clearOfflineSnapshots(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Nothing stored.
  }
}
