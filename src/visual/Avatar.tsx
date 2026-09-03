/**
 * The projection: one scene, assembled from three abutting panels (§3 — still
 * one figure on screen, just drawn in pieces).
 *
 * Takes layer steps and nothing else — no scores, no profile. The renderer
 * cannot know why a layer is at state 2, only that it is, which is what keeps
 * the step model and the artwork independently replaceable: swap the PNGs and
 * this file does not change.
 *
 * Panels are swapped outright rather than cross-faded. Blending two states
 * would show two faces at once, and a picture the user has to squint past is
 * worse than an honest jump.
 */

import { FRAME, LAYERS, type LayerSteps } from './layers';

/**
 * Artwork lives in public/avatar/ as `<layer><1..5>.png` — user1.png through
 * user5.png, and so on. The only place in the app that knows a filename.
 */
function src(layer: string, step: number): string {
  return `${import.meta.env.BASE_URL}avatar/${layer}${step + 1}.png`;
}

const pct = (n: number, of: number) => `${(100 * n) / of}%`;

export function Avatar({ steps, className }: { steps: LayerSteps; className?: string }) {
  return (
    <div
      className={className ? `avatar ${className}` : 'avatar'}
      style={{ aspectRatio: `${FRAME.w} / ${FRAME.h}` }}
    >
      {LAYERS.map(({ key, rect }) => (
        <img
          key={key}
          className={`avatar-layer avatar-${key}`}
          src={src(key, steps[key])}
          alt=""
          draggable={false}
          style={{
            left: pct(rect.x, FRAME.w),
            top: pct(rect.y, FRAME.h),
            width: pct(rect.w, FRAME.w),
            height: pct(rect.h, FRAME.h),
          }}
        />
      ))}
    </div>
  );
}
