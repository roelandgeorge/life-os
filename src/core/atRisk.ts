/**
 * What is about to lapse.
 *
 * A weekly-or-longer habit gives no daily feedback, which is exactly what
 * makes it easy to lose: nothing on screen changes for days, then the panel
 * drops a step. This is the warning for that — and only for that. Short-cadence
 * habits need no warning, because missing one *is* the feedback, immediately.
 *
 * Generalised from the old fixed weekly domains + weekly custom tasks
 * (§1.5): every habit is the same shape now, so one rule covers all of them.
 */

import type { DateKey } from './dates';
import { WEEKLY_PERIOD_DAYS, cadencePeriodDays, habitHitDates, isActiveOn } from './habits';
import { currentPeriod, daysLeftInPeriod, hitInRange } from './periods';
import type { DayLog, UserHabit } from './types';

/**
 * Warn once the period is down to its last two days. Sooner is nagging about
 * a period that has barely started; later leaves no room to act on it, since
 * the reminder arrives in the evening.
 */
export const RISK_DAYS_LEFT = 2;

/**
 * Only things on a week-long cadence or longer get a warning — the filter is
 * the period itself, not a flag: a two-day cadence has a legitimate rest day,
 * and a warning every other evening would be nagging, not help.
 */
export const RISK_MIN_PERIOD_DAYS = WEEKLY_PERIOD_DAYS;

export type RiskItem = {
  id: string;
  /** Days left in the period, counting today. 1 means today is the last chance. */
  daysLeft: number;
};

function riskOf(hits: ReadonlySet<DateKey>, start: DateKey, today: DateKey, period: number): number | null {
  if (hitInRange(hits, currentPeriod(start, today, period), today)) return null;
  const daysLeft = daysLeftInPeriod(start, today, period);
  return daysLeft <= RISK_DAYS_LEFT ? daysLeft : null;
}

export function atRiskItems(logs: readonly DayLog[], habits: readonly UserHabit[], today: DateKey): RiskItem[] {
  const out: RiskItem[] = [];

  for (const habit of habits) {
    if (!isActiveOn(habit, today)) continue;
    const period = cadencePeriodDays(habit.cadence);
    if (period === null || period < RISK_MIN_PERIOD_DAYS) continue;
    const daysLeft = riskOf(habitHitDates(logs, habit.id), habit.startDate, today, period);
    if (daysLeft !== null) out.push({ id: habit.id, daysLeft });
  }

  // Most urgent first — the one with the least room is the one to act on.
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * The digest sent to the server so the evening reminder can name a number.
 *
 * Only opaque ids, each habit's own period anchor, and period lengths leave
 * the device — never a title, and never the log itself. Each habit is
 * anchored at its own `startDate` now (§1.5), not a single shared one, so
 * the anchor travels per entry rather than once for the whole digest.
 */
export type WeeklyDigestEntry = {
  id: string;
  anchor: DateKey;
  /** Last day this was satisfied, or null if never. */
  lastHit: DateKey | null;
  periodDays: number;
};

export function weeklyDigest(
  logs: readonly DayLog[],
  habits: readonly UserHabit[],
  today: DateKey,
): WeeklyDigestEntry[] {
  const entries: WeeklyDigestEntry[] = [];
  const lastOf = (hits: ReadonlySet<DateKey>): DateKey | null => {
    let last: DateKey | null = null;
    for (const d of hits) if (last === null || d > last) last = d;
    return last;
  };

  for (const habit of habits) {
    if (!isActiveOn(habit, today)) continue;
    const period = cadencePeriodDays(habit.cadence);
    if (period === null || period < RISK_MIN_PERIOD_DAYS) continue;
    entries.push({
      id: habit.id,
      anchor: habit.startDate,
      lastHit: lastOf(habitHitDates(logs, habit.id)),
      periodDays: period,
    });
  }

  return entries;
}
