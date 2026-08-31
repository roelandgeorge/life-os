import { describe, expect, it } from 'vitest';
import { uniformScores } from '../core/domains';
import { computeBody } from '../core/scoring';
import {
  BACKGROUND_BOUNDARIES,
  blendWeights,
  deriveParams,
  effectiveMuscle,
  getParamSpec,
  PARAM_KEYS,
  PARAM_SPECS,
  TIER_BAND,
  tierPosition,
} from './params';

function paramsFor(overrides: Partial<Record<string, number>>) {
  const scores = { ...uniformScores(50), ...overrides } as ReturnType<typeof uniformScores>;
  return deriveParams(scores, computeBody(scores));
}

describe('§8 vector 4', () => {
  it('effectiveMuscle with SPORT=100 FOOD=0 is 0.40', () => {
    expect(effectiveMuscle(1, 0)).toBeCloseTo(0.4, 10);
    expect(paramsFor({ SPORT: 100, FOOD: 0 }).muscleMass).toBeCloseTo(0.4, 10);
  });

  it('gates muscle on food, so training without eating cannot build a figure', () => {
    // The point of §4.3: sport alone caps the build at 40% of its range.
    expect(effectiveMuscle(1, 1)).toBeCloseTo(1.0, 10);
    expect(effectiveMuscle(1, 0)).toBeLessThan(effectiveMuscle(1, 1));
    expect(effectiveMuscle(0, 1)).toBe(0);
  });
});

describe('§4 formulas at the extremes', () => {
  it('produces each parameter at its declared range bounds', () => {
    const zero = deriveParams(uniformScores(0), 0);
    const full = deriveParams(uniformScores(100), 100);

    for (const spec of PARAM_SPECS) {
      // Full Day is additive and independent of scores (§4.7); it has no score
      // that produces its maximum.
      if (spec.group === 'fullDay') continue;
      const lo = Math.min(zero[spec.key], full[spec.key]);
      const hi = Math.max(zero[spec.key], full[spec.key]);
      expect(lo, `${spec.key} low`).toBeCloseTo(spec.min, 6);
      expect(hi, `${spec.key} high`).toBeCloseTo(spec.max, 6);
    }
  });

  it('never leaves a parameter outside its declared range at any score', () => {
    for (let v = 0; v <= 100; v += 0.5) {
      const p = deriveParams(uniformScores(v), v);
      for (const spec of PARAM_SPECS) {
        if (spec.group === 'fullDay') continue;
        expect(p[spec.key], `${spec.key} at S=${v}`).toBeGreaterThanOrEqual(spec.min - 1e-9);
        expect(p[spec.key], `${spec.key} at S=${v}`).toBeLessThanOrEqual(spec.max + 1e-9);
      }
    }
  });

  it('keeps every parameter continuous in the score', () => {
    // No parameter may jump. A visible step is a threshold to game (§4.6).
    const step = 0.25;
    for (let v = 0; v < 100; v += step) {
      const a = deriveParams(uniformScores(v), v);
      const b = deriveParams(uniformScores(v + step), v + step);
      for (const spec of PARAM_SPECS) {
        const range = spec.max - spec.min;
        const jump = Math.abs(b[spec.key] - a[spec.key]) / (range || 1);
        expect(jump, `${spec.key} jumped at S=${v}`).toBeLessThan(0.05);
      }
    }
  });
});

describe('§4.7 Full Day is additive and independent', () => {
  it('changes only the Full Day parameters', () => {
    const scores = uniformScores(63);
    const off = deriveParams(scores, computeBody(scores), { fullDay: false });
    const on = deriveParams(scores, computeBody(scores), { fullDay: true });

    for (const key of PARAM_KEYS) {
      if (getParamSpec(key).group === 'fullDay') expect(on[key]).toBeGreaterThan(off[key]);
      else expect(on[key], key).toBe(off[key]);
    }
  });
});

describe('§4.6 tier crossfades', () => {
  it('splits evenly exactly at a boundary, so no tick flips the room', () => {
    for (const b of BACKGROUND_BOUNDARIES) {
      expect(tierPosition(b, BACKGROUND_BOUNDARIES) % 1).toBeCloseTo(0.5, 6);
    }
  });

  it('crossfades across the full ±8 band and is settled outside it', () => {
    const [first] = BACKGROUND_BOUNDARIES;
    expect(tierPosition(first - TIER_BAND, BACKGROUND_BOUNDARIES)).toBeCloseTo(0, 6);
    expect(tierPosition(first + TIER_BAND, BACKGROUND_BOUNDARIES)).toBeCloseTo(1, 6);

    // Strictly increasing through the band: no plateau to sit on.
    for (let v = first - TIER_BAND + 1; v < first + TIER_BAND; v++) {
      expect(tierPosition(v, BACKGROUND_BOUNDARIES)).toBeGreaterThan(
        tierPosition(v - 1, BACKGROUND_BOUNDARIES),
      );
    }
  });

  it('reaches every tier and never overshoots', () => {
    expect(tierPosition(0, BACKGROUND_BOUNDARIES)).toBe(0);
    expect(tierPosition(100, BACKGROUND_BOUNDARIES)).toBeCloseTo(3, 6);
  });

  it('blends at most two layers, always summing to 1', () => {
    for (let pos = 0; pos <= 3; pos += 0.05) {
      const w = blendWeights(pos, 4);
      expect(w.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 10);
      expect(w.filter((x) => x > 1e-9).length).toBeLessThanOrEqual(2);
    }
  });
});

describe('the parameter registry', () => {
  it('has a spec for every key and no orphans', () => {
    expect(PARAM_SPECS.map((s) => s.key).sort()).toEqual([...PARAM_KEYS].sort());
    expect(new Set(PARAM_SPECS.map((s) => s.key)).size).toBe(PARAM_SPECS.length);
  });

  it('declares a non-empty range and a driver for every parameter', () => {
    for (const spec of PARAM_SPECS) {
      expect(spec.max, spec.key).toBeGreaterThan(spec.min);
      expect(spec.drivenBy.length, spec.key).toBeGreaterThan(0);
      expect(spec.formula.length, spec.key).toBeGreaterThan(0);
    }
  });
});
