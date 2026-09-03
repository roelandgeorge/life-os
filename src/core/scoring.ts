/**
 * What survives of the original scoring engine (§2) after the move to the
 * step model.
 *
 * The adherence window and the asymmetric EWMA are gone — `steps.ts` replaces
 * both. What is left is the log bookkeeping every model needs regardless, and
 * the Full Day rule (§2.6, §4.7), which never depended on scores.
 */

import { addDays, rangeDates, type DateKey } from './dates';
import { DAILY_DOMAIN_KEYS } from './domains';
import type { DayLog } from './types';

export const MAX_LOG_DAYS = 400;

export type LogIndex = ReadonlyMap<DateKey, DayLog>;

export function indexLogs(logs: readonly DayLog[]): LogIndex {
  return new Map(logs.map((l) => [l.date, l]));
}

export function startDateOf(logs: readonly DayLog[]): DateKey | null {
  return logs[0]?.date ?? null;
}

/**
 * §2.6 — every daily domain ticked. Reads `DAILY_DOMAIN_KEYS`, which now
 * covers only the domains the app actually shows, so a hidden domain cannot
 * make a Full Day unreachable.
 */
export function isFullDay(log: DayLog | undefined): boolean {
  if (!log) return false;
  return DAILY_DOMAIN_KEYS.every((k) => log.ticks[k]);
}

/** §4.7 — a density view over the last `days` days, not a streak. */
export function fullDayStrip(logs: readonly DayLog[], today: DateKey, days = 30): boolean[] {
  const index = indexLogs(logs);
  return rangeDates(addDays(today, -(days - 1)), today).map((d) => isFullDay(index.get(d)));
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
