/**
 * §8 test vectors. These are the acceptance criteria for the engine; §9 says
 * no UI gets written until they pass.
 *
 * Vector 4 (effectiveMuscle) is a §4.3 visual formula, not a scoring formula.
 * It lives in src/visual/params.test.ts.
 */

import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { DOMAINS, DOMAIN_KEYS, getDomain, targetRate, uniformScores } from './domains';
import { AT_TARGET, buildLogs } from './fixtures';
import {
  adherence,
  advance,
  computeBody,
  daysOfHistory,
  indexLogs,
  isWarmup,
  previewScores,
  replay,
  scoreHistory,
  scoresAsOf,
  type ScoreHistoryPoint,
} from './scoring';
import type { AppState, DayLog, Profile } from './types';

const START = '2026-01-01';

function scoreList(scores: Record<string, number>): number[] {
  return DOMAIN_KEYS.map((k) => scores[k] as number);
}

/** Adherence for one domain on the last day of a log. */
function adherenceOnLastDay(logs: DayLog[], key: Parameters<typeof getDomain>[0], onDate: string) {
  return adherence(indexLogs(logs), getDomain(key), onDate, (logs[0] as DayLog).date);
}

const PROFILE: Profile = {
  currentAge: 35,
  bodyFrame: 'average',
  height: 'average',
  skinTone: 2,
  hairColor: 2,
  hairType: 'straight',
  hairLength: 'short',
  hairline: 'full',
  facialHair: 'none',
  eyeColor: 2,
  glasses: false,
  faceShape: 'oval',
  presentation: 'masculine',
};

function stateOf(logs: DayLog[]): AppState {
  return {
    profile: PROFILE,
    domains: DOMAIN_KEYS.map((key) => ({ key, score: 50 })),
    logs,
    lastEvaluatedDate: addDays((logs[0] as DayLog).date, -1),
  };
}

// ---------------------------------------------------------------------------

describe('§8 test vectors', () => {
  it('1 — 60 consecutive days at target: every score >= 94', () => {
    const logs = buildLogs({ start: START, days: 60, pattern: AT_TARGET });
    const scores = scoresAsOf(logs, addDays(START, 60));

    for (const d of DOMAINS) {
      expect(scores[d.key], `${d.key} = ${scores[d.key].toFixed(2)}`).toBeGreaterThanOrEqual(94);
    }
  });

  it('2 — from 100, 74 days of zero ticks with the app opened daily: every score <= 6', () => {
    const logs = buildLogs({ start: START, days: 74 }); // opened every day, nothing ticked
    const scores = replay(logs, addDays(START, 73), { initial: uniformScores(100) });

    for (const d of DOMAINS) {
      expect(scores[d.key], `${d.key} = ${scores[d.key].toFixed(2)}`).toBeLessThanOrEqual(6);
    }
    // The stated time constant: 100 -> ~5 in 74 days.
    expect(scores.SLEEP).toBeCloseTo(4.88, 2);
  });

  it('3 — BODY with SLEEP=90 FOOD=90 SPORT=20 is 34.0', () => {
    const scores = { ...uniformScores(0), SLEEP: 90, FOOD: 90, SPORT: 20 };
    expect(computeBody(scores)).toBeCloseTo(34.0, 10);
  });

  it('5 — two unopened days are excluded and cause no score drop', () => {
    // 20 clean days, then days 21-22 never opened, then day 23 reopened.
    const logs = buildLogs({
      start: START,
      days: 23,
      pattern: AT_TARGET,
      absent: (i) => i === 20 || i === 21,
    });

    const a = adherenceOnLastDay(logs, 'SLEEP', addDays(START, 22));
    expect(a.unlogged).toBe(2);
    expect(a.excluded).toBe(2);
    expect(a.effectiveW).toBe(12); // W=14 minus 2 amnestied
    expect(a.A).toBe(1);

    // No drop anywhere across the gap: the score is monotonic through it.
    const before = replay(logs, addDays(START, 19)).SLEEP;
    const after = replay(logs, addDays(START, 22)).SLEEP;
    expect(after).toBeGreaterThan(before);
  });

  it('6 — five unopened days: 2 excluded, 3 counted as misses', () => {
    const logs = buildLogs({
      start: START,
      days: 25,
      pattern: AT_TARGET,
      absent: (i) => i >= 20, // days 21-25 never opened
    });

    const a = adherenceOnLastDay(logs, 'SLEEP', addDays(START, 24));
    expect(a.unlogged).toBe(5);
    expect(a.excluded).toBe(2);
    expect(a.effectiveW).toBe(12);
    // 9 of the 14 window days were logged-and-ticked; 12 are counted.
    expect(a.hits).toBe(9);
    expect(a.A).toBeCloseTo(0.75, 10);
  });

  it('7 — SPORT at 4x per week over a full window: A = 1.0', () => {
    // "4x in the last 7 days, window full" can only mean the cadence is
    // sustained across all 21 days: 4 hits in a full 21-day window would be
    // A = 0.33, not 1.0.
    const logs = buildLogs({ start: START, days: 21, pattern: AT_TARGET });
    const a = adherenceOnLastDay(logs, 'SPORT', addDays(START, 20));

    expect(a.windowLength).toBe(21);
    expect(a.hits).toBe(12);
    expect(a.A).toBe(1);
  });

  it('8 — INCOME ticked 3x in the last 90 days: A = 1.0', () => {
    const logs = buildLogs({ start: START, days: 90, pattern: AT_TARGET });
    const a = adherenceOnLastDay(logs, 'INCOME', addDays(START, 89));

    expect(a.windowLength).toBe(90);
    expect(a.hits).toBe(3);
    expect(a.A).toBe(1);
  });

  it('9 — day 1 with no history: all scores 50, warmup true', () => {
    const logs = buildLogs({ start: START, days: 1, pattern: AT_TARGET });

    expect(scoreList(scoresAsOf(logs, START))).toEqual(DOMAIN_KEYS.map(() => 50));
    expect(isWarmup(logs, START)).toBe(true);
    expect(daysOfHistory(logs, START)).toBe(1);

    // And with a genuinely empty log.
    expect(scoreList(scoresAsOf([], START))).toEqual(DOMAIN_KEYS.map(() => 50));
    expect(isWarmup([], START)).toBe(true);
  });

  it('10 — two app opens in one day produce exactly one EWMA update', () => {
    const logs = buildLogs({ start: START, days: 10, pattern: AT_TARGET });
    const today = addDays(START, 10);

    const first = advance(stateOf(logs), today);
    const second = advance(first.state, today);

    expect(first.rolledOver).toBe(true);
    expect(second.rolledOver).toBe(false);
    expect(second.state.domains).toEqual(first.state.domains);
    expect(second.state.lastEvaluatedDate).toBe(addDays(today, -1));
  });
});

