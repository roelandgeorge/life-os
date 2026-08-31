import type { AppState } from '../core/types';

/**
 * §5.1 — everything in the app talks to this, never to IndexedDB directly,
 * so that a later Supabase backend is a drop-in replacement.
 */
export interface Store {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  /** JSON envelope, §5.1. The only defence against a cleared cache. */
  export(): Promise<string>;
  import(json: string): Promise<void>;
  /** §6 settings — reset. Back to `load() === null`, i.e. back to onboarding. */
  clear(): Promise<void>;
}

export const SCHEMA_VERSION = 1;

export type Envelope = {
  schemaVersion: number;
  exportedAt: string;
  state: AppState;
};
