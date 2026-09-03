import { describe, expect, it } from 'vitest';
import { DOMAINS, VISIBLE_DOMAINS, emptyTicks, type DomainKey } from '../core/domains';
import { addDays } from '../core/dates';
import { allSteps } from '../core/steps';
import type { DayLog } from '../core/types';
import { LAYERS, VISIBLE_DOMAIN_KEYS, layerSteps } from './layers';
import type { DomainSteps } from '../core/steps';

function steps(overrides: Partial<DomainSteps>): DomainSteps {
  return Object.fromEntries(DOMAINS.map((d) => [d.key, overrides[d.key] ?? 0])) as DomainSteps;
}

describe('layers and domains agree', () => {
  it('every domain marked visible drives at least one layer, and vice versa', () => {
    const visibleInDomains = DOMAINS.filter((d) => d.visible)
      .map((d) => d.key)
      .sort();
    expect([...VISIBLE_DOMAIN_KEYS].sort()).toEqual(visibleInDomains);
  });

  it('no layer references a domain that does not exist', () => {
    const known = new Set<DomainKey>(DOMAINS.map((d) => d.key));
    for (const layer of LAYERS) {
      for (const key of layer.domains) expect(known.has(key)).toBe(true);
    }
  });
});

describe('layerSteps', () => {
  it('takes the lowest step among a layer’s domains', () => {
    const s = steps({ SLEEP: 4, SPORT: 1, FOOD: 3 });
    expect(layerSteps(s).user).toBe(1);
  });

  it('passes a single-domain layer straight through', () => {
    expect(layerSteps(steps({ INCOME: 2 })).achtergrond).toBe(2);
    expect(layerSteps(steps({ RELATIONSHIP: 3 })).lief).toBe(3);
  });

  it('lets one neglected domain hold a layer down despite perfect others', () => {
    const s = steps({ SLEEP: 4, FOOD: 4, SPORT: 0, RELATIONSHIP: 4 });
    expect(layerSteps(s).user).toBe(0); // SPORT drags the figure to the floor
    expect(layerSteps(s).lief).toBe(4); // its own domain is untouched by that
  });
});

/**
 * The two-day cadence made SPORT the one domain whose ticks and whose panel
 * move on different clocks, so pin the whole path — a real training pattern
 * through the step model to the panel — rather than only the join at the end.
 */
describe('a training pattern reaches the figure', () => {
  const START = '2026-01-01';

  // Sleep and food perfect throughout; only the training varies, so any
  // movement in the `user` panel can only have come from SPORT.
  function history(days: number, trains: (i: number) => boolean): DayLog[] {
    return Array.from({ length: days }, (_, i) => {
      const ticks = emptyTicks();
      ticks.SLEEP = true;
      ticks.FOOD = true;
      ticks.SPORT = trains(i);
      return { date: addDays(START, i), opened: true, ticks, customTicks: {} };
    });
  }

  it('holds the figure at the top on every other day', () => {
    const s = allSteps(history(20, (i) => i % 2 === 0), VISIBLE_DOMAINS, addDays(START, 20));
    expect(s.SPORT).toBe(4);
    expect(layerSteps(s).user).toBe(4);
  });

  it('drops the figure when training stops, sleep and food untouched', () => {
    const s = allSteps(history(20, (i) => i < 6), VISIBLE_DOMAINS, addDays(START, 20));
    expect(s.SLEEP).toBe(4);
    expect(s.FOOD).toBe(4);
    expect(layerSteps(s).user).toBe(0);
  });

  it('costs nothing for a single rest day', () => {
    const s = allSteps(history(11, (i) => i % 2 === 0), VISIBLE_DOMAINS, addDays(START, 11));
    expect(layerSteps(s).user).toBe(4);
  });
});
