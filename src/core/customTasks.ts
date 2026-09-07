/**
 * Tasks the user adds themselves, tied to no building block.
 *
 * These deliberately do **not** move the picture. A domain earns a panel and
 * a step; a custom task earns neither, because the artwork is fixed at three
 * panels and inventing a fourth per user is not possible. That is a real
 * tension with the rule that every tick must change something on screen — so
 * these are presented as a different kind of thing entirely, and what they
 * give back instead is a streak.
 *
 * They live outside `DomainTicks` rather than inside it. The whole step
 * engine iterates `DOMAINS`; letting user-defined ids into that record would
 * mean every function in `steps.ts` had to know which keys were real.
 *
 * A task is daily unless it says otherwise. Weekly tasks use the same period
 * anchor as the weekly domains (see `periods.ts`), so "this week" means the
 * same thing everywhere in the app.
 */

import { diffDays, type DateKey } from './dates';
import { VISIBLE_DOMAINS } from './domains';
import { completedPeriods, currentPeriod, hitInRange, periodAt } from './periods';
import type { CustomTask, DayLog, TaskCadence } from './types';

/** Enough for the things that genuinely recur; not a to-do list. */
export const MAX_CUSTOM_TASKS = 10;
export const MAX_TASK_NAME_LENGTH = 60;

export const CADENCE_DAYS: Record<TaskCadence, number> = { daily: 1, weekly: 7 };

/**
 * The colours on offer are the building blocks' own, taken from the same
 * table the blocks are drawn from — so "no alcohol" can be filed under food
 * and read as belonging there. Nothing downstream looks a colour up: it is a
 * label the user applies, not a link to the domain.
 */
export const TASK_PALETTE: readonly { color: string; label: string }[] = VISIBLE_DOMAINS.map(
  (d) => ({ color: d.color, label: d.label }),
);

/**
 * Accepts any `#rrggbb`, not only the palette. A colour is stored, and a
 * later build with a different palette must not silently strip it from
 * everyone's tasks on the next import.
 */
export function isTaskColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

export function setCustomTaskColor(
  tasks: readonly CustomTask[] | undefined,
  id: string,
  color: string | null,
): CustomTask[] {
  return (tasks ?? []).map((task) => {
    if (task.id !== id) return task;
    if (color === null || !isTaskColor(color)) {
      // Dropped rather than set to undefined: `exactOptionalPropertyTypes`
      // draws a distinction, and so does a round trip through JSON.
      const { color: _cleared, ...rest } = task;
      return rest;
    }
    return { ...task, color };
  });
}

/**
 * Palette order first, then the order they were created in. The palette is
 * the domain list, so colouring a task files it under a block and the
 * history pane lists it in the same order as the step tracks above it.
 * Uncoloured tasks come last — they belong to nothing in particular.
 */
export function byColor(tasks: readonly CustomTask[]): CustomTask[] {
  const order = TASK_PALETTE.map((p) => p.color);
  const rank = (task: CustomTask) => {
    if (task.color === undefined) return order.length + 1;
    const i = order.indexOf(task.color);
    // A colour from outside the current palette still groups with its own
    // kind, just after the ones the app offers.
    return i < 0 ? order.length : i;
  };
  return tasks
    .map((task, i) => ({ task, i }))
    .sort(
      (a, b) =>
        rank(a.task) - rank(b.task) ||
        (a.task.color ?? '').localeCompare(b.task.color ?? '') ||
        a.i - b.i,
    )
    .map(({ task }) => task);
}

/** Absent cadence means daily — the shape every task had before weeklies existed. */
export function cadenceOf(task: CustomTask): TaskCadence {
  return task.cadence ?? 'daily';
}

export function periodDaysOf(task: CustomTask): number {
  return CADENCE_DAYS[cadenceOf(task)];
}

export function canAddCustomTask(tasks: readonly CustomTask[] | undefined): boolean {
  return (tasks?.length ?? 0) < MAX_CUSTOM_TASKS;
}

/**
 * Stores the name exactly as typed, capped only in length — the Settings
 * field is a controlled input, and trimming here would eat the space the
 * moment it was typed. `customTaskName` trims when it displays.
 */
