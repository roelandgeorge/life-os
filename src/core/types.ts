import type { DateKey } from './dates';
import type { Cadence } from './catalog';
import type { DomainKey, PanelSteps } from './domains';

export type { Cadence } from './catalog';

/**
 * A habit the user has added — from the catalogue or written themselves.
 * Replaces both the old fixed `DomainTicks` and `CustomTask`: every habit is
 * now the same shape, and whether it moves a panel is decided by one thing,
 * `domain` being present (§1.3 of docs/plan/phase-1.md).
 */
export type UserHabit = {
  id: string;
  /** The catalogue item this came from, if any. Absent for a habit the user wrote themselves. */
  catalogId?: string;
  title: string;
  /**
   * Absent means this habit moves no panel — it still counts for XP (phase 6)
   * but nothing in the artwork answers to it, the same compromise the old
   * `CustomTask` made explicit.
   */
  domain?: DomainKey;
  cadence: Cadence;
  /** 1-5, defaults to the catalogue value when added from there, 3 for a habit the user writes themselves. */
  importance: number;
  /**
   * Periods are anchored here, not at `logs[0].date` — each habit added later
   * gets its own clock rather than inheriting one that started before it existed.
   */
  startDate: DateKey;
  /**
   * A soft delete: history and streaks up to this date stay correct, the
   * habit simply stops asking anything of the user from here on.
   */
  removedDate?: DateKey;
  /** A filing colour, `#rrggbb`. For a domain habit this defaults to the domain's own. */
  color?: string;
};

export type DayLog = {
  date: DateKey;
  /** Whether the app was opened that day. Kept for the record; the step model charges a miss either way. */
  opened: boolean;
  /** Which habits were ticked, keyed by `UserHabit.id`. Presence means ticked — there is no `false` entry. */
  ticks: Record<string, true>;
};

export type Gender = 'male' | 'female';

/**
 * Filled in by onboarding (phase 4). Optional throughout phase 1 — nothing
 * here is read yet, but the shape is fixed now so the catalogue filters
 * (`core/catalog.ts`) and the migration have somewhere to write.
 */
export type Profile = {
  gender?: Gender;
  hair?: string;
  partner?: { wanted: boolean; gender?: Gender; hair?: string };
  children?: boolean;
  domainOrder?: readonly DomainKey[];
  personaId?: string;
};

export type AppState = {
  schemaVersion: 2;
  /** Append-only, sorted by date ascending, capped at 400 days. The only source of truth. */
  logs: DayLog[];
  /** In the order they were added. */
  habits: UserHabit[];
  profile?: Profile;
  /** §6 settings — evening notification time, "HH:mm" local, or `null` for off. */
  notificationTime?: string | null;
};

/** Everything the UI needs for one moment in time. Derived, never persisted. */
export type Projection = {
  /** Steps from closed periods only. */
  steps: PanelSteps;
  /** What the picture shows: the above, plus any hit in the period(s) in progress. */
  preview: PanelSteps;
  fullDay: boolean;
};
