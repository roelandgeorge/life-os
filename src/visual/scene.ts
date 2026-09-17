/**
 * The scene: five drawn slots plus two future accessory overlays, replacing
 * the temporary 3-PNG-set adapter `layers.ts` used through phase 1 (see
 * docs/plan/phase-2.md). `src/content/scene.json` is hand-written data, read
 * the way `catalog.json` is read by `core/catalog.ts`; this module holds its
 * types and the frame/rect geometry. The resolver (`scene()`) is added in the
 * next sub-step — this file only has the table so far.
 */

import sceneJson from '../content/scene.json';
import type { PanelKey } from '../core/domains';
import type { Requirement } from '../core/catalog';

export type SlotKind = 'box' | 'overlay';

/** Which half of the profile decides a slot's variant, if any. */
export type Appearance = 'user' | 'partner' | 'none';

/** The axes a slot's filename can carry, most to least specific left to right. */
export type VariantAxis = 'gender' | 'hair';

export type Rect = { x: number; y: number; w: number; h: number };

export type SlotDef = {
  slot: string;
  kind: SlotKind;
  /** Absent means a fixed image with no state — the two accessory slots. */
  panel?: PanelKey;
  appearance: Appearance;
  rect: Rect;
  /** Ascending paint order. */
  order: number;
  requires?: readonly Requirement[];
  variants: readonly VariantAxis[];
};

export type SceneJson = {
  frame: { w: number; h: number };
  /** The one case the fallback chain can't cover on its own — see scene.ts's resolver. */
  defaultAppearance: { gender: string; hair: string };
  slots: readonly SlotDef[];
};

const SCENE = sceneJson as SceneJson;

/** The artwork's own pixel dimensions. `.avatar`/`.avatar-layer` in styles.css assume this. */
export const FRAME = SCENE.frame;

export const DEFAULT_APPEARANCE = SCENE.defaultAppearance;

export const SLOTS: readonly SlotDef[] = SCENE.slots;

export function getSlot(slot: string): SlotDef {
  const found = SLOTS.find((s) => s.slot === slot);
  if (!found) throw new Error(`Unknown slot: ${slot}`);
  return found;
}

/** True if `inner` lies within `outer`'s bounds — overlay rects against their box. */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/** True if `boxes` tile `frame` exactly — no gap, no overlap — regardless of order. */
export function tilesFrame(boxes: readonly Rect[], frame: Rect): boolean {
  const area = (r: Rect) => r.w * r.h;
  const totalArea = boxes.reduce((sum, b) => sum + area(b), 0);
  if (totalArea !== area(frame)) return false;

  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (let i = 0; i < boxes.length; i++) {
    const bi = boxes[i] as Rect;
    if (!rectContains(frame, bi)) return false;
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(bi, boxes[j] as Rect)) return false;
    }
  }
  return true;
}
