/**
 * What survives of the original scoring engine (§2) after the move to the
 * step model.
 *
 * The adherence window and the asymmetric EWMA are gone — `steps.ts` replaces
 * both. What is left is the log bookkeeping every model needs regardless, and
 * the Full Day rule (§2.6, §4.7), which never depended on scores.
 */

import { addDays, rangeDates, type DateKey } from './dates';
import { cadencePeriodDays, isActiveOn } from './habits';
import type { DayLog, UserHabit } from './types';

export const MAX_LOG_DAYS = 400;

export type LogIndex = ReadonlyMap<DateKey, DayLog>;

export function indexLogs(logs: readonly DayLog[]): LogIndex {
  return new Map(logs.map((l) => [l.date, l]));
}

export function startDateOf(logs: readonly DayLog[]): DateKey | null {
  return logs[0]?.date ?? null;
}

/**
 * §2.6 — every active habit on a strictly daily cadence, with a domain, is
 * ticked. A domain-less habit still doesn't count (a Full Day is about the
 * picture); a day with no such habit at all is never a Full Day — there is
 * nothing to have finished.
 */
export function isFullDay(log: DayLog | undefined, habits: readonly UserHabit[], today: DateKey): boolean {
  if (!log) return false;
  const daily = habits.filter(
    (h) => h.domain !== undefined && isActiveOn(h, today) && cadencePeriodDays(h.cadence) === 1,
  );
  if (daily.length === 0) return false;
  return daily.every((h) => log.ticks[h.id]);
}

/** §4.7 — a density view over the last `days` days, not a streak. */
export function fullDayStrip(
  logs: readonly DayLog[],
  habits: readonly UserHabit[],
  today: DateKey,
  days = 30,
): boolean[] {
  const index = indexLogs(logs);
  return rangeDates(addDays(today, -(days - 1)), today).map((d) => isFullDay(index.get(d), habits, d));
}

export function daysOfHistory(logs: readonly DayLog[], today: DateKey): number {
  const start = startDateOf(logs);
  if (start === null) return 0;
  return Math.max(0, rangeDates(start, today).length);
}

/** §5 — the log is append-only but capped at 400 days. */
export function trimLogs(logs: readonly DayLog[], today: DateKey): DayLog[] {
  const cutoff = addDays(today, -(MAX_LOG_DAYS - 1));
  return logs.filter((l) => l.date >= cutoff);
}
