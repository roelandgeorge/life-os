/**
 * The scoring engine (§2). Pure: no DOM, no clock, no storage.
 * Every function takes the state it needs and returns new values.
 *
 * ---------------------------------------------------------------------------
 * Two decisions the spec leaves open, resolved here. Both are load-bearing.
 *
 * 1. THE WINDOW IS CLAMPED TO THE START OF HISTORY.
 *    §2.2 says `effectiveW = W - excluded`. Taken literally, a user on day 1
 *    has a 14-day SLEEP window containing 13 days that predate the install,
 *    scores A = 1/14, and watches the avatar collapse during the exact period
 *    §2.4 asks us to treat gently. So the window is [max(startDate, t-W+1), t]
 *    and `effectiveW = windowLength - excluded`. Days before the app existed
 *    are not misses; they are not days.
 *
 * 2. SCORES ARE RECOMPUTED FROM THE LOG, NOT ACCUMULATED.
 *    §5.2 allows retroactive edits 3 days back. An incrementally accumulated
 *    EWMA cannot absorb an edit to a day it already folded in. So the whole
 *    chain is replayed from the first log entry on every evaluation. This makes
 *    the score a pure function of the log, which is what makes §8/10 ("two app
 *    opens in one day → exactly one update") true by construction rather than
 *    by bookkeeping discipline. `lastEvaluatedDate` is still persisted, but it
 *    reports whether a rollover happened; it is not the source of truth.
 *    Cost is ~250k arithmetic ops at the 400-day cap. Not worth optimising.
 * ---------------------------------------------------------------------------
 */

import { addDays, diffDays, maxDate, minDate, rangeDates, type DateKey } from './dates';
import {
  BODY_DOMAIN_KEYS,
  DAILY_DOMAIN_KEYS,
  DOMAINS,
  DOMAIN_KEYS,
  uniformScores,
  type DomainConfig,
  type DomainKey,
  type DomainScores,
} from './domains';
import { clamp01, mean } from './math';
import type { AppState, DayLog } from './types';

export const AMNESTY = 2;
export const ALPHA_UP = 0.05;
export const ALPHA_DOWN = 0.04;
export const INITIAL_SCORE = 50;
export const WARMUP_DAYS = 14;
export const MAX_LOG_DAYS = 400;

// ---------------------------------------------------------------------------
// Stage 1 — rolling adherence (§2.2)
// ---------------------------------------------------------------------------

export type LogIndex = ReadonlyMap<DateKey, DayLog>;

export function indexLogs(logs: readonly DayLog[]): LogIndex {
  return new Map(logs.map((l) => [l.date, l]));
}

export type Adherence = {
  /**
   * `null` means "no evidence": every day in the window was amnestied, so
   * there is nothing to judge and the score holds. Only reachable in the first
   * days of history, where windowLength is smaller than AMNESTY.
   */
  A: number | null;
  hits: number;
  unlogged: number;
  excluded: number;
  effectiveW: number;
  windowLength: number;
};

