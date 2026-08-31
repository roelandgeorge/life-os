import type { AppState } from '../core/types';
import { deserialize, serialize } from './serialize';
import type { Store } from './types';

/** In-memory `Store`. Backs the tests and the debug screen. */
export class MemoryStore implements Store {
  private state: AppState | null;

  constructor(initial: AppState | null = null) {
    this.state = initial;
  }

  async load(): Promise<AppState | null> {
    return this.state;
  }

  async save(state: AppState): Promise<void> {
    this.state = state;
  }

  async export(): Promise<string> {
    if (!this.state) throw new Error('Nothing to export');
    return serialize(this.state);
  }

  async import(json: string): Promise<void> {
    this.state = deserialize(json);
  }

  async clear(): Promise<void> {
    this.state = null;
  }
}
