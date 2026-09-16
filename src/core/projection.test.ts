import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { PANEL_KEYS } from './domains';
import { buildProjection } from './projection';
import { MAX_STEP, START_STEP } from './steps';
import type { AppState, DayLog, UserHabit } from './types';

const START = '2026-01-01';

const SLEEP: UserHabit = { id: 'sleep', title: 'Sleep', domain: 'sleep', cadence: 'daily', importance: 5, startDate: START };
const TRAINING: UserHabit = { id: 'training', title: 'Train', domain: 'training', cadence: 'daily', importance: 5, startDate: START };

function stateWith(habits: UserHabit[], days: number, hits: (i: number) => string[]): AppState {
  const logs: DayLog[] = Array.from({ length: days }, (_, i) => {
    const ticks: Record<string, true> = {};
    for (const id of hits(i)) ticks[id] = true;
    return { date: addDays(START, i), opened: true, ticks };
  });
  return { schemaVersion: 2, logs, habits, notificationTime: null };
}

describe('buildProjection', () => {
  it('day 1 starts every panel in the middle', () => {
    const state = stateWith([SLEEP], 1, () => ['sleep']);
    const p = buildProjection(state, START);
    for (const panel of PANEL_KEYS) expect(p.steps[panel]).toBe(START_STEP);
  });

  it('reaches the ceiling on a daily habit two ticked days in', () => {
    const state = stateWith([SLEEP], 5, () => ['sleep']);
    expect(buildProjection(state, addDays(START, 2)).steps.body).toBe(MAX_STEP);
  });

  it("preview counts today's tick, steps does not (§2.7)", () => {
    const state = stateWith([SLEEP], 3, (i) => (i === 2 ? ['sleep'] : []));
    const today = addDays(START, 2);
    const p = buildProjection(state, today);
    expect(p.steps.body).toBe(0);
    expect(p.preview.body).toBe(1);
  });

  it('is a Full Day only when every active daily domain habit is ticked', () => {
    const today = addDays(START, 1);
    const full = stateWith([SLEEP, TRAINING], 2, () => ['sleep', 'training']);
    expect(buildProjection(full, today).fullDay).toBe(true);

    const partial = stateWith([SLEEP, TRAINING], 2, () => ['sleep']);
    expect(buildProjection(partial, today).fullDay).toBe(false);
  });

  it('a rest day (every-2-days habit) does not block a Full Day', () => {
    const sport: UserHabit = { id: 'sport', title: 'Sport', domain: 'training', cadence: { everyDays: 2 }, importance: 4, startDate: START };
    const today = addDays(START, 1);
    // SPORT is not daily, so it plays no part in Full Day at all.
    const state = stateWith([SLEEP, sport], 2, () => ['sleep']);
    expect(buildProjection(state, today).fullDay).toBe(true);
  });

  it('feeds the panels: a neglected habit sinks the panel it shares with a perfect one', () => {
    // SLEEP (domain sleep, feeds body+head) ticked daily; nutrition (also
    // body+head) never ticked — body and head both sink to the neglected one.
    const nutrition: UserHabit = { id: 'nutrition', title: 'Eat well', domain: 'nutrition', cadence: 'daily', importance: 5, startDate: START };
    const state = stateWith([SLEEP, nutrition], 5, () => ['sleep']);
    const p = buildProjection(state, addDays(START, 5));
    expect(p.preview.body).toBe(0);
    expect(p.preview.head).toBe(0);
  });

  it('an empty habit list leaves every panel at the middle', () => {
    const state = stateWith([], 10, () => []);
    const p = buildProjection(state, addDays(START, 10));
    for (const panel of PANEL_KEYS) expect(p.steps[panel]).toBe(START_STEP);
  });
});
