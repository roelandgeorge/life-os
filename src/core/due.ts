/**
 * §6 — "any domain not due today is shown collapsed with its last-hit date."
 *
 * Daily domains are due every day by definition. A cadence domain (weekly,
 * quarterly) is due once it has sat untouched for its own cadence window
 * (`expectedGapDays`, domains.ts) — the same number that would make it start
 * missing its target rate. Never hit at all counts as due: there is nothing
 * to collapse on.
 */

import { addDays, diffDays, rangeDates, type DateKey } from './dates';
import { cadenceOf, isCustomTicked } from './customTasks';
import { expectedGapDays, isWeeklyCadence, WEEKLY_PERIOD_DAYS, type DomainConfig, type DomainKey } from './domains';
import type { CustomTask, DayLog } from './types';

/** Most recent date strictly before `before` on which `key` was ticked. */
export function lastHit(logs: readonly DayLog[], key: DomainKey, before: DateKey): DateKey | null {
  let last: DateKey | null = null;
  for (const log of logs) {
    if (log.date >= before) continue;
    if (log.ticks[key] && (last === null || log.date > last)) last = log.date;
  }
  return last;
}

export function isDueToday(domain: DomainConfig, logs: readonly DayLog[], today: DateKey): boolean {
  if (domain.daily) return true;
  const last = lastHit(logs, domain.key, today);
  if (last === null) return true;
  return diffDays(today, last) >= expectedGapDays(domain);
}

/**
 * Weekly and longer, a period already satisfied just means "done, see you
 * next week". Below that the gap is the point: training every other day
 * needs the day off, and an empty box on that day reads as a miss when it is
 * the plan working.
 *
 * Derived from the cadence rather than flagged per domain, and the same
 * threshold `atRisk.ts` uses — a domain either has rest built into its
 * rhythm or it is on a long cycle, and the period length is what says which.
 */
export const REST_MAX_PERIOD_DAYS = WEEKLY_PERIOD_DAYS;

export function isRestDay(
  domain: DomainConfig,
  logs: readonly DayLog[],
  today: DateKey,
): boolean {
  if (domain.daily) return false;
  if (expectedGapDays(domain) >= REST_MAX_PERIOD_DAYS) return false;
  return !isDueToday(domain, logs, today);
}

/**
 * §5.2 — "retroactive editing is allowed for 3 days back and no further."
 *
 * Which matters more now than it did under the old engine: a day the app was
 * never opened costs a step, so a day you did the thing but did not log it
 * has to be correctable. Beyond the window it is not, because a log you can
 * rewrite at will is not a record of anything.
 */
export const EDIT_WINDOW_DAYS = 3;

export function isEditable(date: DateKey, today: DateKey): boolean {
  const age = diffDays(today, date);
  return age >= 0 && age <= EDIT_WINDOW_DAYS;
}

/** Oldest first, today last — the order they are shown in, left to right. */
export function editableDays(today: DateKey): DateKey[] {
  return rangeDates(addDays(today, -EDIT_WINDOW_DAYS), today);
}

/**
 * The day's own work, finished: every short-cadence domain that is due today,
 * and every daily task the user added.
 *
 * Weekly things are deliberately out. They are not part of a day — one is due
 * on six days out of seven in the sense that you *could* do it, and letting
 * that block the day would mean a Tuesday could never be complete. They get
 * the lapse warning instead, which is the feedback a long cycle actually
 * needs.
 *
 * Wider than `isFullDay` (scoring.ts), which only counts the always-daily
 * domains: on a training day the training is part of finishing the day, and
 * on a rest day it is not — `isDueToday` already says which.
 */
export function dailyTasksDone(
  logs: readonly DayLog[],
  domains: readonly DomainConfig[],
  tasks: readonly CustomTask[] | undefined,
  today: DateKey,
): boolean {
  const log = logs.find((l) => l.date === today);
  if (!log) return false;

  const due = domains.filter((d) => !isWeeklyCadence(d) && isDueToday(d, logs, today));
  const daily = (tasks ?? []).filter((task) => cadenceOf(task) === 'daily');
  // Nothing asked of today is not an achievement. It cannot happen while any
  // daily domain exists, but a celebration for an empty list would be a lie.
  if (due.length + daily.length === 0) return false;

  return (
    due.every((d) => log.ticks[d.key]) && daily.every((task) => isCustomTicked(log, task.id))
  );
}
