/**
 * Synthetic histories. Used by the §8 test vectors and, later, by the debug
 * screen so the avatar can be driven from a plausible log rather than sliders.
 */

import { addDays, type DateKey } from './dates';
import { DOMAIN_KEYS, emptyTicks, type DomainKey } from './domains';
import type { DayLog } from './types';

export type TickPattern = Partial<Record<DomainKey, (dayIndex: number) => boolean>>;

/**
 * Every domain hitting exactly its §1 target rate.
 * Both weekly domains fire on day 0 so the first window opens on a hit rather
 * than on three days of unavoidable zero-adherence.
 */
export const AT_TARGET: TickPattern = {
  SLEEP: () => true,
  FOOD: () => true,
  SPORT: (i) => i % 7 === 0 || i % 7 === 1 || i % 7 === 3 || i % 7 === 5, // 4/7
  ORDER: (i) => i % 7 !== 6, // 6/7
  RELATIONSHIP: (i) => i % 7 === 0, // 1/7
  MIND: (i) => i % 7 === 0, // 1/7
  INCOME: (i) => i % 30 === 0, // 3/90
};

export const NOTHING: TickPattern = {};

export type BuildOptions = {
  start: DateKey;
  days: number;
  pattern?: TickPattern;
  /** Days for which no log entry is written at all: the app was never opened. */
  absent?: (dayIndex: number) => boolean;
};

export function buildLogs({ start, days, pattern = NOTHING, absent }: BuildOptions): DayLog[] {
  const logs: DayLog[] = [];
  for (let i = 0; i < days; i++) {
    if (absent?.(i)) continue;
    const ticks = emptyTicks();
    for (const key of DOMAIN_KEYS) ticks[key] = pattern[key]?.(i) ?? false;
    logs.push({ date: addDays(start, i), opened: true, ticks });
  }
  return logs;
}
