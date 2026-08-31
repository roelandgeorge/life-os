import type { ReactNode } from 'react';
import { blendWeights } from '../params';

/**
 * §4.6 — renders the two tiers adjacent to a continuous tier position, faded
 * by weight. Never a switch: at a boundary both are half present, so there is
 * no score at which one more tick visibly flips the scene.
 */
export function Layered({
  pos,
  count,
  children,
}: {
  pos: number;
  count: number;
  children: (tier: number) => ReactNode;
}) {
  return (
    <>
      {blendWeights(pos, count).map((w, tier) =>
        w <= 0.002 ? null : (
          <g key={tier} opacity={w}>
            {children(tier)}
          </g>
        ),
      )}
    </>
  );
}