export function adherence(
  index: LogIndex,
  domain: DomainConfig,
  onDate: DateKey,
  startDate: DateKey,
): Adherence {
  const windowStart = maxDate(startDate, addDays(onDate, -(domain.W - 1)));
  const windowLength = diffDays(onDate, windowStart) + 1;

  let hits = 0;
  let unlogged = 0;
  for (const day of rangeDates(windowStart, onDate)) {
    const log = index.get(day);
    // Absent from the log and "present but never opened" are the same thing:
    // no app interaction at all, so eligible for amnesty (§2.2).
    if (!log || !log.opened) unlogged++;
    if (log?.ticks[domain.key]) hits++;
  }

  const excluded = Math.min(unlogged, AMNESTY);
  const effectiveW = windowLength - excluded;

  if (effectiveW <= 0) return { A: null, hits, unlogged, excluded, effectiveW, windowLength };

  // A = hits / (r · effectiveW) with r = n/per, rearranged so both sides of the
  // division are exact integers. Exact cadence then yields exactly 1.0.
  return {
    A: clamp01((hits * domain.r.per) / (domain.r.n * effectiveW)),
    hits,
    unlogged,
    excluded,
    effectiveW,
    windowLength,
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — asymmetric EWMA (§2.3)
// ---------------------------------------------------------------------------

/** One day's update. Recovery (ALPHA_UP) is deliberately faster than decay. */
export function stepScore(current: number, A: number | null): number {
  if (A === null) return current;
  const target = A * 100;
  const alpha = target > current ? ALPHA_UP : ALPHA_DOWN;
  return current + alpha * (target - current);
}

// ---------------------------------------------------------------------------
// Replay
// ---------------------------------------------------------------------------

export function startDateOf(logs: readonly DayLog[]): DateKey | null {
  return logs.length > 0 ? (logs[0] as DayLog).date : null;
}

export type ReplayOptions = {
  /** Reuse a prebuilt index when replaying twice over the same logs. */
  index?: LogIndex;
  /**
   * Starting scores. Defaults to 50 across the board (§2.4 cold start).
   * Overridable for imports and for test vectors that begin mid-history.
   */
  initial?: DomainScores;
};

/**
 * Replay the EWMA chain over [startDate, throughDate] inclusive.
 * Callers pass yesterday as `throughDate`: today is not final until it rolls.
 */
export function replay(
  logs: readonly DayLog[],
  throughDate: DateKey,
  options: ReplayOptions = {},
): DomainScores {
  const index = options.index ?? indexLogs(logs);
  const scores = { ...(options.initial ?? uniformScores(INITIAL_SCORE)) };
  const startDate = startDateOf(logs);
  if (startDate === null || diffDays(throughDate, startDate) < 0) return scores;

  for (const day of rangeDates(startDate, throughDate)) {
    for (const domain of DOMAINS) {
      scores[domain.key] = stepScore(
        scores[domain.key],
        adherence(index, domain, day, startDate).A,
      );
    }
  }
  return scores;
}

/**
 * The persisted scores as of `today`: every completed day folded in, today's
 * ticks not yet. This is what `AppState.domains` holds after `advance`.
 */
export function scoresAsOf(logs: readonly DayLog[], today: DateKey): DomainScores {
  return replay(logs, addDays(today, -1));
}

/**
 * §2.7 — the score each domain would hold if today's ticks were rolled forward.
 * Display-only, never persisted. This is what the avatar renders, so that
 * ticking a box moves the figure within the same second.
 */
export function previewScores(logs: readonly DayLog[], today: DateKey): DomainScores {
  const index = indexLogs(logs);
  const base = replay(logs, addDays(today, -1), { index });
  const startDate = startDateOf(logs);
  if (startDate === null) return base;

  const preview = { ...base };
  for (const domain of DOMAINS) {
    preview[domain.key] = stepScore(base[domain.key], adherence(index, domain, today, startDate).A);
  }
  return preview;
}

// ---------------------------------------------------------------------------
// History (§6 screen 2)
// ---------------------------------------------------------------------------

export type ScoreHistoryPoint = { date: DateKey; scores: DomainScores };

/**
 * The daily score series for the History screen's sparklines. One pass over
 * the EWMA chain, keeping every intermediate value instead of only the last —
 * cheaper than calling `replay` once per day, and it can't disagree with
 * `replay` since it's the same loop. Days before any history exists are
 * padded with the §2.4 cold-start value so every sparkline is `days` long.
 */
export function scoreHistory(logs: readonly DayLog[], today: DateKey, days: number): ScoreHistoryPoint[] {
  const from = addDays(today, -(days - 1));
  const startDate = startDateOf(logs);
  const out: ScoreHistoryPoint[] = [];

  if (startDate === null) {
    for (const day of rangeDates(from, today)) out.push({ date: day, scores: uniformScores(INITIAL_SCORE) });
    return out;
  }

  for (const day of rangeDates(from, minDate(addDays(startDate, -1), today))) {
    out.push({ date: day, scores: uniformScores(INITIAL_SCORE) });
  }

  const index = indexLogs(logs);
  const scores = uniformScores(INITIAL_SCORE);
  for (const day of rangeDates(startDate, today)) {
    for (const domain of DOMAINS) {
      scores[domain.key] = stepScore(scores[domain.key], adherence(index, domain, day, startDate).A);
    }
    if (diffDays(day, from) >= 0) out.push({ date: day, scores: { ...scores } });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Composites (§2.5, §2.6)
// ---------------------------------------------------------------------------

/** BODY on the same 0..100 scale as its inputs. The weakest of three dominates. */
export function computeBody(scores: DomainScores): number {
  const parts = BODY_DOMAIN_KEYS.map((k) => scores[k]);
  return 0.7 * Math.min(...parts) + 0.3 * mean(parts);
}

export function isFullDay(log: DayLog | undefined): boolean {
  if (!log) return false;
  return DAILY_DOMAIN_KEYS.every((k) => log.ticks[k]);
}

/** §4.7 — a density view over the last `days` days, not a streak. */
export function fullDayStrip(logs: readonly DayLog[], today: DateKey, days = 30): boolean[] {
  const index = indexLogs(logs);
  return rangeDates(addDays(today, -(days - 1)), today).map((d) => isFullDay(index.get(d)));
}

// ---------------------------------------------------------------------------
// Warmup (§2.4)
// ---------------------------------------------------------------------------

export function daysOfHistory(logs: readonly DayLog[], today: DateKey): number {
  const startDate = startDateOf(logs);
  if (startDate === null) return 0;
  return Math.max(0, diffDays(today, startDate) + 1);
}

export function isWarmup(logs: readonly DayLog[], today: DateKey): boolean {
  return daysOfHistory(logs, today) < WARMUP_DAYS;
}

// ---------------------------------------------------------------------------
// State transition
// ---------------------------------------------------------------------------

export type AdvanceResult = {
  state: AppState;
  /** True when at least one day rolled over during this call. Drives animation. */
  rolledOver: boolean;
};

/**
 * Bring `state` up to `today`. Idempotent within a calendar day (§8/10):
 * calling it twice produces byte-identical scores and reports rolledOver:false
 * the second time.
 */
export function advance(state: AppState, today: DateKey): AdvanceResult {
  const scores = scoresAsOf(state.logs, today);
  const evaluatedThrough = addDays(today, -1);
  const rolledOver = diffDays(evaluatedThrough, state.lastEvaluatedDate) > 0;

  return {
    rolledOver,
    state: {
      ...state,
      domains: DOMAIN_KEYS.map((key) => ({ key, score: scores[key] })),
      lastEvaluatedDate: maxDate(state.lastEvaluatedDate, evaluatedThrough),
    },
  };
}

export function scoresOf(state: AppState): DomainScores {
  const out = uniformScores(INITIAL_SCORE);
  for (const d of state.domains) out[d.key] = d.score;
  return out;
}

/** §5 — the log is append-only but capped at 400 days. */
export function trimLogs(logs: readonly DayLog[], today: DateKey): DayLog[] {
  const cutoff = addDays(today, -(MAX_LOG_DAYS - 1));
  return logs.filter((l) => l.date >= cutoff);
}

export type { DomainKey, DomainScores };