// ---------------------------------------------------------------------------

describe('target rates', () => {
  it('match the §1 decimal table to the precision the table gives', () => {
    const expected: Record<string, number> = {
      SLEEP: 1.0,
      FOOD: 1.0,
      SPORT: 0.571,
      ORDER: 0.857,
      RELATIONSHIP: 0.143,
      MIND: 0.143,
      INCOME: 0.033,
    };
    for (const d of DOMAINS) expect(targetRate(d), d.key).toBeCloseTo(expected[d.key] as number, 3);
  });

  it('yield exactly 1.0 at exact cadence, not merely something that rounds to it', () => {
    // Integer arithmetic in `adherence` is the point: `hits / (0.033 * 90)` is
    // 0.9999999999999999, and a score that asymptotes to 99.99 is a bug the
    // user would eventually notice and could not explain.
    const logs = buildLogs({ start: START, days: 90, pattern: AT_TARGET });
    const index = indexLogs(logs);
    const lastDay = addDays(START, 89);

    for (const d of DOMAINS) {
      const a = adherence(index, d, lastDay, START);
      expect(a.A, `${d.key} A=${a.A}`).toBe(1);
    }
  });
});

describe('warmup boundary (§2.4)', () => {
  it('leaves warmup on the 14th day of history', () => {
    const logs = buildLogs({ start: START, days: 20, pattern: AT_TARGET });
    expect(isWarmup(logs, addDays(START, 12))).toBe(true); // 13 days
    expect(isWarmup(logs, addDays(START, 13))).toBe(false); // 14 days
  });
});

describe('asymmetry (§2.3)', () => {
  it('recovers faster than it decays', () => {
    const up = buildLogs({ start: START, days: 30, pattern: AT_TARGET });
    const down = buildLogs({ start: START, days: 30 });

    const gained = replay(up, addDays(START, 29), { initial: uniformScores(50) }).SLEEP - 50;
    const lost = 50 - replay(down, addDays(START, 29), { initial: uniformScores(50) }).SLEEP;

    expect(gained).toBeGreaterThan(lost);
  });
});

