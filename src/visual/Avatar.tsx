/**
 * The projection. One figure, one room (§3).
 *
 * Takes exactly two things: a `Profile` (§7 fixed identity) and `AvatarParams`
 * (§4, derived from scores). It never sees a score, which is what keeps the
 * parameter set independently drivable and the debug harness honest.
 *
 * Draw order is depth order: room, partner, figure, then light. Light is last
 * because §4.1's ambient channel is a property of the scene, not a colour on
 * any object — dimming has to reach the whole picture or it reads as repaint.
 */

import { clamp01, lerp } from '../core/math';
import type { Profile } from '../core/types';
import { resolveIdentity, type Identity } from './identity';
import { closedSpline, mirrored } from './path';
import type { AvatarParams } from './params';
import { buildOf, Figure, figureOutlines } from './parts/Figure';
import { Head, headHalfHeight, headOutline } from './parts/Head';
import { Partner } from './parts/Partner';
import { FLOOR_Y, Scene } from './parts/Scene';

export const VIEWBOX = { w: 400, h: 520 };

export function Avatar({
  profile,
  params,
  className,
}: {
  profile: Profile;
  params: AvatarParams;
  className?: string;
}) {
  const id = resolveIdentity(profile);
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      className={className}
      role="img"
      aria-label={`Projected portrait at age ${id.projectionAge}`}
    >
      <AvatarContents id={id} p={params} />
    </svg>
  );
}

/** Split out so the debug harness can nest it without a second <svg>. */
export function AvatarContents({ id, p }: { id: Identity; p: AvatarParams }) {
  // §4.1 ambient, plus §4.7's additive warm shift. Clamped: Full Day brightens
  // a dim room, it does not overexpose a bright one.
  const light = clamp01(p.ambientLight + 0.12 * p.ambientWarmth);
  // Deliberately short of black at the bottom of the range. A sleep-deprived
  // projection the user cannot make out is not a warning, it is an empty frame —
  // and the degraded state is the one the whole app exists to show.
  const dark = (1 - light) * 0.44;

  const hh = headHalfHeight(id);
  // Hunching sinks the head; the figure loses real height, it is not just bent.
  const headCy = 158 - 12 * p.postureUpright;
  const build = buildOf(id, p, headCy + hh);
  const cx = VIEWBOX.w / 2;

  const s = id.heightScale;

  return (
    <>
      <Scene p={p} />
      <Partner p={p} light={light} />

      {/* Scaled about the floor, so a taller identity stands taller rather than
          floating — the feet stay planted in the same room. */}
      <g transform={`translate(${cx} ${FLOOR_Y}) scale(${s}) translate(${-cx} ${-FLOOR_Y})`}>
        {/* §4.7 rim light: the real outlines, stroked warm, behind the figure */}
        {p.rimLight > 0.01 && (
          <g
            fill="none"
            stroke="#FFE0A6"
            strokeLinejoin="round"
            strokeWidth={7}
            opacity={p.rimLight * 0.85}
            transform={`translate(${cx} 0)`}
          >
            {(() => {
              const o = figureOutlines(id, p, build, FLOOR_Y);
              return (
                <>
                  <path d={closedSpline(o.arm(-1))} />
                  <path d={closedSpline(o.arm(1))} />
                  <path d={mirrored(o.torso)} />
                </>
              );
            })()}
            <path d={mirrored(headOutline(id, p))} transform={`translate(0 ${headCy})`} />
          </g>
        )}

        <g transform={`translate(${cx} 0)`}>
          <Figure id={id} p={p} build={build} floorY={FLOOR_Y} />
          <g transform={`translate(0 ${headCy})`}>
            <Head id={id} p={p} />
          </g>
        </g>
      </g>

      {/* ---- §4.1 light ---- */}
      {/* Cold first: a dim room is not merely darker, it loses its warmth. */}
      <rect x={0} y={0} width={VIEWBOX.w} height={VIEWBOX.h} fill="#28405E" opacity={(1 - light) * 0.2} />
      <rect x={0} y={0} width={VIEWBOX.w} height={VIEWBOX.h} fill="#05070C" opacity={dark} />
      <rect
        x={0}
        y={0}
        width={VIEWBOX.w}
        height={VIEWBOX.h}
        fill="#FFB65A"
        opacity={lerp(0, 0.12, light) + 0.1 * p.ambientWarmth}
        style={{ mixBlendMode: 'soft-light' }}
      />
    </>
  );
}
