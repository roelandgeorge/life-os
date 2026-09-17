import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import {
  HABIT_COLOR_PALETTE,
  MAX_CUSTOM_HABITS,
  byColor,
  cadencePeriodDays,
  canAddCustomHabit,
  drivesPanel,
  effectiveColor,
  habitDoneThisPeriod,
  habitStreak,
  isActiveOn,
  isHabitTicked,
  newCustomHabit,
  newHabitFromCatalog,
  removeHabit,
  toggleHabitTick,
  updateHabit,
} from './habits';
import { catalogById } from './catalog';
import type { DayLog, UserHabit } from './types';

const START = '2026-01-01';

function habit(overrides: Partial<UserHabit> = {}): UserHabit {
  return { id: 'h1', title: 'Read', cadence: 'daily', importance: 3, startDate: START, ...overrides };
}

function day(date: string, ticked: string[] = []): DayLog {
  const ticks: Record<string, true> = {};
  for (const id of ticked) ticks[id] = true;
  return { date, opened: true, ticks };
}

describe('cadencePeriodDays / drivesPanel', () => {
  it('maps the fixed cadences to their period lengths', () => {
    expect(cadencePeriodDays('daily')).toBe(1);
    expect(cadencePeriodDays('weekly')).toBe(7);
    expect(cadencePeriodDays('monthly')).toBe(30);
    expect(cadencePeriodDays({ everyDays: 18 })).toBe(18);
  });

  it('situational and once have no periodic notion', () => {
    expect(cadencePeriodDays('situational')).toBeNull();
    expect(cadencePeriodDays('once')).toBeNull();
  });

  it('daily, weekly, monthly and every-N-days drive a panel; situational and once do not', () => {
    expect(drivesPanel('daily')).toBe(true);
    expect(drivesPanel('weekly')).toBe(true);
    expect(drivesPanel('monthly')).toBe(true);
    expect(drivesPanel({ everyDays: 90 })).toBe(true);
    expect(drivesPanel('situational')).toBe(false);
    expect(drivesPanel('once')).toBe(false);
  });
});

describe('isActiveOn', () => {
  it('is false before the habit started', () => {
    expect(isActiveOn(habit({ startDate: '2026-02-01' }), START)).toBe(false);
  });

  it('is true from startDate through the day before removedDate', () => {
    const h = habit({ removedDate: '2026-01-10' });
    expect(isActiveOn(h, START)).toBe(true);
    expect(isActiveOn(h, '2026-01-09')).toBe(true);
    expect(isActiveOn(h, '2026-01-10')).toBe(false);
  });
});

describe('ticking a habit', () => {
  it('toggles on and off, presence-based', () => {
    const empty = day(START);
    const on = toggleHabitTick(empty, 'h1');
    expect(isHabitTicked(on, 'h1')).toBe(true);
    expect('h1' in on.ticks).toBe(true);
    const off = toggleHabitTick(on, 'h1');
    expect(isHabitTicked(off, 'h1')).toBe(false);
    expect('h1' in off.ticks).toBe(false);
  });
});

describe('habitStreak', () => {
  it('counts consecutive daily ticks ending today', () => {
    const logs = [day(START, ['h1']), day(addDays(START, 1), ['h1']), day(addDays(START, 2), ['h1'])];
    expect(habitStreak(logs, habit(), addDays(START, 2))).toBe(3);
  });

  it('survives today being untouched so far', () => {
    const logs = [day(START, ['h1']), day(addDays(START, 1), ['h1']), day(addDays(START, 2))];
    expect(habitStreak(logs, habit(), addDays(START, 2))).toBe(2);
  });

  it('counts weekly periods, not days', () => {
    const logs = Array.from({ length: 21 }, (_, i) =>
      day(addDays(START, i), [2, 8, 15].includes(i) ? ['h1'] : []),
    );
    expect(habitStreak(logs, habit({ cadence: 'weekly' }), addDays(START, 20))).toBe(3);
  });

  it('is zero for a cadence with no period', () => {
    expect(habitStreak([day(START, ['h1'])], habit({ cadence: 'situational' }), START)).toBe(0);
  });

  it('is anchored at the habit’s own startDate, not the log’s first date', () => {
    // The log starts before the habit did; the habit's own periods only
    // begin at its startDate.
    const habitStart = addDays(START, 10);
    const logs = [day(habitStart, ['h1']), day(addDays(habitStart, 1), ['h1'])];
    expect(habitStreak(logs, habit({ startDate: habitStart }), addDays(habitStart, 1))).toBe(2);
  });
});

