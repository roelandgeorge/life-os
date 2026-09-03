import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { emptyTicks, getDomain, type DomainKey } from './domains';
import { domainStep, MAX_STEP, START_STEP } from './steps';
import type { DayLog } from './types';

const START = '2026-01-01';
const SLEEP = getDomain('SLEEP');
const RELATIONSHIP = getDomain('RELATIONSHIP'); // period 7
const INCOME = getDomain('INCOME'); // period 7

/** `pattern[i]` decides whether day `i` is a hit. */
function logs(days: number, key: DomainKey, pattern: (i: number) => boolean): DayLog[] {
  return Array.from({ length: days }, (_, i) => {
    const ticks = emptyTicks();
    ticks[key] = pattern(i);
    return { date: addDays(START, i), opened: true, ticks };
  });
}

describe('domainStep — daily domain', () => {
  it('starts in the middle on day 1', () => {
    expect(domainStep(logs(1, 'SLEEP', () => true), SLEEP, START)).toBe(START_STEP);
    expect(START_STEP).toBe(2); // level 3 of 5
  });

  it('reaches the top two ticked days after the start', () => {
    const l = logs(5, 'SLEEP', () => true);
    expect(domainStep(l, SLEEP, addDays(START, 2))).toBe(MAX_STEP);
  });

  it('climbs one step per completed day', () => {
    const l = logs(5, 'SLEEP', () => true);
    for (let day = 0; day <= 2; day++) {
      expect(domainStep(l, SLEEP, addDays(START, day))).toBe(START_STEP + day);
    }
  });

  it('drops exactly one step on a missed day', () => {
    // Up to the ceiling, then one miss.
    const l = logs(6, 'SLEEP', (i) => i < 5);
    expect(domainStep(l, SLEEP, addDays(START, 6))).toBe(MAX_STEP - 1);
  });

  it('clamps at the ceiling however long the streak runs', () => {
    const l = logs(30, 'SLEEP', () => true);
    expect(domainStep(l, SLEEP, addDays(START, 30))).toBe(MAX_STEP);
  });

  it('clamps at the floor rather than going negative', () => {
    const l = logs(20, 'SLEEP', () => false);
    expect(domainStep(l, SLEEP, addDays(START, 20))).toBe(0);
  });

  it('counts a day the app was never opened as a day with nothing ticked', () => {
    // Day 0 logged and ticked; days 1 and 2 have no log entry at all, as if
    // the app was not opened. Both must still cost a step.
    const only = [logs(1, 'SLEEP', () => true)[0] as DayLog];
    expect(domainStep(only, SLEEP, addDays(START, 3))).toBe(START_STEP + 1 - 2);
  });

  it("counts today's tick only under includeCurrentPeriod (§2.7 preview)", () => {
    // Two missed days take it to the floor, then today is ticked. Starting
    // low keeps the ceiling from hiding the difference.
    const l = logs(3, 'SLEEP', (i) => i === 2);
    const today = addDays(START, 2); // day 3, its period still open
    expect(domainStep(l, SLEEP, today)).toBe(0);
    expect(domainStep(l, SLEEP, today, { includeCurrentPeriod: true })).toBe(1);
  });

  it('never subtracts for a period still in progress', () => {
    // Day 1 hit (+1), day 2 missed (-1), today untouched so far.
    const l = logs(3, 'SLEEP', (i) => i === 0);
    const today = addDays(START, 2);
    expect(domainStep(l, SLEEP, today)).toBe(START_STEP);
    expect(domainStep(l, SLEEP, today, { includeCurrentPeriod: true })).toBe(START_STEP);
  });
});

describe('domainStep — cadence domains step on their own period', () => {
  it('a weekly domain gains a step per week with a hit, not per day', () => {
    // One hit in each of 2 weeks takes it from the middle to the ceiling.
    const l = logs(21, 'RELATIONSHIP', (i) => i % 7 === 0);
    expect(domainStep(l, RELATIONSHIP, addDays(START, 14))).toBe(MAX_STEP);
  });

  it('a weekly domain loses a step only when a whole week passes empty', () => {
    // Weeks 0-2 hit (capped at the ceiling), weeks 3-4 empty.
    const l = logs(35, 'RELATIONSHIP', (i) => i % 7 === 0 && i < 21);
    expect(domainStep(l, RELATIONSHIP, addDays(START, 35))).toBe(MAX_STEP - 2);
  });

  it('income now moves weekly too: one tick a week is enough to climb', () => {
    const l = logs(21, 'INCOME', (i) => i % 7 === 0);
    expect(domainStep(l, INCOME, addDays(START, 21))).toBe(MAX_STEP);
  });

  it('income loses a step only when a whole week passes without a tick', () => {
    const l = logs(14, 'INCOME', (i) => i === 0);
    // Week 0 hit (+1), week 1 empty (-1): back where it started.
    expect(domainStep(l, INCOME, addDays(START, 14))).toBe(START_STEP);
  });
});
