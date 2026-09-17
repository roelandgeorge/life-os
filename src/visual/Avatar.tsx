/**
 * The renderer. Paints a resolved `Scene` and nothing else — no steps, no
 * panels, no weights, no profile. That ignorance is the contract: swap the
 * PNGs or change the panel rules and this file does not change, only
 * `scene()` does.
 *
 * Slots are swapped outright rather than cross-faded. Blending two states
 * would show two faces at once, and a picture the user has to squint past is
 * worse than an honest jump.
 */

import { FRAME, type Scene } from './scene';

const pct = (n: number, of: number) => `${(100 * n) / of}%`;

export function Avatar({ scene, className }: { scene: Scene; className?: string }) {
  return (
    <div
      className={className ? `avatar ${className}` : 'avatar'}
      style={{ aspectRatio: `${FRAME.w} / ${FRAME.h}` }}
    >
      {scene.map(({ slot, src, rect }) => (
        <img
          key={slot}
          className={`avatar-layer avatar-${slot}`}
          src={src}
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
