import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { emptyTicks, getDomain, type DomainKey } from './domains';
import { domainStep, MAX_STEP, START_STEP } from './steps';
import type { DayLog } from './types';

const START = '2026-01-01';
const SLEEP = getDomain('SLEEP');
const RELATIONSHIP = getDomain('RELATIONSHIP'); // period 7
const INCOME = getDomain('INCOME'); // period 30

/** `pattern[i]` decides whether day `i` is a hit. */
function logs(days: number, key: DomainKey, pattern: (i: number) => boolean): DayLog[] {
  return Array.from({ length: days }, (_, i) => {
    const ticks = emptyTicks();
    ticks[key] = pattern(i);
    return { date: addDays(START, i), opened: true, ticks };
  });
}

describe('domainStep — daily domain', () => {
  it('starts at the bottom on day 1', () => {
    expect(domainStep(logs(1, 'SLEEP', () => true), SLEEP, START)).toBe(START_STEP);
  });

  it('reaches the top after five ticked days', () => {
    const l = logs(5, 'SLEEP', () => true);
    expect(domainStep(l, SLEEP, addDays(START, 5))).toBe(MAX_STEP);
  });

  it('climbs one step per completed day', () => {
    const l = logs(5, 'SLEEP', () => true);
    for (let day = 0; day <= 4; day++) {
      expect(domainStep(l, SLEEP, addDays(START, day))).toBe(day);
    }
  });

  it('drops exactly one step on a missed day', () => {
    // 5 hits to the ceiling, then one miss.
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

  it("counts today's tick only under includeCurrentPeriod (§2.7 preview)", () => {
    const l = logs(3, 'SLEEP', () => true);
    const today = addDays(START, 2); // day 3, its period still open
    expect(domainStep(l, SLEEP, today)).toBe(2);
    expect(domainStep(l, SLEEP, today, { includeCurrentPeriod: true })).toBe(3);
  });

  it('never subtracts for a period still in progress', () => {
    const l = logs(3, 'SLEEP', (i) => i < 2); // today not ticked yet
    const today = addDays(START, 2);
    expect(domainStep(l, SLEEP, today, { includeCurrentPeriod: true })).toBe(2);
  });
});

describe('domainStep — cadence domains step on their own period', () => {
  it('a weekly domain gains a step per week with a hit, not per day', () => {
    // One hit in each of 3 weeks, nothing else.
    const l = logs(21, 'RELATIONSHIP', (i) => i % 7 === 0);
    expect(domainStep(l, RELATIONSHIP, addDays(START, 21))).toBe(3);
  });

  it('a weekly domain loses a step only when a whole week passes empty', () => {
    // Weeks 0-2 hit, weeks 3-4 empty.
    const l = logs(35, 'RELATIONSHIP', (i) => i % 7 === 0 && i < 21);
    expect(domainStep(l, RELATIONSHIP, addDays(START, 35))).toBe(1);
  });

  it('a quarterly domain is not punished daily', () => {
    // A single hit on day 1, then 29 quiet days: its first period still counts.
    const l = logs(30, 'INCOME', (i) => i === 0);
    expect(domainStep(l, INCOME, addDays(START, 30))).toBe(1);
  });
});
