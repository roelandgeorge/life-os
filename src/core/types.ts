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
};

/**
 * What the app knows about the person (§7, much reduced).
 *
 * The twelve appearance questions are gone. They existed to parameterise a
 * generated figure; the artwork is now drawn once, of one specific person, so
 * there is nothing left for them to drive — and a drawing of you beats any
 * number of sliders approximating you. Age survives because §3 needs it: the
 * projection is always +15.
 */
export type Profile = {
  currentAge: number;
};

export type AppState = {
  profile: Profile;
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
};

/** Everything the UI needs for one moment in time. Derived, never persisted. */
export type Projection = {
  /** Steps from closed periods only. */
  steps: DomainSteps;
  /** What the picture shows: the above, plus any hit in the period in progress. */
  preview: DomainSteps;
  fullDay: boolean;
  projectionAge: number;
};
