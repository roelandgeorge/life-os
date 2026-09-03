import { IndexedDBStore } from '../store/indexeddb';
import type { Store } from '../store/types';

/** The one `Store` the running app talks to (§5.1). */
export const store: Store = new IndexedDBStore();

/**
 * Ask the browser not to evict this origin's data under storage pressure.
 *
 * Without it IndexedDB is "best effort": a browser short on disk may clear it
 * with no warning and no way back, and §5.1's JSON export is a manual defence
 * the user has to have remembered to use. Installed PWAs are usually granted
 * this automatically, but asking is free and covers the browser-tab case.
 *
 * Fire and forget — a refusal changes nothing about how the app behaves.
 */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => {});
}
