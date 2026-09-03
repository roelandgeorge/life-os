/**
 * The artwork layers, and which domains drive each.
 *
 * This table is the whole contract between the step model and the renderer: a
 * layer shows one of five images, chosen by the *lowest* step among the
 * domains that feed it.
 *
 * Lowest, not average: you cannot out-train a bad diet, and averaging would
 * let a strong domain hide a neglected one — the same reason §2.5 refuses a
 * single global life score.
 *
 * A domain that appears in no layer is not in the app at all: no artwork, and
 * no checkbox either. A tick that changes nothing on screen would break the
 * one thing this app is built on. ORDER and MIND are currently in that state
 * by choice; giving either a layer here is all it takes to bring it back.
 *
 * `user` is head and body in one drawing. They were separate layers first, so
 * that a bad night showed in the face while training still showed in the
 * build; merging them means the whole figure moves at the pace of whichever
 * of the three is furthest behind. Splitting them again is this table plus a
 * fourth set of images, and nothing else.
 */

import type { DomainKey } from '../core/domains';
import type { DomainSteps } from '../core/steps';

export type LayerKey = 'achtergrond' | 'lief' | 'user';

export interface LayerConfig {
  key: LayerKey;
  /** The layer's step is the minimum across these. */
  domains: readonly DomainKey[];
  /** Where the panel sits, in FRAME units. */
  rect: { x: number; y: number; w: number; h: number };
}

/**
 * The scene is a collage of abutting panels, not a stack of cut-outs: the
 * background is a band across the top, the two figures sit side by side
 * beneath it. That is what lets each panel be drawn as its own complete
 * picture — no alpha, no matching perspective or ground shadows between
 * panels, no seams to hide.
 *
 * These numbers are the artwork's own pixel dimensions, so the panels tile
 * exactly. Re-crop the art and these move with it; nothing else does.
 */
export const FRAME = { w: 682, h: 1033 };

export const LAYERS: readonly LayerConfig[] = [
  { key: 'achtergrond', domains: ['INCOME'], rect: { x: 0, y: 0, w: 682, h: 401 } },
  { key: 'user', domains: ['SLEEP', 'SPORT', 'FOOD'], rect: { x: 0, y: 401, w: 409, h: 632 } },
  { key: 'lief', domains: ['RELATIONSHIP'], rect: { x: 409, y: 401, w: 273, h: 632 } },
];

export const LAYER_KEYS: readonly LayerKey[] = LAYERS.map((l) => l.key);

/** Every domain that drives at least one layer — i.e. everything the app shows. */
export const VISIBLE_DOMAIN_KEYS: readonly DomainKey[] = [
  ...new Set(LAYERS.flatMap((l) => l.domains)),
];

export function isVisibleDomain(key: DomainKey): boolean {
  return VISIBLE_DOMAIN_KEYS.includes(key);
}

export type LayerSteps = Record<LayerKey, number>;

/** Each layer takes the lowest step among the domains feeding it. */
export function layerSteps(steps: DomainSteps): LayerSteps {
  const out = {} as LayerSteps;
  for (const layer of LAYERS) {
    out[layer.key] = Math.min(...layer.domains.map((k) => steps[k]));
  }
  return out;
}
