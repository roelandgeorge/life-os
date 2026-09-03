import { describe, expect, it } from 'vitest';
import { RISK_DAYS_LEFT, atRiskItems, weeklyDigest } from './atRisk';
import { addDays } from './dates';
import { VISIBLE_DOMAINS, emptyTicks, getDomain, type DomainKey } from './domains';
import type { CustomTask, DayLog } from './types';

const START = '2026-01-01';
const WEEKLY_TASK: CustomTask = { id: 'w', name: 'Call mum', cadence: 'weekly' };
const DAILY_TASK: CustomTask = { id: 'd', name: 'Read', cadence: 'daily' };

/** `days` long from START, with the listed domains/tasks ticked on given offsets. */
function logs(days: number, hits: (i: number) => { domains?: DomainKey[]; custom?: string[] }): DayLog[] {
  return Array.from({ length: days }, (_, i) => {
    const { domains = [], custom = [] } = hits(i);
    const ticks = emptyTicks();
    for (const k of domains) ticks[k] = true;
    const customTicks: Record<string, boolean> = {};
    for (const id of custom) customTicks[id] = true;
    return { date: addDays(START, i), opened: true, ticks, customTicks };
  });
}

const NOTHING = () => ({});

describe('atRiskItems', () => {
  it('warns about a weekly domain only once its week is nearly out', () => {
    const l = logs(7, NOTHING);
    // Day 4 of 7: three days still left, no warning yet.
    expect(atRiskItems(l, VISIBLE_DOMAINS, [], addDays(START, 3))).toEqual([]);
    // Day 6: two left — the warning window opens.
    const warned = atRiskItems(l, VISIBLE_DOMAINS, [], addDays(START, 5));
    expect(warned.map((r) => r.id)).toContain('RELATIONSHIP');
    expect(warned.find((r) => r.id === 'RELATIONSHIP')?.daysLeft).toBe(RISK_DAYS_LEFT);
  });

  it('says nothing about a week that has already been satisfied', () => {
    const l = logs(7, (i) => (i === 0 ? { domains: ['RELATIONSHIP'] } : {}));
    const ids = atRiskItems(l, VISIBLE_DOMAINS, [], addDays(START, 6)).map((r) => r.id);
    expect(ids).not.toContain('RELATIONSHIP');
  });

  it('never warns about a daily domain — missing one is its own feedback', () => {
    const ids = atRiskItems(logs(7, NOTHING), VISIBLE_DOMAINS, [], addDays(START, 6)).map((r) => r.id);
    expect(ids).not.toContain('SLEEP');
    expect(ids).not.toContain('FOOD');
    // SPORT's cadence spans two days, but it is still a daily domain: warning
    // every other evening would be noise.
    expect(ids).not.toContain('SPORT');
  });

  it('covers weekly custom tasks on the same rule', () => {
    const l = logs(7, NOTHING);
    const risks = atRiskItems(l, [], [WEEKLY_TASK, DAILY_TASK], addDays(START, 6));
    expect(risks).toEqual([{ kind: 'custom', id: 'w', daysLeft: 1 }]);
  });

  it('drops a weekly custom task that was already done this week', () => {
    const l = logs(7, (i) => (i === 1 ? { custom: ['w'] } : {}));
    expect(atRiskItems(l, [], [WEEKLY_TASK], addDays(START, 6))).toEqual([]);
  });

  it('puts the most urgent first', () => {
    const risks = atRiskItems(logs(7, NOTHING), VISIBLE_DOMAINS, [WEEKLY_TASK], addDays(START, 6));
    expect(risks.length).toBeGreaterThan(1);
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i]!.daysLeft).toBeGreaterThanOrEqual(risks[i - 1]!.daysLeft);
    }
  });

  it('is empty with no history at all', () => {
    expect(atRiskItems([], VISIBLE_DOMAINS, [WEEKLY_TASK], START)).toEqual([]);
  });
});

describe('weeklyDigest', () => {
  it('carries only ids, dates and period lengths — never a task name', () => {
    const l = logs(7, (i) => (i === 2 ? { domains: ['RELATIONSHIP'], custom: ['w'] } : {}));
    const digest = weeklyDigest(l, VISIBLE_DOMAINS, [WEEKLY_TASK, DAILY_TASK], START);

    const serialised = JSON.stringify(digest);
    expect(serialised).not.toContain('Call mum');
    expect(serialised).not.toContain('Read');

    const rel = digest.entries.find((e) => e.id === 'RELATIONSHIP');
    expect(rel).toEqual({ id: 'RELATIONSHIP', lastHit: addDays(START, 2), periodDays: 7 });
  });

  it('leaves out daily things entirely — they need no warning', () => {
    const digest = weeklyDigest(logs(3, NOTHING), VISIBLE_DOMAINS, [DAILY_TASK], START);
    const ids = digest.entries.map((e) => e.id);
    expect(ids).not.toContain('SLEEP');
    expect(ids).not.toContain('d');
  });

  it('reports null for something never done', () => {
    const digest = weeklyDigest(logs(3, NOTHING), [getDomain('RELATIONSHIP')], [], START);
    expect(digest.entries[0]?.lastHit).toBeNull();
  });
});
