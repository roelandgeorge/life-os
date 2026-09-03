import type { DateKey } from './dates';
import type { DomainKey, DomainTicks } from './domains';
import type { DomainSteps } from './steps';

/** §5 data model. */

export type DayLog = {
  date: DateKey;
  /** Whether the app was opened that day. Kept for the record; the step model
   *  charges a miss either way, so it no longer grants amnesty (§2.2). */
  opened: boolean;
  ticks: DomainTicks;
  /**
   * Ticks for user-added tasks, keyed by task id. Separate from `ticks`
   * because the step engine iterates `DOMAINS` and must never meet a key it
   * does not recognise. Absent on days before the feature existed.
   */
  customTicks?: Record<string, boolean>;
};

/**
 * A task the user added that belongs to no building block, and therefore
 * moves no panel. See `core/customTasks.ts` for why that is a deliberate
 * compromise rather than an oversight.
 */
export type CustomTask = {
  id: string;
  name: string;
  /** Absent means daily — the shape every task had before weeklies existed. */
  cadence?: TaskCadence;
};

export type TaskCadence = 'daily' | 'weekly';

export type AppState = {
  /** Append-only, sorted by date ascending, capped at 400 days (§5).
   *  The only source of truth: every step is recomputed from this. */
  logs: DayLog[];
  /** §6 settings — evening notification time, "HH:mm" local, or `null` for off. */
  notificationTime?: string | null;
  /**
   * What each check-in is called, when the user has renamed it. Falls back to
   * the §5.3 default per domain.
   *
   * "Slept 8 hours" is a guess at what the domain means to this person;
   * "Went to bed before 22:30" is the thing they actually do. A box you wrote
   * yourself is harder to tick dishonestly.
   */
  taskLabels?: Partial<Record<DomainKey, string>>;
  /** User-added tasks, in the order they were created. */
  customTasks?: CustomTask[];
};

/** Everything the UI needs for one moment in time. Derived, never persisted. */
export type Projection = {
  /** Steps from closed periods only. */
  steps: DomainSteps;
  /** What the picture shows: the above, plus any hit in the period in progress. */
  preview: DomainSteps;
  fullDay: boolean;
};
