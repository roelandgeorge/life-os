import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { MAX_STEP, START_STEP, panelSteps } from './steps';
import type { DayLog, UserHabit } from './types';

const START = '2026-01-01';

/** `pattern(i)` decides whether day `i` is a hit for `habitId`. */
function logsFor(days: number, habitId: string, pattern: (i: number) => boolean): DayLog[] {
  return Array.from({ length: days }, (_, i) => {
    const ticks: Record<string, true> = {};
    if (pattern(i)) ticks[habitId] = true;
    return { date: addDays(START, i), opened: true, ticks };
  });
}

function mergeLogs(...lists: DayLog[][]): DayLog[] {
  const byDate = new Map<string, DayLog>();
  for (const list of lists) {
    for (const log of list) {
      const existing = byDate.get(log.date);
      byDate.set(log.date, existing ? { ...existing, ticks: { ...existing.ticks, ...log.ticks } } : log);
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

const TRAINING_HABIT: UserHabit = {
  id: 'train',
  title: 'Train',
  domain: 'training', // feeds only `body`
  cadence: 'daily',
  importance: 5,
  startDate: START,
};

describe('panelSteps — a single daily habit', () => {
  it('starts in the middle on day 1', () => {
    const p = panelSteps(logsFor(1, 'train', () => true), [TRAINING_HABIT], START);
    expect(p.body).toBe(START_STEP);
    expect(START_STEP).toBe(2);
  });

  it('reaches the top two ticked days after the start', () => {
    const l = logsFor(5, 'train', () => true);
    expect(panelSteps(l, [TRAINING_HABIT], addDays(START, 2)).body).toBe(MAX_STEP);
  });

  it('drops one step on a missed day, after climbing to the ceiling', () => {
    const l = logsFor(6, 'train', (i) => i < 5);
    expect(panelSteps(l, [TRAINING_HABIT], addDays(START, 6)).body).toBe(MAX_STEP - 1);
  });

  it('clamps at the ceiling and the floor', () => {
    expect(panelSteps(logsFor(30, 'train', () => true), [TRAINING_HABIT], addDays(START, 30)).body).toBe(
      MAX_STEP,
    );
    expect(panelSteps(logsFor(20, 'train', () => false), [TRAINING_HABIT], addDays(START, 20)).body).toBe(0);
  });

  it("counts today's tick only under includeCurrentPeriod, and never subtracts for it", () => {
    const l = logsFor(3, 'train', (i) => i === 2);
    const today = addDays(START, 2);
    expect(panelSteps(l, [TRAINING_HABIT], today).body).toBe(0);
    expect(panelSteps(l, [TRAINING_HABIT], today, { includeCurrentPeriod: true }).body).toBe(1);

    const missed = logsFor(3, 'train', (i) => i === 0);
    expect(panelSteps(missed, [TRAINING_HABIT], today, { includeCurrentPeriod: true }).body).toBe(START_STEP);
  });

  it('a panel fed by no habits stays put', () => {
    expect(panelSteps([], [], addDays(START, 40)).body).toBe(START_STEP);
  });
});

describe('panelSteps — cadence and anchoring', () => {
  it('a weekly habit steps once per week, not per day', () => {
    const family: UserHabit = { id: 'fam', title: 'Family', domain: 'family', cadence: 'weekly', importance: 4, startDate: START };
    const l = logsFor(21, 'fam', (i) => i % 7 === 0);
    expect(panelSteps(l, [family], addDays(START, 21)).partner).toBe(MAX_STEP);
  });

  it('monthly never drives a panel, however it is ticked', () => {
    const finance: UserHabit = { id: 'fin', title: 'Finance', domain: 'finance', cadence: 'monthly', importance: 5, startDate: START };
    const l = logsFor(60, 'fin', () => true);
    expect(panelSteps(l, [finance], addDays(START, 60)).wealth).toBe(START_STEP);
  });

  it('each habit is anchored at its own startDate', () => {
    const late: UserHabit = { ...TRAINING_HABIT, id: 'late', startDate: addDays(START, 10) };
    const l = logsFor(15, 'late', (i) => i >= 10);
    // Two ticked days after its own start, not the log's start.
    expect(panelSteps(l, [late], addDays(START, 12)).body).toBe(MAX_STEP);
  });

  it('a removed habit stops contributing after removedDate but its history still stands', () => {
    const removedAfter5: UserHabit = { ...TRAINING_HABIT, removedDate: addDays(START, 5) };
    const l = logsFor(20, 'train', () => true);
    const atRemoval = panelSteps(l, [removedAfter5], addDays(START, 5)).body;
    const later = panelSteps(l, [removedAfter5], addDays(START, 20)).body;
    // The climb before removal happened; nothing after it can move the panel
    // further because the only habit feeding it has stopped asking anything.
    expect(atRemoval).toBe(MAX_STEP);
    expect(later).toBe(atRemoval);
  });
});

describe('panelSteps — weighting', () => {
  const heavy: UserHabit = { id: 'heavy', title: 'Heavy', domain: 'training', cadence: 'daily', importance: 5, startDate: START };
  const light: UserHabit = { id: 'light', title: 'Light', domain: 'training', cadence: 'daily', importance: 1, startDate: START };

  it('hitting the heavily-weighted habit alone clears the 70% threshold', () => {
    const l = mergeLogs(logsFor(3, 'heavy', () => true), logsFor(3, 'light', () => false));
    // 5 / (5+1) = 0.833 >= 0.7
    expect(panelSteps(l, [heavy, light], addDays(START, 3)).body).toBe(MAX_STEP);
  });

  it('hitting only the lightly-weighted habit fails the threshold', () => {
    const l = mergeLogs(logsFor(3, 'heavy', () => false), logsFor(3, 'light', () => true));
    // 1 / (5+1) = 0.167 < 0.7
    expect(panelSteps(l, [heavy, light], addDays(START, 3)).body).toBe(0);
  });

  it('hitting both clears it easily', () => {
    const l = mergeLogs(logsFor(2, 'heavy', () => true), logsFor(2, 'light', () => true));
    expect(panelSteps(l, [heavy, light], addDays(START, 2)).body).toBe(MAX_STEP);
  });
});
