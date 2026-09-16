/**
 * "Is this habit due today", generalised from the old fixed domains to any
 * `UserHabit` (§1.5 of docs/plan/phase-1.md). A daily habit is due every day
 * by definition; anything on a longer cadence is due once it has sat
 * untouched for its own period (`cadencePeriodDays`) — the same number that
 * decides whether it is moving the picture. Never hit at all counts as due:
 * there is nothing to collapse on.
 */

import { addDays, diffDays, rangeDates, type DateKey } from './dates';
import { WEEKLY_PERIOD_DAYS, cadencePeriodDays, isActiveOn } from './habits';
import type { DayLog, UserHabit } from './types';

/** Most recent date strictly before `before` on which `habitId` was ticked. */
export function lastHit(logs: readonly DayLog[], habitId: string, before: DateKey): DateKey | null {
  let last: DateKey | null = null;
  for (const log of logs) {
    if (log.date >= before) continue;
    if (log.ticks[habitId] && (last === null || log.date > last)) last = log.date;
  }
  return last;
}

export function isDueToday(habit: UserHabit, logs: readonly DayLog[], today: DateKey): boolean {
  const period = cadencePeriodDays(habit.cadence);
  if (period === null || period === 1) return true; // no periodic notion, or daily
  const last = lastHit(logs, habit.id, today);
  if (last === null) return true;
  return diffDays(today, last) >= period;
}

/**
 * Weekly and longer, a period already satisfied just means "done, see you
 * next week". Below that the gap is the point: training every other day
 * needs the day off, and an empty box on that day reads as a miss when it is
 * the plan working.
 */
export const REST_MAX_PERIOD_DAYS = WEEKLY_PERIOD_DAYS;

export function isRestDay(habit: UserHabit, logs: readonly DayLog[], today: DateKey): boolean {
  const period = cadencePeriodDays(habit.cadence);
  if (period === null || period === 1) return false; // no resting from daily, or from a reminder
  if (period >= REST_MAX_PERIOD_DAYS) return false;
  return !isDueToday(habit, logs, today);
}

/**
 * §5.2 — retroactive editing is allowed for 3 days back and no further: a day
 * the app was not opened costs a step, so a day you did the thing but did not
 * log it has to be correctable, and a log you can rewrite at will is not a
 * record of anything.
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
 * The day's own work, finished: every active habit on a short cadence
 * (under a week — daily habits and any `{everyDays}` under 7) that is due
 * today. Weekly and longer are deliberately out, the same reasoning as
 * before: one is available on six days out of seven, and letting that block
 * the day would mean a Tuesday could never be complete.
 */
export function dailyTasksDone(logs: readonly DayLog[], habits: readonly UserHabit[], today: DateKey): boolean {
  const log = logs.find((l) => l.date === today);
  if (!log) return false;

  const due = habits.filter((h) => {
    if (!isActiveOn(h, today)) return false;
    const period = cadencePeriodDays(h.cadence);
    return period !== null && period < WEEKLY_PERIOD_DAYS && isDueToday(h, logs, today);
  });
  // Nothing asked of today is not an achievement.
  if (due.length === 0) return false;

  return due.every((h) => log.ticks[h.id] === true);
}