export function addCustomTask(
  tasks: readonly CustomTask[] | undefined,
  id: string,
  name: string,
  cadence: TaskCadence = 'daily',
): CustomTask[] {
  const current = tasks ?? [];
  if (!canAddCustomTask(current)) return [...current];
  return [...current, { id, name: name.slice(0, MAX_TASK_NAME_LENGTH), cadence }];
}

export function renameCustomTask(
  tasks: readonly CustomTask[] | undefined,
  id: string,
  name: string,
): CustomTask[] {
  return (tasks ?? []).map((task) =>
    task.id === id ? { ...task, name: name.slice(0, MAX_TASK_NAME_LENGTH) } : task,
  );
}

export function setCustomTaskCadence(
  tasks: readonly CustomTask[] | undefined,
  id: string,
  cadence: TaskCadence,
): CustomTask[] {
  return (tasks ?? []).map((task) => (task.id === id ? { ...task, cadence } : task));
}

/**
 * Removing a task leaves its ticks behind in past logs. They are harmless —
 * nothing reads a tick whose task no longer exists — and they age out with
 * the 400-day cap. Rewriting history to erase them would cost more than it
 * saves.
 */
export function removeCustomTask(
  tasks: readonly CustomTask[] | undefined,
  id: string,
): CustomTask[] {
  return (tasks ?? []).filter((task) => task.id !== id);
}

/** Blank falls back to a placeholder rather than rendering a nameless row. */
export function customTaskName(task: CustomTask, fallback: string): string {
  const trimmed = task.name.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function isCustomTicked(log: DayLog | undefined, id: string): boolean {
  return log?.customTicks?.[id] === true;
}

export function toggleCustomTick(log: DayLog, id: string): DayLog {
  const customTicks = { ...log.customTicks };
  if (customTicks[id]) delete customTicks[id];
  else customTicks[id] = true;
  return { ...log, customTicks };
}

export function customHitDates(logs: readonly DayLog[], id: string): Set<DateKey> {
  const out = new Set<DateKey>();
  for (const log of logs) if (log.customTicks?.[id]) out.add(log.date);
  return out;
}

/**
 * Consecutive satisfied periods, counting back from the one in progress.
 *
 * The current period only counts once it has a hit — an unfinished week is
 * not yet a miss, so a streak never looks broken merely because the week is
 * young. For a daily task the period is one day and this reduces to the
 * obvious thing.
 */
export function customTaskStreak(
  logs: readonly DayLog[],
  task: CustomTask,
  today: DateKey,
): number {
  const start = logs[0]?.date;
  if (start === undefined || diffDays(today, start) < 0) return 0;

  const hits = customHitDates(logs, task.id);
  const period = periodDaysOf(task);
  let index = completedPeriods(start, today, period);

  // Skip the period in progress when it is still empty; count it when it is not.
  if (!hitInRange(hits, periodAt(start, index, period), today)) index -= 1;

  let streak = 0;
  while (index >= 0 && hitInRange(hits, periodAt(start, index, period), today)) {
    streak++;
    index--;
  }
  return streak;
}

/** Days since the most recent tick, or null if it has never been ticked. */
export function daysSinceCustomHit(
  logs: readonly DayLog[],
  id: string,
  today: DateKey,
): number | null {
  let last: DateKey | null = null;
  for (const log of logs) {
    if (log.customTicks?.[id] && (last === null || log.date > last)) last = log.date;
  }
  return last === null ? null : diffDays(today, last);
}

/** The day the current period runs out — the last chance to keep the streak. */
export function customTaskDeadline(
  logs: readonly DayLog[],
  task: CustomTask,
  today: DateKey,
): DateKey {
  const start = logs[0]?.date ?? today;
  return currentPeriod(start, today, periodDaysOf(task)).to;
}

/** Whether the period in progress has been satisfied already. */
export function customTaskDoneThisPeriod(
  logs: readonly DayLog[],
  task: CustomTask,
  today: DateKey,
): boolean {
  const start = logs[0]?.date;
  if (start === undefined) return false;
  const period = periodDaysOf(task);
  return hitInRange(customHitDates(logs, task.id), currentPeriod(start, today, period), today);
}
