import { describe, expect, it } from 'vitest';
import { PANEL_KEYS, type PanelKey } from '../core/domains';
import { ADAPTED_PANEL_KEYS, LAYERS, coversEveryPanel, layerSteps, type PanelSteps } from './layers';

function steps(overrides: Partial<PanelSteps>): PanelSteps {
  return Object.fromEntries(PANEL_KEYS.map((p) => [p, overrides[p] ?? 0])) as PanelSteps;
}

describe('the panel -> layer adapter', () => {
  it('accounts for every panel exactly once', () => {
    expect(coversEveryPanel()).toBe(true);
    const seen = new Set<PanelKey>();
    for (const layer of LAYERS) {
      for (const panel of layer.panels) {
        expect(seen.has(panel)).toBe(false); // no panel feeds two layers
        seen.add(panel);
      }
    }
    expect([...seen].sort()).toEqual([...ADAPTED_PANEL_KEYS].sort());
  });

  it('user takes the lower of body and head', () => {
    expect(layerSteps(steps({ body: 4, head: 1 })).user).toBe(1);
    expect(layerSteps(steps({ body: 1, head: 4 })).user).toBe(1);
  });

  it('lief takes the lower of network and partner', () => {
    expect(layerSteps(steps({ network: 3, partner: 0 })).lief).toBe(0);
  });

  it('achtergrond passes wealth straight through', () => {
    expect(layerSteps(steps({ wealth: 2 })).achtergrond).toBe(2);
  });

  it('lets one neglected panel hold a layer down despite its partner being perfect', () => {
    const s = steps({ body: 4, head: 0, network: 4, partner: 4 });
    expect(layerSteps(s).user).toBe(0);
    expect(layerSteps(s).lief).toBe(4);
  });
});
