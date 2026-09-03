import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { DOMAIN_KEYS, emptyTicks, type DomainKey } from './domains';
import { buildProjection } from './projection';
import { MAX_STEP, START_STEP } from './steps';
import type { AppState, DayLog } from './types';
import { layerSteps } from '../visual/layers';

const START = '2026-01-01';

/** `hits(i)` decides which domains are ticked on day `i`. */
function stateOf(days: number, hits: (i: number) => DomainKey[]): AppState {
  const logs: DayLog[] = Array.from({ length: days }, (_, i) => {
    const ticks = emptyTicks();
    for (const k of hits(i)) ticks[k] = true;
    return { date: addDays(START, i), opened: true, ticks };
  });
  return { logs, notificationTime: null };
}

const ALL = () => [...DOMAIN_KEYS];

describe('buildProjection', () => {
  it('day 1 starts every domain in the middle', () => {
    const p = buildProjection(stateOf(1, ALL), START);
    for (const k of DOMAIN_KEYS) expect(p.steps[k]).toBe(START_STEP);
  });

  it('reaches the ceiling on a daily domain two ticked days in', () => {
    const p = buildProjection(stateOf(5, ALL), addDays(START, 2));
    expect(p.steps.SLEEP).toBe(MAX_STEP);
  });

  it("preview counts today's tick, steps does not (§2.7)", () => {
    // Two missed days first, so the ceiling cannot hide the difference.
    const state = stateOf(3, (i) => (i === 2 ? ['SLEEP'] : []));
    const today = addDays(START, 2);
    const p = buildProjection(state, today);
    expect(p.steps.SLEEP).toBe(0);
    expect(p.preview.SLEEP).toBe(1);
  });

  it('is a Full Day only when every visible daily domain is ticked', () => {
    const today = addDays(START, 1);
    const full = stateOf(2, () => ['SLEEP', 'FOOD']);
    expect(buildProjection(full, today).fullDay).toBe(true);

    const partial = stateOf(2, () => ['SLEEP']);
    expect(buildProjection(partial, today).fullDay).toBe(false);
  });

  it('does not require training for a Full Day — a rest day is correct', () => {
    // SPORT is every other day, so demanding it daily would make a Full Day
    // unreachable on exactly the days the plan calls for rest.
    const today = addDays(START, 1);
    const state = stateOf(2, () => ['SLEEP', 'FOOD']); // no SPORT, no ORDER
    expect(buildProjection(state, today).fullDay).toBe(true);
  });

  it('feeds the layers, which take the lowest step among their domains', () => {
    // SLEEP ticked daily, SPORT and FOOD never: `user` sinks however good the
    // sleep is, while RELATIONSHIP drives `lief` on its own.
    const state = stateOf(5, (i) => (i % 7 === 0 ? ['SLEEP', 'RELATIONSHIP'] : ['SLEEP']));
    const p = buildProjection(state, addDays(START, 5));
    const layers = layerSteps(p.preview);
    expect(p.preview.SLEEP).toBe(MAX_STEP);
    expect(p.preview.SPORT).toBe(0);
    expect(layers.user).toBe(0); // the weakest of the three wins
    expect(layers.lief).toBeGreaterThan(0);
  });
});