describe('the window is clamped to the start of history', () => {
  it('does not treat pre-install days as misses', () => {
    // Day 3 of a perfect history. Without clamping this would be 3/14 = 0.21.
    const logs = buildLogs({ start: START, days: 3, pattern: AT_TARGET });
    const a = adherenceOnLastDay(logs, 'SLEEP', addDays(START, 2));

    expect(a.windowLength).toBe(3);
    expect(a.A).toBe(1);
  });
});

describe('§2.7 preview', () => {
  it("moves the score the moment today's box is ticked", () => {
    const history = buildLogs({ start: START, days: 14, pattern: AT_TARGET });
    const today = addDays(START, 14);

    const untickedToday: DayLog[] = [
      ...history,
      { date: today, opened: true, ticks: { ...(history[0] as DayLog).ticks, SLEEP: false } },
    ];
    const tickedToday: DayLog[] = [
      ...history,
      { date: today, opened: true, ticks: { ...(history[0] as DayLog).ticks, SLEEP: true } },
    ];

    const base = scoresAsOf(history, today).SLEEP;
    const withoutTick = previewScores(untickedToday, today).SLEEP;
    const withTick = previewScores(tickedToday, today).SLEEP;

    // The causal link §2.7 exists to protect: the tick itself moves the figure.
    expect(withTick).toBeGreaterThan(withoutTick);
    expect(withTick).toBeGreaterThan(base);
  });

  it('still previews upward on a miss while the score is below its own trend', () => {
    // 14 perfect days leaves SLEEP at ~76 while the window reads 13/14 = 93.
    // A single miss today cannot reverse a two-week trend, and must not appear
    // to: the score is chasing the window, not the day.
    const history = buildLogs({ start: START, days: 14, pattern: AT_TARGET });
    const today = addDays(START, 14);
    const missToday: DayLog[] = [
      ...history,
      { date: today, opened: true, ticks: { ...(history[0] as DayLog).ticks, SLEEP: false } },
    ];

    expect(previewScores(missToday, today).SLEEP).toBeGreaterThan(scoresAsOf(history, today).SLEEP);
  });

  it('previews downward on a miss once the score has caught up to the trend', () => {
    const history = buildLogs({ start: START, days: 90, pattern: AT_TARGET });
    const today = addDays(START, 90);
    const missToday: DayLog[] = [
      ...history,
      { date: today, opened: true, ticks: { ...(history[0] as DayLog).ticks, SLEEP: false } },
    ];

    const base = scoresAsOf(history, today).SLEEP;
    expect(base).toBeGreaterThan(94);
    expect(previewScores(missToday, today).SLEEP).toBeLessThan(base);
  });

  it('is display-only: it never changes what advance persists', () => {
    const logs = buildLogs({ start: START, days: 14, pattern: AT_TARGET });
    const today = addDays(START, 14);

    previewScores(logs, today);
    expect(advance(stateOf(logs), today).state.domains.map((d) => d.score)).toEqual(
      scoreList(scoresAsOf(logs, today)),
    );
  });
});

describe('retroactive edits (§5.2)', () => {
  it('are absorbed because scores are recomputed from the log', () => {
    const logs = buildLogs({ start: START, days: 20, pattern: AT_TARGET });
    const today = addDays(START, 20);
    const before = scoresAsOf(logs, today).SLEEP;

    const edited = logs.map((l, i) =>
      i === 17 ? { ...l, ticks: { ...l.ticks, SLEEP: false } } : l,
    );
    expect(scoresAsOf(edited, today).SLEEP).toBeLessThan(before);
  });
});

describe('scoreHistory (§6 sparklines)', () => {
  it('is `days` long and pads the front with the cold-start value when history starts late', () => {
    const logs = buildLogs({ start: START, days: 5, pattern: AT_TARGET });
    const today = addDays(START, 4);
    const series = scoreHistory(logs, today, 90);

    expect(series).toHaveLength(90);
    expect(series[0]?.scores).toEqual(uniformScores(50));
    expect(series[0]?.date).toBe(addDays(today, -89));
  });

  it('is the empty-history cold-start line when there is no history at all', () => {
    const series = scoreHistory([], START, 30);
    expect(series).toHaveLength(30);
    for (const point of series) expect(point.scores).toEqual(uniformScores(50));
  });

  it('agrees with scoresAsOf on the day after its last point', () => {
    const logs = buildLogs({ start: START, days: 40, pattern: AT_TARGET });
    const today = addDays(START, 39);
    const series = scoreHistory(logs, today, 90);
    const last = series[series.length - 1] as ScoreHistoryPoint;
    expect(last.date).toBe(today);
    expect(last.scores).toEqual(scoresAsOf(logs, addDays(today, 1)));
  });
});
