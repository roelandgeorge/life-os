/**
 * Tasks the user adds themselves, tied to no building block.
 *
 * These deliberately do **not** move the picture. A domain earns a panel and
 * a step; a custom task earns neither, because the artwork is fixed at three
 * panels and inventing a fourth per user is not possible. That is a real
 * tension with the rule that every tick must change something on screen — so
 * these are presented as a different kind of thing entirely, and the one
 * thing they do give back is a streak.
 *
 * They live outside `DomainTicks` rather than inside it. The whole step
 * engine iterates `DOMAINS`; letting user-defined ids into that record would
 * mean every function in `steps.ts` had to know which keys were real.
 */

import { addDays, type DateKey } from './dates';
import type { CustomTask, DayLog } from './types';

/** Enough for the things that genuinely recur; not a to-do list. */
export const MAX_CUSTOM_TASKS = 10;
export const MAX_TASK_NAME_LENGTH = 60;

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
): CustomTask[] {
  const current = tasks ?? [];
  if (!canAddCustomTask(current)) return [...current];
  return [...current, { id, name: name.slice(0, MAX_TASK_NAME_LENGTH) }];
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

/**
 * Consecutive ticked days ending today, or ending yesterday when today is
 * not ticked yet — so a streak does not appear broken at breakfast, before
 * the day has had a chance.
 */
export function customTaskStreak(
  logs: readonly DayLog[],
  id: string,
  today: DateKey,
): number {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const startedToday = isCustomTicked(byDate.get(today), id);
  let cursor = startedToday ? today : addDays(today, -1);

  let streak = 0;
  while (isCustomTicked(byDate.get(cursor), id)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
