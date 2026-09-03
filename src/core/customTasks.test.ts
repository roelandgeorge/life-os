import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { emptyTicks } from './domains';
import {
  MAX_CUSTOM_TASKS,
  MAX_TASK_NAME_LENGTH,
  addCustomTask,
  canAddCustomTask,
  customTaskName,
  customTaskStreak,
  isCustomTicked,
  removeCustomTask,
  renameCustomTask,
  toggleCustomTick,
} from './customTasks';
import type { CustomTask, DayLog } from './types';

const START = '2026-01-01';

function day(date: string, ticked: string[] = []): DayLog {
  const customTicks: Record<string, boolean> = {};
  for (const id of ticked) customTicks[id] = true;
  return { date, opened: true, ticks: emptyTicks(), customTicks };
}

describe('managing custom tasks', () => {
  it('adds, renames and removes by id', () => {
    let tasks = addCustomTask(undefined, 'a', 'No alcohol');
    expect(tasks).toEqual([{ id: 'a', name: 'No alcohol' }]);

    tasks = renameCustomTask(tasks, 'a', 'No alcohol on weekdays');
    expect(tasks[0]?.name).toBe('No alcohol on weekdays');

    expect(removeCustomTask(tasks, 'a')).toEqual([]);
  });

  it('keeps a trailing space while typing, as the label fields do', () => {
    // Same regression as taskLabels: trimming here would eat the space the
    // instant it was typed, because the Settings field is controlled.
    expect(addCustomTask(undefined, 'a', 'No ')[0]?.name).toBe('No ');
    expect(renameCustomTask([{ id: 'a', name: 'x' }], 'a', 'No ')[0]?.name).toBe('No ');
  });

  it('caps the name length', () => {
    const long = 'x'.repeat(MAX_TASK_NAME_LENGTH + 20);
    expect(addCustomTask(undefined, 'a', long)[0]?.name).toHaveLength(MAX_TASK_NAME_LENGTH);
  });

  it('refuses to grow past the cap', () => {
    let tasks: CustomTask[] = [];
    for (let i = 0; i < MAX_CUSTOM_TASKS + 3; i++) tasks = addCustomTask(tasks, `id${i}`, `t${i}`);
    expect(tasks).toHaveLength(MAX_CUSTOM_TASKS);
    expect(canAddCustomTask(tasks)).toBe(false);
  });

  it('falls back to a placeholder rather than showing a nameless row', () => {
    expect(customTaskName({ id: 'a', name: '   ' }, 'Unnamed')).toBe('Unnamed');
    expect(customTaskName({ id: 'a', name: ' Read  ' }, 'Unnamed')).toBe('Read');
  });
});

describe('ticking a custom task', () => {
  it('toggles on and off', () => {
    const empty = day(START);
    const on = toggleCustomTick(empty, 'a');
    expect(isCustomTicked(on, 'a')).toBe(true);
    expect(isCustomTicked(toggleCustomTick(on, 'a'), 'a')).toBe(false);
  });

  it('leaves the domain ticks untouched — the step engine never sees these', () => {
    const before = day(START);
    const after = toggleCustomTick(before, 'a');
    expect(after.ticks).toEqual(before.ticks);
  });
});

describe('customTaskStreak', () => {
  it('counts consecutive ticked days ending today', () => {
    const logs = [day(START, ['a']), day(addDays(START, 1), ['a']), day(addDays(START, 2), ['a'])];
    expect(customTaskStreak(logs, 'a', addDays(START, 2))).toBe(3);
  });

  it('survives today being untouched so far, counting through yesterday', () => {
    // Otherwise a streak would look broken every morning before breakfast.
    const logs = [day(START, ['a']), day(addDays(START, 1), ['a']), day(addDays(START, 2))];
    expect(customTaskStreak(logs, 'a', addDays(START, 2))).toBe(2);
  });

  it('breaks on a missed day', () => {
    const logs = [day(START, ['a']), day(addDays(START, 1)), day(addDays(START, 2), ['a'])];
    expect(customTaskStreak(logs, 'a', addDays(START, 2))).toBe(1);
  });

  it('is zero when never ticked', () => {
    expect(customTaskStreak([day(START)], 'a', START)).toBe(0);
  });
});
