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
import { byColor, isTaskColor, setCustomTaskCadence, setCustomTaskColor, TASK_PALETTE } from './customTasks';
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
    expect(tasks).toEqual([{ id: 'a', name: 'No alcohol', cadence: 'daily' }]);

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

  it('switches a task between daily and weekly without touching the rest', () => {
    const tasks = addCustomTask(addCustomTask(undefined, 'a', 'Read'), 'b', 'Call mum');
    const switched = setCustomTaskCadence(tasks, 'b', 'weekly');
    expect(switched[0]?.cadence).toBe('daily');
    expect(switched[1]?.cadence).toBe('weekly');
    expect(switched[1]?.name).toBe('Call mum');
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

const DAILY: CustomTask = { id: 'a', name: 'Read', cadence: 'daily' };
const WEEKLY: CustomTask = { id: 'w', name: 'Call mum', cadence: 'weekly' };

describe('customTaskStreak — daily', () => {
  it('counts consecutive ticked days ending today', () => {
    const logs = [day(START, ['a']), day(addDays(START, 1), ['a']), day(addDays(START, 2), ['a'])];
    expect(customTaskStreak(logs, DAILY, addDays(START, 2))).toBe(3);
  });

  it('survives today being untouched so far, counting through yesterday', () => {
    // Otherwise a streak would look broken every morning before breakfast.
    const logs = [day(START, ['a']), day(addDays(START, 1), ['a']), day(addDays(START, 2))];
    expect(customTaskStreak(logs, DAILY, addDays(START, 2))).toBe(2);
  });

  it('breaks on a missed day', () => {
    const logs = [day(START, ['a']), day(addDays(START, 1)), day(addDays(START, 2), ['a'])];
    expect(customTaskStreak(logs, DAILY, addDays(START, 2))).toBe(1);
  });

  it('is zero when never ticked', () => {
    expect(customTaskStreak([day(START)], DAILY, START)).toBe(0);
  });
});

describe('customTaskStreak — weekly', () => {
  /** 21 days from START; `on` lists the day offsets that are ticked. */
  function weeks(on: number[]): DayLog[] {
    return Array.from({ length: 21 }, (_, i) =>
      day(addDays(START, i), on.includes(i) ? ['w'] : []),
    );
  }

  it('counts weeks, not days: one tick a week keeps the streak whole', () => {
    // Weeks 0, 1 and 2 each get a single hit, on different weekdays.
    expect(customTaskStreak(weeks([2, 8, 15]), WEEKLY, addDays(START, 20))).toBe(3);
  });

  it('does not break merely because this week is young and still empty', () => {
    // Weeks 0 and 1 hit; week 2 has not been touched yet, but is not over.
    expect(customTaskStreak(weeks([2, 8]), WEEKLY, addDays(START, 15))).toBe(2);
  });

  it('breaks on a week that closed empty', () => {
    // Week 0 hit, week 1 empty, week 2 hit: only the current week counts.
    expect(customTaskStreak(weeks([2, 15]), WEEKLY, addDays(START, 16))).toBe(1);
  });

  it('treats a task with no cadence as daily', () => {
    const legacy: CustomTask = { id: 'a', name: 'Read' };
    const logs = [day(START, ['a']), day(addDays(START, 1), ['a'])];
    expect(customTaskStreak(logs, legacy, addDays(START, 1))).toBe(2);
  });
});

describe('filing colours', () => {
  const [first, second] = TASK_PALETTE;

  it('sets and clears a colour', () => {
    let tasks = addCustomTask(undefined, 'a', 'Call mum');
    tasks = setCustomTaskColor(tasks, 'a', first?.color ?? '#000000');
    expect(tasks[0]?.color).toBe(first?.color);

    tasks = setCustomTaskColor(tasks, 'a', null);
    // Absent, not undefined: a key set to undefined survives into JSON as a
    // different shape from one that was never there.
    expect('color' in (tasks[0] ?? {})).toBe(false);
  });

  it('refuses anything that is not a colour, rather than storing it', () => {
    expect(isTaskColor('#C08A2E')).toBe(true);
    expect(isTaskColor('red')).toBe(false);
    expect(isTaskColor('#C08A2')).toBe(false);
    expect(isTaskColor(undefined)).toBe(false);

    const tasks = setCustomTaskColor(addCustomTask(undefined, 'a', 'x'), 'a', 'javascript:x');
    expect('color' in (tasks[0] ?? {})).toBe(false);
  });

  it('offers exactly the building blocks’ own colours', () => {
    expect(TASK_PALETTE.length).toBeGreaterThan(0);
    for (const entry of TASK_PALETTE) expect(isTaskColor(entry.color)).toBe(true);
  });

  it('sorts by palette order, then by creation, with uncoloured last', () => {
    let tasks: CustomTask[] = [];
    for (const id of ['plain', 'late', 'early']) tasks = addCustomTask(tasks, id, id);
    tasks = setCustomTaskColor(tasks, 'late', second?.color ?? '#000000');
    tasks = setCustomTaskColor(tasks, 'early', first?.color ?? '#111111');

    expect(byColor(tasks).map((t) => t.id)).toEqual(['early', 'late', 'plain']);
  });

  it('keeps same-coloured tasks in the order they were created', () => {
    let tasks: CustomTask[] = [];
    for (const id of ['one', 'two']) tasks = addCustomTask(tasks, id, id);
    for (const id of ['one', 'two']) tasks = setCustomTaskColor(tasks, id, first?.color ?? '#000000');

    expect(byColor(tasks).map((t) => t.id)).toEqual(['one', 'two']);
  });

  it('does not mutate the list it is given', () => {
    const tasks = addCustomTask(addCustomTask(undefined, 'a', 'a'), 'b', 'b');
    byColor(tasks);
    expect(tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
