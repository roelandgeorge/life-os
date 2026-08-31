import { IndexedDBStore } from '../store/indexeddb';
import type { Store } from '../store/types';

/** The one `Store` the running app talks to (§5.1). */
export const store: Store = new IndexedDBStore();
