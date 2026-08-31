/**
 * The room behind the figure: §4.5 tidiness, §4.6 background tier, vehicle and
 * shelf.
 *
 * The four INCOME tiers differ in the things a room actually differs in —
 * ceiling height, window size, how much wall there is — rather than in trim
 * colour. A villa that is just a beige flat does not read as a villa.
 */

import { clamp01, lerp } from '../../core/math';
import { mix } from '../color';
import { closedSpline, openSpline, wobble } from '../path';
import type { AvatarParams } from '../params';
import { Layered } from './Layered';

export const FLOOR_Y = 430;

const WALL = ['#4A453E', '#565046', '#6A6357', '#7C7364'];
const FLOOR = ['#2E2A25', '#3A342C', '#4A4136', '#5C5040'];
const VEHICLE_BODY = ['#000000', '#6B6157', '#8C7F72', '#B9BEC4'];

/** Ceiling height and window scale both grow with the tier. */
function room(tier: number) {
  const t = tier / 3;
  return {
    ceilingY: lerp(96, 22, t),
    windowX: lerp(276, 250, t),
    windowY: lerp(148, 96, t),
    windowW: lerp(84, 128, t),
    windowH: lerp(96, 176, t),
    mouldings: tier >= 2,
  };
}

export function Scene({ p }: { p: AvatarParams }) {
  const tidy = p.roomTidiness;
  const messy = 1 - tidy;

  return (
    <g>
      <Layered pos={p.backgroundTier} count={4}>
        {(tier) => {
          const r = room(tier);
          return (
            <g>
              <rect x={0} y={0} width={400} height={520} fill="#0D1016" />
              <rect x={0} y={r.ceilingY} width={400} height={FLOOR_Y - r.ceilingY} fill={WALL[tier]} />
              <rect x={0} y={FLOOR_Y} width={400} height={520 - FLOOR_Y} fill={FLOOR[tier]} />

              {/* the ceiling line is the cheapest cue for how much room there is */}
              <rect x={0} y={r.ceilingY - 4} width={400} height={4} fill={mix(WALL[tier] as string, '#000000', 0.4)} />

              {r.mouldings && (
                <>
                  <rect x={0} y={r.ceilingY + 10} width={400} height={3} fill={mix(WALL[tier] as string, '#FFFFFF', 0.22)} />
                  <rect x={0} y={FLOOR_Y - 26} width={400} height={12} fill={mix(WALL[tier] as string, '#FFFFFF', 0.16)} />
                </>
              )}

              {/* window, with the §4.6 vehicle beyond it */}
              <g>
                <rect x={r.windowX} y={r.windowY} width={r.windowW} height={r.windowH} fill="#1A2430" />
                <rect
                  x={r.windowX}
                  y={r.windowY + r.windowH * 0.62}
                  width={r.windowW}
                  height={r.windowH * 0.38}
                  fill="#2C3A44"
                />
                <Vehicle
                  pos={p.vehicleTier}
                  x={r.windowX + r.windowW / 2}
                  y={r.windowY + r.windowH * 0.82}
                  scale={r.windowW / 128}
                />
                <rect
                  x={r.windowX}
                  y={r.windowY}
                  width={r.windowW}
                  height={r.windowH}
                  fill="none"
                  stroke={mix(WALL[tier] as string, '#FFFFFF', 0.3)}
                  strokeWidth={5}
                />
                <path
                  d={`M ${r.windowX + r.windowW / 2} ${r.windowY} V ${r.windowY + r.windowH}`}
                  stroke={mix(WALL[tier] as string, '#FFFFFF', 0.3)}
                  strokeWidth={4}
                />
              </g>
            </g>
          );
        }}
      </Layered>

      {/* ---- §4.6 shelf, driven by MIND ---- */}
      <Shelf fill={p.shelfFill} />

      {/* ---- §4.5 disorder ---- */}
      <g opacity={messy}>
        {/* peeling paint */}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={closedSpline(
              wobble(
                [
                  [22 + i * 118, 150 + i * 40],
                  [44 + i * 118, 142 + i * 40],
                  [50 + i * 118, 186 + i * 40],
                  [26 + i * 118, 178 + i * 40],
                ],
                3,
                1.6,
                i,
              ),
            )}
            fill="#2A251F"
            opacity={0.5}
          />
        ))}
        {/* clutter on the floor */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            x={16 + i * 63}
            y={FLOOR_Y + 28 + (i % 3) * 14}
            width={26 + (i % 4) * 11}
            height={11}
            rx={2}
            transform={`rotate(${(i % 2 ? 1 : -1) * (5 + i * 2)} ${30 + i * 63} ${FLOOR_Y + 34})`}
            fill="#1E1A16"
          />
        ))}
      </g>

      {/* crooked frames: they straighten rather than appear */}
      {[0, 1].map((i) => (
        <g
          key={i}
          transform={`rotate(${(i ? -1 : 1) * messy * 7} ${52 + i * 300} ${210 + i * 20})`}
        >
          <rect
            x={36 + i * 300}
            y={190 + i * 20}
            width={32}
            height={40}
            fill="#241F1A"
            stroke={mix('#8A7C68', '#3A342C', messy)}
            strokeWidth={3}
          />
        </g>
      ))}
    </g>
  );
}

