/**
 * What is about to lapse.
 *
 * A weekly thing gives no daily feedback, which is exactly what makes it easy
 * to lose: nothing on screen changes for six days, and then the step drops.
 * This is the warning for that — and only for that. Daily things need no
 * warning, because missing one *is* the feedback, immediately and visibly.
 *
 * Deliberately shared by the fixed weekly domains and by weekly custom tasks:
 * from the user's side they are the same problem, so they get the same rule
 * and the same wording.
 */

import type { DateKey } from './dates';
import { expectedGapDays, type DomainConfig } from './domains';
import { cadenceOf, customHitDates, periodDaysOf } from './customTasks';
import { currentPeriod, daysLeftInPeriod, hitInRange } from './periods';
import type { CustomTask, DayLog } from './types';

/**
 * Warn once the period is down to its last two days. Sooner is nagging about
 * a week that has barely started; later leaves no room to act on it, since
 * the reminder arrives in the evening.
 */
export const RISK_DAYS_LEFT = 2;

export type RiskItem = {
  kind: 'domain' | 'custom';
  /** Domain key or custom task id. */
  id: string;
  /** Days left in the period, counting today. 1 means today is the last chance. */
  daysLeft: number;
};

function riskOf(
  hits: ReadonlySet<DateKey>,
  start: DateKey,
  today: DateKey,
  period: number,
): number | null {
  if (hitInRange(hits, currentPeriod(start, today, period), today)) return null;
  const daysLeft = daysLeftInPeriod(start, today, period);
  return daysLeft <= RISK_DAYS_LEFT ? daysLeft : null;
}

function domainHitDates(logs: readonly DayLog[], domain: DomainConfig): Set<DateKey> {
  const out = new Set<DateKey>();
  for (const log of logs) if (log.ticks[domain.key]) out.add(log.date);
  return out;
}

export function atRiskItems(
  logs: readonly DayLog[],
  domains: readonly DomainConfig[],
  tasks: readonly CustomTask[] | undefined,
  today: DateKey,
): RiskItem[] {
  const start = logs[0]?.date;
  if (start === undefined) return [];

  const out: RiskItem[] = [];

  for (const domain of domains) {
    // `daily` domains are excluded even when their cadence spans more than a
    // day: SPORT is 4x a week, so its period is two days, and warning every
    // other evening is noise rather than help. Missing a daily thing shows up
    // in the picture on its own.
    if (domain.daily) continue;
    const daysLeft = riskOf(domainHitDates(logs, domain), start, today, expectedGapDays(domain));
    if (daysLeft !== null) out.push({ kind: 'domain', id: domain.key, daysLeft });
  }

  for (const task of tasks ?? []) {
    if (cadenceOf(task) !== 'weekly') continue;
    const daysLeft = riskOf(customHitDates(logs, task.id), start, today, periodDaysOf(task));
    if (daysLeft !== null) out.push({ kind: 'custom', id: task.id, daysLeft });
  }

  // Most urgent first — the one with the least room is the one to act on.
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * The digest sent to the server so the evening reminder can name a number.
 *
 * Only opaque ids and period lengths leave the device — never a task's name,
 * and never the log itself. The server recomputes urgency on the day it
 * fires, so the reminder stays right even when the app has not been opened
 * for days, which is precisely when it is needed.
 */
export type WeeklyDigestEntry = {
  id: string;
  /** Last day this was satisfied, or null if never. */
  lastHit: DateKey | null;
  periodDays: number;
};

export function weeklyDigest(
  logs: readonly DayLog[],
  domains: readonly DomainConfig[],
  tasks: readonly CustomTask[] | undefined,
  anchor: DateKey | null,
): { anchor: DateKey | null; entries: WeeklyDigestEntry[] } {
  const entries: WeeklyDigestEntry[] = [];
  const lastOf = (hits: ReadonlySet<DateKey>): DateKey | null => {
    let last: DateKey | null = null;
    for (const d of hits) if (last === null || d > last) last = d;
    return last;
  };

  for (const domain of domains) {
    if (domain.daily) continue;
    entries.push({
      id: domain.key,
      lastHit: lastOf(domainHitDates(logs, domain)),
      periodDays: expectedGapDays(domain),
    });
  }

  for (const task of tasks ?? []) {
    if (cadenceOf(task) !== 'weekly') continue;
    entries.push({
      id: task.id,
      lastHit: lastOf(customHitDates(logs, task.id)),
      periodDays: periodDaysOf(task),
    });
  }

  return { anchor, entries };
}
