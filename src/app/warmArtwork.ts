/**
 * Fills the runtime cache (vite.config.ts's CacheFirst rule for
 * avatar/you/) with every state of the variant art the current scene
 * actually uses, so a second launch is offline-capable without the install
 * paying for the ~35 drawings covering appearances this device will never
 * show — see docs/plan/phase-2.md, "Split caching".
 *
 * A resolved `Scene` only carries the one file each slot is showing right
 * now; this widens each variant slot's own filename back out to its other
 * four states before fetching.
 */

import type { Scene } from '../visual/scene';

const VARIANT_STATE = /^(.*\/you\/.+?)\d\.png$/;
const STATES = [1, 2, 3, 4, 5];

export async function warmArtwork(scene: Scene): Promise<void> {
  const stems = new Set<string>();
  for (const { src } of scene) {
    const match = VARIANT_STATE.exec(src);
    if (match) stems.add(match[1] as string);
  }

  await Promise.all(
    [...stems].flatMap((stem) => STATES.map((n) => fetch(`${stem}${n}.png`).catch(() => undefined))),
  );
}
