/**
 * IndexedDB-backed `Store` (§5.1).
 *
 * One database, one object store, one record. The app state is small enough
 * (400 days × 7 booleans) that partial writes buy nothing and cost atomicity:
 * a save either lands whole or not at all.
 */

import type { AppState } from '../core/types';
import { deserialize, serialize } from './serialize';
import type { Store } from './types';

const DB_NAME = 'life-os';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const RECORD_KEY = 'current';

/** How long to wait for IndexedDB before treating silence as a failure. */
const OPEN_TIMEOUT_MS = 5000;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDBStore implements Store {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      // Another tab is holding the old schema open. Surfacing this beats hanging.
      req.onblocked = () => reject(new Error('Life OS is open in another tab'));

      // An open queued behind a pending deleteDatabase can fire none of the
      // three handlers above, leaving the promise unsettled and the app on its
      // loading screen for good. A caller that is told "no" can say so; one
      // left waiting cannot.
      setTimeout(() => reject(new Error('Storage did not respond. Close other Life OS tabs and reload.')), OPEN_TIMEOUT_MS);
    }).catch((err) => {
      // Do not cache a failure: the next call should get a fresh attempt,
      // otherwise one bad moment poisons the store for the whole session.
      this.db = null;
      throw err;
    });
    return this.db;
  }

  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T>): Promise<T> {
    const db = await this.open();
    const transaction = db.transaction(STORE_NAME, mode);
    const result = await fn(transaction.objectStore(STORE_NAME));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'));
    });
    return result;
  }

  async load(): Promise<AppState | null> {
    const raw = await this.tx('readonly', (s) => request<unknown>(s.get(RECORD_KEY)));
    return (raw as AppState | undefined) ?? null;
  }

  async save(state: AppState): Promise<void> {
    // structuredClone here rather than at the call site: it both strips any
    // proxies/class instances IDB would reject and pins the value, so a later
    // mutation of the live object cannot rewrite what was persisted.
    const snapshot = structuredClone(state);
    await this.tx('readwrite', (s) => request(s.put(snapshot, RECORD_KEY)));
  }

  async export(): Promise<string> {
    const state = await this.load();
    if (!state) throw new Error('Nothing to export');
    return serialize(state);
  }

  async import(json: string): Promise<void> {
    // Parse before touching the database: a bad file must leave the existing
    // state intact.
    await this.save(deserialize(json));
  }

  async clear(): Promise<void> {
    await this.tx('readwrite', (s) => request(s.delete(RECORD_KEY)));
  }
}
