import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import {
  HABIT_COLOR_PALETTE,
  MAX_CUSTOM_HABITS,
  byColor,
  CADENCE_CHOICES,
  cadencePeriodDays,
  canAddCustomHabit,
  drivesPanel,
  effectiveColor,
  habitDoneThisPeriod,
  habitStreak,
  isActiveOn,
  isHabitTicked,
  activeInOrder,
  moveHabit,
  newCustomHabit,
  placeHabit,
  withOrder,
  newHabitFromCatalog,
  removeHabit,
  toggleHabitTick,
  updateHabit,
  sameCadence,
} from './habits';
import { catalogById } from './catalog';
import type { DayLog, UserHabit } from './types';

const START = '2026-01-01';

function habit(overrides: Partial<UserHabit> = {}): UserHabit {
  return { id: 'h1', title: 'Read', cadence: 'daily', importance: 3, order: 0, startDate: START, ...overrides };
}

function day(date: string, ticked: string[] = []): DayLog {
  const ticks: Record<string, true> = {};
  for (const id of ticked) ticks[id] = true;
  return { date, opened: true, ticks };
}

describe('the cadences the editor offers (docs/onboarding/07-revisions.md §1)', () => {
  it('offers every other day and every two weeks, which only the model had', () => {
    expect(CADENCE_CHOICES.map((c) => c.key)).toEqual([
      'daily',
      'everyOtherDay',
      'weekly',
      'everyTwoWeeks',
      'monthly',
    ]);
    expect(CADENCE_CHOICES.map((c) => cadencePeriodDays(c.cadence))).toEqual([1, 2, 7, 14, 30]);
  });

  it('every one of them moves a panel, so no choice quietly disconnects a habit from the picture', () => {
    for (const { key, cadence } of CADENCE_CHOICES) {
      expect(drivesPanel(cadence), key).toBe(true);
    }
  });

  it('sameCadence compares the object cadences by value, since === never will', () => {
    expect(sameCadence({ everyDays: 2 }, { everyDays: 2 })).toBe(true);
    expect(sameCadence({ everyDays: 2 }, { everyDays: 14 })).toBe(false);
    expect(sameCadence('weekly', 'weekly')).toBe(true);
    expect(sameCadence('weekly', { everyDays: 7 })).toBe(false);
  });

  it('H019 is filed at the frequency its own title states', () => {
    // "Train full body 3-4x a week" sat at `weekly`, where one tick satisfied
    // the whole week.
    expect(cadencePeriodDays(catalogById('H019')!.cadence)).toBe(2);
  });
});

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

  it('carries the domain the form was opened from, and an emoji when given', () => {
    const h = newCustomHabit('id2', { title: 'No alcohol', importance: 5, cadence: 'weekly', domain: 'nutrition', emoji: '🍷' }, START);
    expect(h).toMatchObject({ id: 'id2', title: 'No alcohol', cadence: 'weekly', importance: 5, domain: 'nutrition', emoji: '🍷' });
    expect(h.color).toBeUndefined();
  });

  it('omits emoji entirely when none is given', () => {
    const h = newCustomHabit('id2', { title: 'No alcohol', importance: 3, cadence: 'daily', domain: 'nutrition' }, START);
    expect(h.emoji).toBeUndefined();
  });
});