describe('habitDoneThisPeriod', () => {
  it('is true once the in-progress period has a hit', () => {
    const logs = [day(addDays(START, 3), ['h1'])];
    expect(habitDoneThisPeriod(logs, habit({ cadence: 'weekly' }), addDays(START, 5))).toBe(true);
  });

  it('is false for a cadence with no period', () => {
    expect(habitDoneThisPeriod([day(START, ['h1'])], habit({ cadence: 'once' }), START)).toBe(false);
  });
});

describe('colour', () => {
  it('falls back to the domain colour when the habit has none of its own', () => {
    const h = habit({ domain: 'sleep' });
    expect(effectiveColor(h)).toBeDefined();
    expect(effectiveColor(h)).not.toBe(undefined);
  });

  it('a domain-less, colourless habit has no effective colour', () => {
    expect(effectiveColor(habit())).toBeUndefined();
  });

  it('an explicit colour overrides the domain default', () => {
    const h = habit({ domain: 'sleep', color: '#123456' });
    expect(effectiveColor(h)).toBe('#123456');
  });

  it('offers every domain as a palette option', () => {
    expect(HABIT_COLOR_PALETTE.length).toBe(10);
  });

  it('sorts coloured habits by palette order, then creation, uncoloured last', () => {
    const first = HABIT_COLOR_PALETTE[0]!.color;
    const second = HABIT_COLOR_PALETTE[1]!.color;
    const habits = [
      habit({ id: 'plain' }),
      habit({ id: 'late', color: second }),
      habit({ id: 'early', color: first }),
    ];
    expect(byColor(habits).map((h) => h.id)).toEqual(['early', 'late', 'plain']);
  });

  it('does not mutate the list it is given', () => {
    const habits = [habit({ id: 'a' }), habit({ id: 'b' })];
    byColor(habits);
    expect(habits.map((h) => h.id)).toEqual(['a', 'b']);
  });
});

describe('constructing new habits', () => {
  it('copies title, domain, cadence and importance from the catalogue item', () => {
    const item = catalogById('H001');
    if (!item) throw new Error('H001 missing from the catalogue');
    const h = newHabitFromCatalog(item, 'new-id', START);
    expect(h).toMatchObject({
      id: 'new-id',
      catalogId: 'H001',
      title: item.title,
      domain: item.domain,
      cadence: item.cadence,
      importance: item.importance,
      startDate: START,
    });
  });

  it('gives a self-written habit the default weight and a daily cadence', () => {
    const h = newCustomHabit('id2', 'No alcohol', START);
    expect(h).toMatchObject({ id: 'id2', title: 'No alcohol', cadence: 'daily', importance: 3 });
    expect(h.domain).toBeUndefined();
  });
});

describe('canAddCustomHabit', () => {
  it('caps active, domain-less habits but not catalogue ones', () => {
    const domainHabits = Array.from({ length: 20 }, (_, i) => habit({ id: `d${i}`, domain: 'sleep' }));
    expect(canAddCustomHabit(domainHabits)).toBe(true);

    let habits: UserHabit[] = [];
    for (let i = 0; i < MAX_CUSTOM_HABITS; i++) habits.push(habit({ id: `c${i}` }));
    expect(canAddCustomHabit(habits)).toBe(false);
  });

  it('ignores removed habits against the cap', () => {
    const habits = Array.from({ length: MAX_CUSTOM_HABITS }, (_, i) =>
      habit({ id: `c${i}`, removedDate: '2026-01-02' }),
    );
    expect(canAddCustomHabit(habits)).toBe(true);
  });
});

describe('updateHabit', () => {
  it('changes only the given fields', () => {
    const habits = [habit({ domain: 'sleep' })];
    const updated = updateHabit(habits, 'h1', { title: 'New title', importance: 5 });
    expect(updated[0]).toMatchObject({ title: 'New title', importance: 5, domain: 'sleep' });
  });

  it('clears colour and domain with null, distinct from leaving them alone', () => {
    const habits = [habit({ domain: 'sleep', color: '#111111' })];
    const cleared = updateHabit(habits, 'h1', { color: null, domain: null });
    expect(cleared[0] && 'color' in cleared[0]).toBe(false);
    expect(cleared[0]?.domain).toBeUndefined();

    const untouched = updateHabit(habits, 'h1', {});
    expect(untouched[0]).toEqual(habits[0]);
  });
});

describe('removeHabit', () => {
  it('sets removedDate rather than deleting the habit', () => {
    const habits = [habit()];
    const removed = removeHabit(habits, 'h1', '2026-01-05');
    expect(removed).toHaveLength(1);
    expect(removed[0]?.removedDate).toBe('2026-01-05');
  });
});
