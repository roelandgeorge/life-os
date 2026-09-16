/**
 * v1 -> v2 migration (§1.4 of docs/plan/phase-1.md).
 *
 * v1 kept five fixed check-ins (SLEEP, FOOD, SPORT, RELATIONSHIP, INCOME —
 * ORDER and MIND existed in the type but were never shown) plus a side list
 * of user-added custom tasks. v2 has one shape, `UserHabit`, for both: each
 * visible v1 block becomes a domain habit, each custom task becomes a
 * domain-less one. Every migrated habit is anchored at the old `logs[0].date`
 * — the single anchor v1 periods already used for everything.
 *
 * Called from `store/serialize.ts` (import) and `store/indexeddb.ts` (a
 * stored v1 record); the migrated record is written back immediately so the
 * migration runs at most once per install.
 */

import type { DateKey } from '../core/dates';
import type { DomainKey } from '../core/domains';
import type { AppState, DayLog, UserHabit } from '../core/types';

export const V1_DOMAIN_KEYS = ['SLEEP', 'FOOD', 'SPORT', 'ORDER', 'RELATIONSHIP', 'MIND', 'INCOME'] as const;
export type V1DomainKey = (typeof V1_DOMAIN_KEYS)[number];

export type V1CustomTask = {
  id: string;
  name: string;
  cadence?: 'daily' | 'weekly';
  color?: string;
};

export type V1DayLog = {
  date: DateKey;
  opened: boolean;
  ticks: Partial<Record<V1DomainKey, boolean>>;
  customTicks?: Record<string, boolean>;
};

export type V1AppState = {
  logs: V1DayLog[];
  notificationTime?: string | null;
  taskLabels?: Partial<Record<V1DomainKey, string>>;
  customTasks?: V1CustomTask[];
};

/**
 * Only the five domains v1 ever showed a checkbox for — ORDER and MIND were
 * `visible: false` and never collected a real tick, so migrating them would
 * only manufacture two habits nobody ever interacted with.
 */
const MIGRATED_DOMAIN: Record<
  'SLEEP' | 'FOOD' | 'SPORT' | 'RELATIONSHIP' | 'INCOME',
  { id: string; domain: DomainKey; cadence: UserHabit['cadence']; defaultTitle: string }
> = {
  SLEEP: { id: 'legacy-sleep', domain: 'sleep', cadence: 'daily', defaultTitle: 'Slept 8 hours' },
  FOOD: { id: 'legacy-food', domain: 'nutrition', cadence: 'daily', defaultTitle: 'Hit calories & protein' },
  SPORT: {
    id: 'legacy-sport',
    domain: 'training',
    cadence: { everyDays: 2 },
    defaultTitle: 'Strength training',
  },
  RELATIONSHIP: {
    id: 'legacy-relationship',
    domain: 'family',
    cadence: 'weekly',
    defaultTitle: 'Invested in the relationship',
  },
  INCOME: {
    id: 'legacy-income',
    domain: 'finance',
    cadence: 'weekly',
    defaultTitle: 'Worked on career or income',
  },
};

const MIGRATED_DOMAIN_KEYS = Object.keys(MIGRATED_DOMAIN) as (keyof typeof MIGRATED_DOMAIN)[];

/** v1 had no notion of per-habit weight; the middle of the new 1-5 scale is the neutral choice. */
export const MIGRATED_IMPORTANCE = 3;

const FALLBACK_START_DATE: DateKey = '1970-01-01';

export function migrateV1ToV2(v1: V1AppState): AppState {
  const startDate: DateKey = v1.logs[0]?.date ?? FALLBACK_START_DATE;

  const habits: UserHabit[] = [];
  for (const key of MIGRATED_DOMAIN_KEYS) {
    const def = MIGRATED_DOMAIN[key];
    const label = v1.taskLabels?.[key]?.trim();
    habits.push({
      id: def.id,
      title: label ? label : def.defaultTitle,
      domain: def.domain,
      cadence: def.cadence,
      importance: MIGRATED_IMPORTANCE,
      startDate,
    });
  }

  for (const task of v1.customTasks ?? []) {
    const habit: UserHabit = {
      id: task.id,
      title: task.name,
      cadence: task.cadence ?? 'daily',
      importance: MIGRATED_IMPORTANCE,
      startDate,
    };
    if (task.color !== undefined) habit.color = task.color;
    habits.push(habit);
  }

  const logs: DayLog[] = v1.logs.map((log) => {
    const ticks: Record<string, true> = {};
    for (const key of MIGRATED_DOMAIN_KEYS) {
      if (log.ticks[key]) ticks[MIGRATED_DOMAIN[key].id] = true;
    }
    for (const [id, hit] of Object.entries(log.customTicks ?? {})) {
      if (hit) ticks[id] = true;
    }
    return { date: log.date, opened: log.opened, ticks };
  });

  return {
    schemaVersion: 2,
    logs,
    habits,
    notificationTime: v1.notificationTime ?? null,
  };
}