describe('canAddCustomHabit', () => {
  it('caps active, self-written habits but not catalogue ones', () => {
    const catalogHabits = Array.from({ length: 20 }, (_, i) =>
      habit({ id: `d${i}`, domain: 'sleep', catalogId: `H${i}` }),
    );
    expect(canAddCustomHabit(catalogHabits)).toBe(true);

    let habits: UserHabit[] = [];
    for (let i = 0; i < MAX_CUSTOM_HABITS; i++) habits.push(habit({ id: `c${i}`, domain: 'sleep' }));
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

describe('order', () => {
  const fromCatalog = (id: string, catalogId: string, order?: number) => {
    const h: { id: string; catalogId: string; title: string; cadence: 'daily'; importance: number; startDate: string; order?: number } =
      { id, catalogId, title: id, cadence: 'daily', importance: 3, startDate: START };
    if (order !== undefined) h.order = order;
    return h;
  };
  const sequence = (habits: readonly UserHabit[]) => activeInOrder(habits, START).map((h) => h.id);

  it('withOrder returns the same array when every habit already has a unique order', () => {
    const habits = [habit({ id: 'a', order: 1 }), habit({ id: 'b', order: 0 })];
    expect(withOrder(habits)).toBe(habits);
  });

  it('withOrder sorts a record with no orders by dayPosition, written habits last', () => {
    const habits = withOrder([
      { id: 'mine', title: 'Mine', cadence: 'daily', importance: 3, startDate: START },
      fromCatalog('retinol', 'H038'),
      fromCatalog('sleep', 'H001'),
      fromCatalog('steps', 'H020'),
    ]);
    expect(sequence(habits)).toEqual(['sleep', 'steps', 'retinol', 'mine']);
    expect(habits.map((h) => h.order).sort()).toEqual([0, 1, 2, 3]);
  });

  it('withOrder treats a duplicated order as missing', () => {
    const habits = withOrder([fromCatalog('a', 'H038', 0), fromCatalog('b', 'H001', 0)]);
    expect(sequence(habits)).toEqual(['b', 'a']);
  });

  it('placeHabit puts a catalogue habit before the first later one, past a user-moved list', () => {
    // The user moved retinol to the top; supplements (12) still lands before steps (65).
    const habits = withOrder([fromCatalog('retinol', 'H038', 0), fromCatalog('sleep', 'H001', 1), fromCatalog('steps', 'H020', 2)]);
    const placed = placeHabit(habits, fromCatalog('supps', 'H011'));
    expect(sequence(placed)).toEqual(['retinol', 'sleep', 'supps', 'steps']);
    expect(placed.map((h) => h.order).sort()).toEqual([0, 1, 2, 3]);
  });

  it('placeHabit puts a written habit at the end', () => {
    const habits = withOrder([fromCatalog('sleep', 'H001', 0), fromCatalog('retinol', 'H038', 1)]);
    const placed = placeHabit(habits, { id: 'mine', title: 'Mine', cadence: 'daily', importance: 3, startDate: START });
    expect(sequence(placed)).toEqual(['sleep', 'retinol', 'mine']);
  });

  it('placeHabit keeps a late catalogue habit ahead of written habits at the end', () => {
    const habits = withOrder([
      fromCatalog('sleep', 'H001', 0),
      fromCatalog('retinol', 'H038', 1),
      { id: 'mine', title: 'Mine', cadence: 'daily', importance: 3, startDate: START, order: 2 },
    ]);
    expect(sequence(placeHabit(habits, fromCatalog('bed', 'H002')))).toEqual(['sleep', 'retinol', 'bed', 'mine']);
  });

  it('placeHabit ignores a removed habit when finding the place', () => {
    const habits = withOrder([
      { ...fromCatalog('sleep', 'H001', 0) },
      { ...fromCatalog('old', 'H011', 1), removedDate: START },
      { ...fromCatalog('retinol', 'H038', 2) },
    ]);
    const placed = placeHabit(habits, fromCatalog('steps', 'H020'));
    expect(sequence(placed)).toEqual(['sleep', 'steps', 'retinol']);
  });

  it('moveHabit swaps with the neighbour and stops at either end', () => {
    const habits = withOrder([fromCatalog('a', 'H001', 0), fromCatalog('b', 'H020', 1), fromCatalog('c', 'H038', 2)]);
    expect(sequence(moveHabit(habits, 'b', -1, START))).toEqual(['b', 'a', 'c']);
    expect(sequence(moveHabit(habits, 'b', 1, START))).toEqual(['a', 'c', 'b']);
    expect(moveHabit(habits, 'a', -1, START)).toBe(habits);
    expect(moveHabit(habits, 'c', 1, START)).toBe(habits);
  });

  it('moveHabit skips a removed habit between two active ones', () => {
    const habits: UserHabit[] = [
      habit({ id: 'a', order: 0 }),
      habit({ id: 'gone', order: 1, removedDate: START }),
      habit({ id: 'c', order: 2 }),
    ];
    expect(sequence(moveHabit(habits, 'c', -1, START))).toEqual(['c', 'a']);
  });
});
