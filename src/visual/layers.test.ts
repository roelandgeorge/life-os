import { describe, expect, it } from 'vitest';
import { DOMAINS, type DomainKey } from '../core/domains';
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
