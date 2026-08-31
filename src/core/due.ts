/**
 * §6 — "any domain not due today is shown collapsed with its last-hit date."
 *
 * Daily domains are due every day by definition. A cadence domain (weekly,
 * quarterly) is due once it has sat untouched for its own cadence window
 * (`expectedGapDays`, domains.ts) — the same number that would make it start
 * missing its target rate. Never hit at all counts as due: there is nothing
 * to collapse on.
 */

import { diffDays, type DateKey } from './dates';
import { expectedGapDays, type DomainConfig, type DomainKey } from './domains';
import type { DayLog } from './types';

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
