import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { DOMAIN_KEYS, uniformScores } from './domains';
import { AT_TARGET, buildLogs } from './fixtures';
import { buildProjection } from './projection';
import { computeBody, previewScores, scoresAsOf } from './scoring';
import type { AppState, Profile } from './types';
import { deriveParams } from '../visual/params';

const START = '2026-01-01';

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

function stateOf(days: number, pattern = AT_TARGET): AppState {
  const logs = buildLogs({ start: START, days, pattern });
  return {
    profile: PROFILE,
    domains: DOMAIN_KEYS.map((key) => ({ key, score: 50 })),
    logs,
    lastEvaluatedDate: addDays(START, -1),
  };
}

describe('buildProjection', () => {
  it('day 1: cold start at 50, warmup true, projectionAge is currentAge + 15 (§2.4, §3)', () => {
    const state = stateOf(1);
    const p = buildProjection(state, START);
    expect(p.scores).toEqual(uniformScores(50));
    expect(p.warmup).toBe(true);
    expect(p.daysOfHistory).toBe(1);
    expect(p.projectionAge).toBe(50);
  });

  it('60 days at target: every score >= 94, warmup false (§8/1)', () => {
    const state = stateOf(60);
    const today = addDays(START, 60);
    const p = buildProjection(state, today);
    for (const k of DOMAIN_KEYS) expect(p.scores[k]).toBeGreaterThanOrEqual(94);
    expect(p.warmup).toBe(false);
  });

  it('scores and preview match the scoring engine exactly (§2.7): today only ever reaches preview', () => {
    // 13 days at target, so day 14 (today) is not yet folded into `scores`.
    const state = stateOf(13);
    const today = addDays(START, 13);
    state.logs.push({
      date: today,
      opened: true,
      ticks: { SLEEP: true, FOOD: true, SPORT: false, ORDER: false, RELATIONSHIP: false, MIND: false, INCOME: false },
    });
    const p = buildProjection(state, today);
    expect(p.scores).toEqual(scoresAsOf(state.logs, today));
    expect(p.preview).toEqual(previewScores(state.logs, today));
    expect(p.preview.SLEEP).toBeGreaterThan(p.scores.SLEEP);
    expect(p.preview).not.toEqual(p.scores);
  });

  it('body matches computeBody(preview), not computeBody(scores)', () => {
    const state = stateOf(20);
    const today = addDays(START, 20);
    const p = buildProjection(state, today);
    expect(p.body).toBe(computeBody(p.preview));
  });

  it('fullDay is true only when every daily domain is ticked today (§2.6)', () => {
    const state = stateOf(1);
    const today = addDays(START, 1);
    state.logs.push({
      date: today,
      opened: true,
      ticks: { SLEEP: true, FOOD: true, SPORT: true, ORDER: true, RELATIONSHIP: false, MIND: false, INCOME: false },
    });
    expect(buildProjection(state, today).fullDay).toBe(true);

    state.logs[state.logs.length - 1] = {
      ...(state.logs[state.logs.length - 1] as (typeof state.logs)[number]),
      ticks: { ...(state.logs[state.logs.length - 1] as (typeof state.logs)[number]).ticks, ORDER: false },
    };
    expect(buildProjection(state, today).fullDay).toBe(false);
  });

  it('feeds deriveParams end to end without a score ever reaching the renderer directly', () => {
    const state = stateOf(30);
    const today = addDays(START, 30);
    const p = buildProjection(state, today);
    const params = deriveParams(p.preview, p.body, { fullDay: p.fullDay });
    expect(params.ambientLight).toBeGreaterThan(0.25);
    expect(Number.isFinite(params.muscleMass)).toBe(true);
  });
});
