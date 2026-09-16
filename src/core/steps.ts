/**
 * The weighted panel engine (§1.5 of docs/plan/phase-1.md), replacing the old
 * one-domain-one-step model.
 *
 * Every panel still holds an integer step in [0, MAX_STEP], moved by whole
 * periods exactly as before. What changes: a panel can be fed by several
 * habits at once, each with its own cadence, its own period anchor
 * (`UserHabit.startDate`, not a shared `logs[0].date`) and its own weight
 * (`importance`). On any calendar day, every habit whose period closes that
 * day contributes `importance` to the denominator and `importance` to the
 * numerator when it was hit; the panel steps up once the weighted score
 * clears `PANEL_THRESHOLD`, down otherwise. A day nothing closes on leaves
 * the panel untouched — a panel fed by no habits never moves at all.
 *
 * Steps are still recomputed from the log on every read, never accumulated,
 * for the same reason as before: retroactive edits (3 days back) have to be
 * absorbed, and replaying is what makes "two opens in one day" produce one
 * result by construction.
 */

import { addDays, diffDays, rangeDates, type DateKey } from './dates';
import { PANEL_KEYS, domainsForPanel, type PanelKey, type PanelSteps } from './domains';
import { cadencePeriodDays, drivesPanel, isActiveOn } from './habits';
import { hitInRange, type Period } from './periods';
import { clamp } from './math';
import type { DayLog, UserHabit } from './types';

/** Artwork states per panel. Step 0 is the worst image, MAX_STEP the best. */
export const STEP_COUNT = 5;
export const MAX_STEP = STEP_COUNT - 1;

/**
 * Day 1 starts in the middle. Both directions are then visible from the
 * outset, and neither extreme is more than two periods away.
 */
export const START_STEP = 2;

/** A weighted period needs at least this share of its importance hit to step up. */
export const PANEL_THRESHOLD = 0.7;

export type StepOptions = {
  /**
   * Count the period(s) in progress too — the §2.7-style preview: ticking a
   * box has to move the picture within the same second. Only ever adds a
   * step, never subtracts: an unfinished period has not been missed yet.
   */
  includeCurrentPeriod?: boolean;
};

function habitsForPanel(habits: readonly UserHabit[], panel: PanelKey): UserHabit[] {
  const domains = new Set(domainsForPanel(panel).map((d) => d.key));
  return habits.filter((h) => h.domain !== undefined && domains.has(h.domain) && drivesPanel(h.cadence));
}

/** The period that closed on `day`, if any — periods close the day *after* their last day. */
function closedPeriodEndingBefore(habit: UserHabit, day: DateKey, period: number): Period | null {
  const diff = diffDays(day, habit.startDate);
  if (diff <= 0 || diff % period !== 0) return null;
  return { from: addDays(day, -period), to: addDays(day, -1) };
}

/** The period `today` sits in, whether or not it has closed — for the preview. */
function currentPeriodOf(habit: UserHabit, today: DateKey, period: number): Period {
  const diff = diffDays(today, habit.startDate);
  const index = diff < 0 ? 0 : Math.floor(diff / period);
  return { from: addDays(habit.startDate, index * period), to: today };
}

/**
 * `periodFor` is where eligibility lives, and deliberately not a single
 * "active on this date" check: a settled closure credits a period that
 * *ended* before today, so what must still have been true is that the habit
 * was active through the end of *that* period — not that it still is today.
 * The preview's in-progress period is the one case where "active today" is
 * exactly the right question, so its own `periodFor` checks that directly.
 */
function weightedScore(
  habits: readonly UserHabit[],
  period: (h: UserHabit) => Period | null,
  hitsOf: (h: UserHabit, p: Period) => boolean,
): number | null {
  let weight = 0;
  let hitWeight = 0;
  for (const habit of habits) {
    const p = period(habit);
    if (p === null) continue;
    weight += habit.importance;
    if (hitsOf(habit, p)) hitWeight += habit.importance;
  }
  return weight > 0 ? hitWeight / weight : null;
}

function panelStep(
  logs: readonly DayLog[],
  habits: readonly UserHabit[],
  panel: PanelKey,
  today: DateKey,
  includeCurrentPeriod: boolean,
): number {
  const relevant = habitsForPanel(habits, panel);
  if (relevant.length === 0) return START_STEP;

  const hits = new Map<string, Set<DateKey>>();
  for (const h of relevant) {
    const set = new Set<DateKey>();
    for (const log of logs) if (log.ticks[h.id]) set.add(log.date);
    hits.set(h.id, set);
  }
  const hitsInPeriod = (h: UserHabit, p: Period) => hitInRange(hits.get(h.id) ?? new Set(), p, today);

  const earliestStart = relevant.reduce(
    (min, h) => (h.startDate < min ? h.startDate : min),
    relevant[0]!.startDate,
  );

  let step = START_STEP;
  if (diffDays(today, earliestStart) >= 0) {
    for (const day of rangeDates(earliestStart, today)) {
      const score = weightedScore(
        relevant,
        (h) => {
          const period = cadencePeriodDays(h.cadence);
          if (period === null) return null;
          const p = closedPeriodEndingBefore(h, day, period);
          if (p === null) return null;
          // The period this closure credits must have ended before removal —
          // not the closing day itself, which can land on or after it.
          if (h.removedDate !== undefined && p.to >= h.removedDate) return null;
          return p;
        },
        hitsInPeriod,
      );
      if (score === null) continue; // nothing closed for this panel today
      step = clamp(step + (score >= PANEL_THRESHOLD ? 1 : -1), 0, MAX_STEP);
    }
  }

  if (includeCurrentPeriod) {
    const score = weightedScore(
      relevant,
      (h) => {
        if (!isActiveOn(h, today)) return null;
        const period = cadencePeriodDays(h.cadence);
        return period === null ? null : currentPeriodOf(h, today, period);
      },
      hitsInPeriod,
    );
    if (score !== null && score >= PANEL_THRESHOLD) step = clamp(step + 1, 0, MAX_STEP);
  }

  return step;
}

export function panelSteps(
  logs: readonly DayLog[],
  habits: readonly UserHabit[],
  today: DateKey,
  { includeCurrentPeriod = false }: StepOptions = {},
): PanelSteps {
  const out = {} as PanelSteps;
  for (const panel of PANEL_KEYS) out[panel] = panelStep(logs, habits, panel, today, includeCurrentPeriod);
  return out;
}
