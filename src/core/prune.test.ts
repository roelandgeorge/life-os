import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { staleHabits } from './prune';
import type { DayLog, UserHabit } from './types';

const START = '2026-01-01';
const habit = (overrides: Partial<UserHabit> = {}): UserHabit => ({
  id: 'read',
  title: 'Read',
  cadence: 'daily',
  importance: 3,
  order: 0,
  startDate: START,
  ...overrides,
});
const tick = (n: number, id = 'read'): DayLog => ({ date: addDays(START, n), opened: true, ticks: { [id]: true } });
const ids = (logs: DayLog[], habits: UserHabit[], day: number) => staleHabits(logs, habits, addDays(START, day)).map((s) => s.id);

describe('staleHabits', () => {
  it('a daily habit never ticked in 28 days is stale, at 27 it is not', () => {
    expect(ids([], [habit()], 28)).toEqual(['read']);
    expect(ids([], [habit()], 27)).toEqual([]);
  });

  it('counts silence from the last tick', () => {
    expect(ids([tick(5)], [habit()], 32)).toEqual([]);
    expect(ids([tick(5)], [habit()], 33)).toEqual(['read']);
    expect(staleHabits([tick(5)], [habit()], addDays(START, 33))).toEqual([{ id: 'read', silentDays: 28 }]);
  });

  it('a monthly habit gets 60 days', () => {
    const monthly = habit({ cadence: 'monthly' });
    expect(ids([], [monthly], 59)).toEqual([]);
    expect(ids([], [monthly], 60)).toEqual(['read']);
  });

  it('Keep silences it for one more window', () => {
    expect(ids([], [habit({ pruneKeptOn: addDays(START, 30) })], 40)).toEqual([]);
    expect(ids([], [habit({ pruneKeptOn: addDays(START, 30) })], 58)).toEqual(['read']);
  });

  it('never a removed habit or one with no period', () => {
    expect(ids([], [habit({ removedDate: addDays(START, 10) })], 40)).toEqual([]);
    expect(ids([], [habit({ cadence: 'situational' })], 40)).toEqual([]);
  });

  it('most silent first, then by order', () => {
    const habits = [habit({ id: 'b', order: 1 }), habit({ id: 'a', order: 0 }), habit({ id: 'c', order: 2, startDate: addDays(START, 5) })];
    expect(ids([], habits, 40)).toEqual(['a', 'b', 'c']);
  });
});
