/**
 * Period arithmetic, shared by the domains and by user-added tasks.
 *
 * Both count in periods anchored at the first day of history, not in calendar
 * weeks. One anchor means one mental model: a weekly custom task closes its
 * week on exactly the same day RELATIONSHIP closes its own, so "this week" is
 * never two different things on one screen.
 */

import { addDays, diffDays, rangeDates, type DateKey } from './dates';

export type Period = { from: DateKey; to: DateKey };

/** How many whole periods have closed between `start` and `today`. */
export function completedPeriods(start: DateKey, today: DateKey, period: number): number {
  const elapsed = diffDays(today, start);
  return elapsed < 0 ? 0 : Math.floor(elapsed / period);
}

/** The `index`-th period counting from `start`, inclusive of both ends. */
export function periodAt(start: DateKey, index: number, period: number): Period {
  return { from: addDays(start, index * period), to: addDays(start, (index + 1) * period - 1) };
}

/** The period `today` falls in, whether or not it has closed. */
export function currentPeriod(start: DateKey, today: DateKey, period: number): Period {
  return periodAt(start, completedPeriods(start, today, period), period);
}

/**
 * Days remaining in the period `today` sits in, counting today itself. 1 means
 * today is the last chance.
 */
export function daysLeftInPeriod(start: DateKey, today: DateKey, period: number): number {
  const elapsed = diffDays(today, start);
  if (elapsed < 0) return period;
  return period - (elapsed % period);
}

export function hitInRange(
  hits: ReadonlySet<DateKey>,
  { from, to }: Period,
  cap?: DateKey,
): boolean {
  // `cap` stops the scan at today: a period that runs into the future has no
  // hits there, and walking those dates is wasted work.
  const end = cap !== undefined && cap < to ? cap : to;
  if (end < from) return false;
  return rangeDates(from, end).some((d) => hits.has(d));
}
