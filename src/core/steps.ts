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
   * box has to move the picture within the same second, once the periods in
   * progress clear `PANEL_THRESHOLD` by weight, exactly as a closing period
   * must. One step at most. Only ever adds a step, never subtracts: an
   * unfinished period has not been missed yet.
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
 * One day on which at least one period feeding the panel closed: the step it
 * left the panel on, whether the weighted score cleared the threshold, and
 * the habits whose closing period had no hit. History reads this to say
 * which day a panel dropped and what was missed.
 */
export type PanelClosing = {
  /** The day the periods closed, which is the day after their last day. */
  date: DateKey;
  step: number;
  cleared: boolean;
  /** Habit ids whose period closed on `date` without a hit. */
  missed: string[];
};

/**
 * Eligibility is checked against the period being credited, not against
 * today: a settled closure credits a period that *ended* before today, so
 * what must still have been true is that the habit was active through the
 * end of *that* period, not that it still is today.
 */
function closingsFor(
  relevant: readonly UserHabit[],
  hitsInPeriod: (h: UserHabit, p: Period) => boolean,
  today: DateKey,
): PanelClosing[] {
  const out: PanelClosing[] = [];
  const first = relevant[0];
  if (!first) return out;
  const earliestStart = relevant.reduce((min, h) => (h.startDate < min ? h.startDate : min), first.startDate);
  if (diffDays(today, earliestStart) < 0) return out;

  let step = START_STEP;
  for (const day of rangeDates(earliestStart, today)) {
    let weight = 0;
    let hitWeight = 0;
    const missed: string[] = [];
    for (const h of relevant) {
      const period = cadencePeriodDays(h.cadence);
      if (period === null) continue;
      const p = closedPeriodEndingBefore(h, day, period);
      if (p === null) continue;
      // The period this closure credits must have ended before removal —
      // not the closing day itself, which can land on or after it.
      if (h.removedDate !== undefined && p.to >= h.removedDate) continue;
      weight += h.importance;
      if (hitsInPeriod(h, p)) hitWeight += h.importance;
      else missed.push(h.id);
    }
    if (weight === 0) continue; // nothing closed for this panel today
    const cleared = hitWeight / weight >= PANEL_THRESHOLD;
    step = clamp(step + (cleared ? 1 : -1), 0, MAX_STEP);
    out.push({ date: day, step, cleared, missed });
  }
  return out;
}

function hitsFor(logs: readonly DayLog[], relevant: readonly UserHabit[], today: DateKey) {
  const hits = new Map<string, Set<DateKey>>();
  for (const h of relevant) {
    const set = new Set<DateKey>();
    for (const log of logs) if (log.ticks[h.id]) set.add(log.date);
    hits.set(h.id, set);
  }
  return (h: UserHabit, p: Period) => hitInRange(hits.get(h.id) ?? new Set(), p, today);
}

/** Every closing day for one panel, oldest first, up to and including `today`. */
export function panelClosings(
  logs: readonly DayLog[],
  habits: readonly UserHabit[],
  panel: PanelKey,
  today: DateKey,
): PanelClosing[] {
  const relevant = habitsForPanel(habits, panel);
  return closingsFor(relevant, hitsFor(logs, relevant, today), today);
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

  const hitsInPeriod = hitsFor(logs, relevant, today);
  const closings = closingsFor(relevant, hitsInPeriod, today);
  let step = closings[closings.length - 1]?.step ?? START_STEP;

  if (includeCurrentPeriod) {
    // The same weighted threshold the settled score uses, applied to the
    // periods in progress: the picture moves only once today's ticks reach
    // 70% of the panel's weight, and by one step at most.
    let weight = 0;
    let hitWeight = 0;
    for (const h of relevant) {
      if (!isActiveOn(h, today)) continue;
      const period = cadencePeriodDays(h.cadence);
      if (period === null) continue;
      weight += h.importance;
      if (hitsInPeriod(h, currentPeriodOf(h, today, period))) hitWeight += h.importance;
    }
    if (weight > 0 && hitWeight / weight >= PANEL_THRESHOLD) step = clamp(step + 1, 0, MAX_STEP);
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
