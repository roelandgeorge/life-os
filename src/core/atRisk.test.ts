import { describe, expect, it } from 'vitest';
import { RISK_DAYS_LEFT, atRiskItems, weeklyDigest } from './atRisk';
import { addDays } from './dates';
import type { DayLog, UserHabit } from './types';

const START = '2026-01-01';

const RELATIONSHIP: UserHabit = {
  id: 'relationship',
  title: 'Relationship',
  cadence: 'weekly',
  importance: 4,
  startDate: START,
};
const SLEEP: UserHabit = { id: 'sleep', title: 'Sleep', cadence: 'daily', importance: 5, startDate: START };
const FOOD: UserHabit = { id: 'food', title: 'Food', cadence: 'daily', importance: 5, startDate: START };
const SPORT: UserHabit = { id: 'sport', title: 'Sport', cadence: { everyDays: 2 }, importance: 4, startDate: START };
const WEEKLY_TASK: UserHabit = { id: 'w', title: 'Call mum', cadence: 'weekly', importance: 3, startDate: START };
const DAILY_TASK: UserHabit = { id: 'd', title: 'Read', cadence: 'daily', importance: 3, startDate: START };

/** `days` long from START; `hits(i)` lists the habit ids ticked on day i. */
function logs(days: number, hits: (i: number) => string[]): DayLog[] {
  return Array.from({ length: days }, (_, i) => {
    const ticks: Record<string, true> = {};
    for (const id of hits(i)) ticks[id] = true;
    return { date: addDays(START, i), opened: true, ticks };
  });
}

const NOTHING = () => [];

describe('atRiskItems', () => {
  const ALL = [SLEEP, FOOD, SPORT, RELATIONSHIP];

  it('warns about a weekly habit only once its period is nearly out', () => {
    const l = logs(7, NOTHING);
    expect(atRiskItems(l, ALL, addDays(START, 3))).toEqual([]);
    const warned = atRiskItems(l, ALL, addDays(START, 5));
    expect(warned.map((r) => r.id)).toContain('relationship');
    expect(warned.find((r) => r.id === 'relationship')?.daysLeft).toBe(RISK_DAYS_LEFT);
  });

  it('says nothing about a period that has already been satisfied', () => {
    const l = logs(7, (i) => (i === 0 ? ['relationship'] : []));
    const ids = atRiskItems(l, ALL, addDays(START, 6)).map((r) => r.id);
    expect(ids).not.toContain('relationship');
  });

  it('never warns about anything on a short cadence', () => {
    const ids = atRiskItems(logs(7, NOTHING), ALL, addDays(START, 6)).map((r) => r.id);
    expect(ids).not.toContain('sleep');
    expect(ids).not.toContain('food');
    // every-2-days has a legitimate rest day; nagging every other evening would not help.
    expect(ids).not.toContain('sport');
  });

  it('covers weekly custom (domain-less) habits under the same rule', () => {
    const l = logs(7, NOTHING);
    const risks = atRiskItems(l, [WEEKLY_TASK, DAILY_TASK], addDays(START, 6));
    expect(risks).toEqual([{ id: 'w', daysLeft: 1 }]);
  });

  it('drops a weekly habit already done this period', () => {
    const l = logs(7, (i) => (i === 1 ? ['w'] : []));
    expect(atRiskItems(l, [WEEKLY_TASK], addDays(START, 6))).toEqual([]);
  });

  it('ignores a habit not yet active', () => {
    const futureHabit: UserHabit = { ...WEEKLY_TASK, id: 'later', startDate: addDays(START, 100) };
    expect(atRiskItems(logs(7, NOTHING), [futureHabit], addDays(START, 6))).toEqual([]);
  });

  it('ignores a habit removed before today', () => {
    const removed: UserHabit = { ...WEEKLY_TASK, removedDate: addDays(START, 6) };
    expect(atRiskItems(logs(7, NOTHING), [removed], addDays(START, 6))).toEqual([]);
  });

  it('puts the most urgent first', () => {
    const risks = atRiskItems(logs(7, NOTHING), [...ALL, WEEKLY_TASK], addDays(START, 6));
    expect(risks.length).toBeGreaterThan(1);
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i]!.daysLeft).toBeGreaterThanOrEqual(risks[i - 1]!.daysLeft);
    }
  });

  it('is empty with no habits at all', () => {
    expect(atRiskItems([], [], START)).toEqual([]);
  });
});

describe('weeklyDigest', () => {
  it('carries id, anchor, last hit and period length — never a title', () => {
    const l = logs(7, (i) => (i === 2 ? ['relationship', 'w'] : []));
    const entries = weeklyDigest(l, [RELATIONSHIP, WEEKLY_TASK, DAILY_TASK], addDays(START, 6));

    const serialised = JSON.stringify(entries);
    expect(serialised).not.toContain('Relationship');
    expect(serialised).not.toContain('Call mum');
    expect(serialised).not.toContain('Read');

    const rel = entries.find((e) => e.id === 'relationship');
    expect(rel).toEqual({ id: 'relationship', anchor: START, lastHit: addDays(START, 2), periodDays: 7 });
  });

  it('leaves out short-cadence habits entirely', () => {
    const entries = weeklyDigest(logs(3, NOTHING), [SLEEP, DAILY_TASK], addDays(START, 2));
    expect(entries).toEqual([]);
  });

  it('reports null lastHit for something never done', () => {
    const entries = weeklyDigest(logs(3, NOTHING), [RELATIONSHIP], addDays(START, 2));
    expect(entries[0]?.lastHit).toBeNull();
  });

  it('carries each habit’s own startDate as its anchor', () => {
    const laterHabit: UserHabit = { ...WEEKLY_TASK, id: 'later', startDate: addDays(START, 3) };
    const entries = weeklyDigest(logs(10, NOTHING), [laterHabit], addDays(START, 9));
    expect(entries[0]?.anchor).toBe(addDays(START, 3));
  });
});