function Shelf({ fill }: { fill: number }) {
  const x = 28;
  const y = 268;
  const w = 78;
  return (
    <g>
      <rect x={x} y={y} width={w} height={6} fill={mix('#2B251E', '#7A6448', fill)} />
      {/* dust on an empty shelf; a lit workspace on a full one */}
      <rect x={x} y={y - 34} width={w} height={34} fill="#0F1116" opacity={0.5 * (1 - fill)} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = clamp01(fill * 7 - i);
        if (a <= 0) return null;
        const h = 18 + ((i * 7) % 11);
        return (
          <rect
            key={i}
            x={x + 5 + i * 10}
            y={y - h * a}
            width={7}
            height={h * a}
            fill={mix('#5A4F42', ['#B4553F', '#C89A46', '#4F7A6A', '#7A5F96'][i % 4] as string, a)}
          />
        );
      })}
      {fill > 0.6 && (
        <ellipse cx={x + w / 2} cy={y - 46} rx={44} ry={22} fill="#FFE7B0" opacity={(fill - 0.6) * 0.4} />
      )}
    </g>
  );
}

function Vehicle({ pos, x, y, scale }: { pos: number; x: number; y: number; scale: number }) {
  return (
    <Layered pos={pos} count={4}>
      {(tier) => {
        if (tier === 0) return null;
        const t = tier / 3;
        const w = lerp(52, 74, t) * scale;
        const h = lerp(15, 19, t) * scale;
        const r = lerp(2, 7, t) * scale;
        const wheel = 5.5 * scale;
        return (
          <g>
            {/* cabin */}
            <path
              d={closedSpline([
                [x - w * 0.28, y - h],
                [x - w * 0.05, y - h * lerp(1.5, 1.75, t)],
                [x + w * 0.22, y - h * lerp(1.45, 1.7, t)],
                [x + w * 0.34, y - h],
              ])}
              fill={mix(VEHICLE_BODY[tier] as string, '#0E1318', 0.35)}
            />
            <rect x={x - w / 2} y={y - h} width={w} height={h} rx={r} fill={VEHICLE_BODY[tier]} />
            {/* dents: a wobbled body line only on the old one */}
            {tier === 1 && (
              <path
                d={openSpline(wobble([[x - w * 0.4, y - h * 0.4], [x, y - h * 0.45], [x + w * 0.4, y - h * 0.4]], 2.2, 2, 1))}
                stroke="#3A332C"
                strokeWidth={1.6}
                fill="none"
              />
            )}
            <circle cx={x - w * 0.3} cy={y + h * 0.1} r={wheel} fill="#14100D" />
            <circle cx={x + w * 0.3} cy={y + h * 0.1} r={wheel} fill="#14100D" />
          </g>
        );
      }}
    </Layered>
  );
}
