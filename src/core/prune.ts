/**
 * Habits that have gone silent, offered for removal or rewriting
 * (docs/plan/phase-5.md §5.7).
 *
 * A habit never ticked still adds its `importance` to its panel's weight
 * every time its period closes (`steps.ts`), so an abandoned important habit
 * can hold a panel under the threshold however well everything else goes.
 * The suggestion is about the picture, not about tidiness.
 */

import { addDays, diffDays, type DateKey } from './dates';
import { cadencePeriodDays, habitHitDates, isActiveOn } from './habits';
import { hitInRange } from './periods';
import type { DayLog, UserHabit } from './types';

/** The shortest silence worth asking about: four weeks. */
export const PRUNE_MIN_DAYS = 28;

export type StaleItem = {
  id: string;
  /** Days since the last tick, or since the habit started if it never had one. */
  silentDays: number;
};

/** Two whole periods, never less than four weeks: 28 days for anything up to every two weeks, 60 for monthly. */
export function pruneWindow(period: number): number {
  return Math.max(PRUNE_MIN_DAYS, 2 * period);
}

export function staleHabits(logs: readonly DayLog[], habits: readonly UserHabit[], today: DateKey): StaleItem[] {
  const out: (StaleItem & { order: number })[] = [];

  for (const habit of habits) {
    if (!isActiveOn(habit, today)) continue;
    const period = cadencePeriodDays(habit.cadence);
    if (period === null) continue;

    const window = pruneWindow(period);
    if (diffDays(today, habit.startDate) < window) continue;
    if (habit.pruneKeptOn !== undefined && diffDays(today, habit.pruneKeptOn) < window) continue;

    const hits = habitHitDates(logs, habit.id);
    if (hitInRange(hits, { from: addDays(today, -(window - 1)), to: today })) continue;

    let last: DateKey | null = null;
    for (const d of hits) if (d <= today && (last === null || d > last)) last = d;
    out.push({ id: habit.id, silentDays: diffDays(today, last ?? habit.startDate), order: habit.order });
  }

  return out
    .sort((a, b) => b.silentDays - a.silentDays || a.order - b.order)
    .map(({ id, silentDays }) => ({ id, silentDays }));
}
