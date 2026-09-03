/**
 * The step model. Replaces §2's rolling adherence + asymmetric EWMA.
 *
 * Every domain holds an integer step in [0, MAX_STEP] — one per rendered
 * artwork state. A period with a hit is +1, a period without one is -1.
 * Five steps, so five days of a daily domain takes you from nothing to full,
 * and one missed period costs exactly one image.
 *
 * ---------------------------------------------------------------------------
 * Two things worth stating.
 *
 * 1. THE PERIOD IS THE DOMAIN'S OWN CADENCE, NOT THE CALENDAR DAY.
 *    "Miss a day, drop a step" is the intent, and for SLEEP/FOOD it is
 *    literally that. But RELATIONSHIP is due weekly and INCOME roughly
 *    monthly; charging them -1 per calendar day would pin both at 0 forever
 *    no matter how well the user actually does. So the clock ticks at
 *    `expectedGapDays` — already derived from the §1 target rate, so a domain
 *    gets this for free rather than needing a second config field.
 *
 * 2. STEPS ARE RECOMPUTED FROM THE LOG, NEVER ACCUMULATED.
 *    Carried over deliberately from the old engine: §5.2 allows retroactive
 *    edits 3 days back, which an accumulated counter cannot absorb. Replaying
 *    every period keeps the step a pure function of the log, which is what
 *    makes "two app opens in one day" produce one result by construction.
 * ---------------------------------------------------------------------------
 */

import { addDays, diffDays, rangeDates, type DateKey } from './dates';
import { expectedGapDays, type DomainConfig, type DomainKey } from './domains';
import { clamp } from './math';
import { daysLeftInPeriod as daysLeftIn } from './periods';
import type { DayLog } from './types';

/** Artwork states per layer. Step 0 is the worst image, MAX_STEP the best. */
export const STEP_COUNT = 5;
export const MAX_STEP = STEP_COUNT - 1;

/**
 * Day 1 starts in the middle. Both directions are then visible from the
 * outset — the picture can get worse, not just better — and neither extreme
 * is more than two periods away, so the first week already means something.
 */
export const START_STEP = 2;

export type DomainSteps = Record<DomainKey, number>;

function hitDates(logs: readonly DayLog[], key: DomainKey): Set<DateKey> {
  const out = new Set<DateKey>();
  for (const log of logs) if (log.ticks[key]) out.add(log.date);
  return out;
}

export type StepOptions = {
  /**
   * Count the period in progress as well. This is the §2.7 preview: ticking a
   * box has to move the picture within the same second, so today's hit counts
   * immediately even though its period has not closed. An unfinished period
   * never subtracts — you have not missed it yet.
   */
  includeCurrentPeriod?: boolean;
};

export function domainStep(
  logs: readonly DayLog[],
  domain: DomainConfig,
  today: DateKey,
  { includeCurrentPeriod = false }: StepOptions = {},
): number {
  const start = logs[0]?.date;
  if (start === undefined || diffDays(today, start) < 0) return START_STEP;

  const period = expectedGapDays(domain);
  const hits = hitDates(logs, domain.key);
  const hitBetween = (from: DateKey, to: DateKey) =>
    rangeDates(from, to).some((d) => hits.has(d));

  const completedPeriods = Math.floor(diffDays(today, start) / period);

  let step = START_STEP;
  for (let k = 0; k < completedPeriods; k++) {
    const from = addDays(start, k * period);
    const to = addDays(start, (k + 1) * period - 1);
    step = clamp(step + (hitBetween(from, to) ? 1 : -1), 0, MAX_STEP);
  }

  if (includeCurrentPeriod) {
    const from = addDays(start, completedPeriods * period);
    if (hitBetween(from, today)) step = clamp(step + 1, 0, MAX_STEP);
  }

  return step;
}

export function allSteps(
  logs: readonly DayLog[],
  domains: readonly DomainConfig[],
  today: DateKey,
  options: StepOptions = {},
): DomainSteps {
  const out = {} as DomainSteps;
  for (const d of domains) out[d.key] = domainStep(logs, d, today, options);
  return out;
}

/**
 * How many days until this domain's current period closes. Drives the "one
 * more day and the picture moves" hint — with only five states, most days
 * would otherwise show no change at all, which is the one thing discrete
 * artwork costs us versus the old continuous model.
 */
export function daysLeftInPeriod(
  logs: readonly DayLog[],
  domain: DomainConfig,
  today: DateKey,
): number {
  const start = logs[0]?.date;
  const period = expectedGapDays(domain);
  return start === undefined ? period : daysLeftIn(start, today, period);
}
