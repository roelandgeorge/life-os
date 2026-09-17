/**
 * The scene: five drawn slots plus two future accessory overlays, replacing
 * the temporary 3-PNG-set adapter `layers.ts` used through phase 1 (see
 * docs/plan/phase-2.md). `src/content/scene.json` is hand-written data, read
 * the way `catalog.json` is read by `core/catalog.ts`; this module holds its
 * types and the frame/rect geometry. The resolver (`scene()`) is added in the
 * next sub-step — this file only has the table so far.
 */

import sceneJson from '../content/scene.json';
import artworkJson from '../content/artwork.json';
import type { PanelKey, PanelSteps } from '../core/domains';
import type { Requirement } from '../core/catalog';
import type { Profile } from '../core/types';

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

// ---------------------------------------------------------------------------
// The resolver. `scene()` is pure: which slots are drawn, in what order, at
// what rect, from which file — everything `<Avatar>` needs and nothing it
// has to work out for itself.
// ---------------------------------------------------------------------------

const INVENTORY: ReadonlySet<string> = new Set(artworkJson as string[]);

export type ResolvedSlot = { slot: string; src: string; rect: Rect; order: number };
export type Scene = readonly ResolvedSlot[];

function requirementMet(req: Requirement, profile: Profile | undefined): boolean {
  // Omitted means unknown, filter permissively — the same rule catalogFor()
  // uses: a requirement only hides a slot once the profile has said no.
  if (req === 'partner') return profile?.partner?.wanted !== false;
  if (req === 'children') return profile?.children !== false;
  return true;
}

function axisValue(axis: VariantAxis, appearance: Appearance, profile: Profile | undefined): string | undefined {
  if (appearance === 'user') return axis === 'gender' ? profile?.gender : profile?.hair;
  if (appearance === 'partner') return axis === 'gender' ? profile?.partner?.gender : profile?.partner?.hair;
  return undefined;
}

/**
 * Candidate filename stems, most specific first, ending at the slot's bare
 * name. Only the longest *known* prefix of `variants` is ever used — a gender
 * with no hair on record tries "head-male" then falls straight to "head", it
 * never guesses a hair. That is what keeps a partially-filled profile from
 * rendering a wrong variant instead of a shared one.
 */
function knownStems(slotDef: SlotDef, profile: Profile | undefined): string[] {
  const values = slotDef.variants.map((axis) => axisValue(axis, slotDef.appearance, profile));
  let known = 0;
  while (known < values.length && values[known] !== undefined) known++;

  const stems: string[] = [];
  for (let k = known; k >= 0; k--) stems.push([slotDef.slot, ...values.slice(0, k)].join('-'));
  return stems;
}

/**
 * The one rung `knownStems` cannot reach: a slot for which only variant files
 * exist, asked of a profile that does not say. Tried only once every known
 * stem above has failed.
 */
function defaultStem(slotDef: SlotDef): string {
  return [slotDef.slot, ...slotDef.variants.map((axis) => DEFAULT_APPEARANCE[axis])].join('-');
}

/**
 * public/avatar/ holds the variant-free art, public/avatar/you/ the variant
 * art — a stem carries a variant exactly when it has more than its bare slot
 * name, which shows up as a hyphen.
 */
function filePath(stem: string, state: number | null): string | null {
  const name = state === null ? `${stem}.png` : `${stem}${state}.png`;
  const rel = stem.includes('-') ? `you/${name}` : name;
  return INVENTORY.has(rel) ? rel : null;
}

function resolveFile(slotDef: SlotDef, state: number | null, profile: Profile | undefined): string | null {
  for (const stem of knownStems(slotDef, profile)) {
    const file = filePath(stem, state);
    if (file) return file;
  }
  if (slotDef.variants.length > 0) {
    const file = filePath(defaultStem(slotDef), state);
    if (file) return file;
  }
  return null;
}

function src(file: string): string {
  return `${import.meta.env.BASE_URL}avatar/${file}`;
}

/**
 * `steps` in, a resolved `Scene` out — which slots paint, from which file, in
 * what order. A box always resolves (the least specific rung is guaranteed to
 * exist); an overlay with nothing to draw is simply left out of the result.
 */
export function scene(steps: PanelSteps, profile: Profile | undefined): Scene {
  const out: ResolvedSlot[] = [];
  for (const slotDef of SLOTS) {
    if (slotDef.requires?.some((r) => !requirementMet(r, profile))) continue;

    const state = slotDef.panel === undefined ? null : steps[slotDef.panel] + 1;
    const file = resolveFile(slotDef, state, profile);
    if (!file) continue;

    out.push({ slot: slotDef.slot, src: src(file), rect: slotDef.rect, order: slotDef.order });
  }
  return out.sort((a, b) => a.order - b.order);
}
