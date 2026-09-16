/**
 * Temporary adapter from the 5 panels (§1.2 of docs/plan/phase-1.md) onto the
 * 3 PNG layer sets that exist today. Phase 2 gives each panel its own artwork
 * and this file collapses to the identity map; nothing outside this module
 * should assume the 3-layer shape is permanent.
 *
 * body/head -> user, network+partner -> lief, wealth -> achtergrond, each
 * taking the *minimum* of the panels it stands in for — the same "lowest
 * wins" rule the old domain->layer mapping used, and for the same reason:
 * a strong panel must not hide a neglected one sharing its drawing.
 */

import type { PanelKey } from '../core/domains';
import { PANEL_KEYS } from '../core/domains';

export type LayerKey = 'achtergrond' | 'lief' | 'user';

export interface LayerConfig {
  key: LayerKey;
  /** The layer's step is the minimum across these panels. */
  panels: readonly PanelKey[];
  /** Where the panel sits, in FRAME units — the artwork's own pixel dimensions. */
  rect: { x: number; y: number; w: number; h: number };
}

/**
 * The scene is a collage of abutting panels, not a stack of cut-outs: the
 * background is a band across the top, the two figures sit side by side
 * beneath it. These numbers are the artwork's own pixel dimensions, unchanged
 * from phase 1 — re-cropping the art moves these with it, nothing else does.
 */
export const FRAME = { w: 682, h: 1033 };

export const LAYERS: readonly LayerConfig[] = [
  { key: 'achtergrond', panels: ['wealth'], rect: { x: 0, y: 0, w: 682, h: 401 } },
  { key: 'user', panels: ['body', 'head'], rect: { x: 0, y: 401, w: 409, h: 632 } },
  { key: 'lief', panels: ['network', 'partner'], rect: { x: 409, y: 401, w: 273, h: 632 } },
];

export const LAYER_KEYS: readonly LayerKey[] = LAYERS.map((l) => l.key);

/** Every panel this temporary adapter accounts for — currently all 5. */
export const ADAPTED_PANEL_KEYS: readonly PanelKey[] = [
  ...new Set(LAYERS.flatMap((l) => l.panels)),
];

export type PanelSteps = Record<PanelKey, number>;
export type LayerSteps = Record<LayerKey, number>;

/** Each layer takes the lowest step among the panels standing in for it. */
export function layerSteps(steps: PanelSteps): LayerSteps {
  const out = {} as LayerSteps;
  for (const layer of LAYERS) {
    out[layer.key] = Math.min(...layer.panels.map((p) => steps[p]));
  }
  return out;
}

/** Sanity check the adapter and the panel list agree — pinned by `layers.test.ts`. */
export function coversEveryPanel(): boolean {
  return PANEL_KEYS.every((p) => ADAPTED_PANEL_KEYS.includes(p));
}
