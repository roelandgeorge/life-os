/**
 * Neck, shoulders, arms, torso and clothing.
 *
 * §4.3's posture axis is the hard one in a front view: "hunched, head forward,
 * curved spine" has no depth to read against. It is rendered instead as the
 * things hunching does that a front view *can* show — the neck shortens, the
 * trapezius rides up toward the ears, and the shoulder line rolls inward and
 * down. Nothing here fakes a rotation.
 *
 * The arms are separate silhouettes rather than part of the torso outline. A
 * single closed shape from shoulder to hem reads as a bell, not a body, and no
 * amount of shading rescues it — the gap between arm and ribcage is what makes
 * a human outline legible at a glance.
 */

import { clamp01, lerp } from '../../core/math';
import { mix } from '../color';
import { skinColor, type Identity } from '../identity';
import { closedSpline, mirrored, openSpline, wobble, type Pt } from '../path';
import type { AvatarParams } from '../params';

export type Build = {
  neckTopY: number;
  shoulderY: number;
  shoulderHalf: number;
  neckHalf: number;
};

export function buildOf(id: Identity, p: AvatarParams, headBottomY: number): Build {
  const neckLength = lerp(14, 30, p.postureUpright);
  return {
    neckTopY: headBottomY - 10,
    shoulderY: headBottomY - 10 + neckLength,
    shoulderHalf:
      84 * id.shoulder * (0.86 + 0.28 * id.frame) * p.shoulderWidth * (1 + 0.12 * p.muscleMass),
    neckHalf: lerp(15, 21, id.frame) * (1 - 0.2 * p.gauntness) * (1 + 0.16 * p.muscleMass),
  };
}

type Outlines = { torso: Pt[]; arm: (s: number) => Pt[] };

/** Shared with the §4.7 rim light so it traces the real silhouette. */
export function figureOutlines(
  id: Identity,
  p: AvatarParams,
  build: Build,
  floorY: number,
): Outlines {
  const { shoulderY, shoulderHalf, neckHalf, neckTopY } = build;
  const rise = lerp(12, 0, p.postureUpright); // trapezius pulled toward the ears
  const drop = lerp(16, 3, p.postureUpright); // outer shoulder rolled down
  const bulk = 16 * p.muscleMass;
  const waist = shoulderHalf * id.waist * (1 - 0.16 * p.gauntness) * (1 + 0.08 * p.muscleMass);
  const hem = floorY + 90;

  return {
    torso: [
      [-neckHalf, neckTopY + 6],
      [-shoulderHalf * 0.5, shoulderY - rise],
      [-shoulderHalf * 0.9, shoulderY + drop],
      [-shoulderHalf * (0.72 + 0.06 * id.chest), shoulderY + 92],
      [-waist * 0.88, shoulderY + 176],
      [-waist * 0.9 * (1 + 0.12 * (1 - p.clothingCondition)), hem],
    ],
    // The arm sits just proud of the torso. Hanging arms leave almost no real
    // gap, so the outer edge is what reads — the inner edge is handled by the
    // armhole seam in `Figure`, not by pretending to a space that is not there.
    arm: (s: number) => [
      [s * shoulderHalf * 0.86, shoulderY + drop - 6],
      [s * (shoulderHalf * 1.06 + bulk), shoulderY + 66],
      [s * (shoulderHalf * 0.84 + bulk * 0.5), hem],
      [s * shoulderHalf * 0.56, hem],
      [s * shoulderHalf * 0.7, shoulderY + 88],
      [s * shoulderHalf * 0.68, shoulderY + 26],
    ],
  };
}

export function Figure({
  id,
  p,
  build,
  floorY,
}: {
  id: Identity;
  p: AvatarParams;
  build: Build;
  floorY: number;
}) {
  const skin = skinColor(id, p.skinToneHealth, p.skinGreyness);
  const shadow = mix(skin, '#40261A', 0.38);
  const { shoulderY, shoulderHalf, neckHalf, neckTopY } = build;

  // §4.5 clothing. Worn is not just darker: it is duller and flatter.
  const cond = p.clothingCondition;
  const cloth = mix('#4C453D', '#37637F', cond);
  const clothShade = mix(cloth, '#141A1E', 0.4);
  const frayed = (1 - cond) * 1.8;

  const { torso, arm } = figureOutlines(id, p, build, floorY);
  const drop = lerp(16, 3, p.postureUpright);
  const collarY = shoulderY + 12;
  const vDepth = 28;
  const hem = floorY + 90;

  return (
    <g>
      {/* ---- neck ---- */}
      <path
        d={mirrored([
          [-neckHalf, neckTopY],
          [-neckHalf * (1 + 0.3 * p.muscleMass), shoulderY + 4],
          [-neckHalf * 1.75, shoulderY + 24],
        ])}
        fill={skin}
      />
      {/* the head casts onto the neck; without this the head reads as pasted on */}
      <path
        d={closedSpline([
          [-neckHalf * 1.1, neckTopY + 2],
          [0, neckTopY + 16],
          [neckHalf * 1.1, neckTopY + 2],
          [0, neckTopY - 6],
        ])}
        fill={shadow}
        opacity={0.45}
      />

      {/* ---- arms behind the torso, so the shoulder seam falls where it should ---- */}
      {[-1, 1].map((s) => (
        <path key={s} d={closedSpline(arm(s))} fill={clothShade} />
      ))}

      {/* ---- torso ---- */}
      <path d={mirrored(torso)} fill={cloth} />

      {/* The armhole seam. This single line is what turns the silhouette from a
          bell into a body — the shoulder reads as a joint rather than a corner. */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={openSpline([
            [s * shoulderHalf * 0.84, shoulderY + drop - 2],
            [s * shoulderHalf * 0.76, shoulderY + 52],
            [s * shoulderHalf * 0.68, shoulderY + 110],
          ])}
          stroke={clothShade}
          strokeWidth={2.6}
          fill="none"
          opacity={0.75}
        />
      ))}

      {/* §4.3 muscle: the shirt breaks over the chest */}
      {p.muscleMass > 0.15 && (
        <g opacity={(p.muscleMass - 0.15) * 0.6} stroke={clothShade} fill="none" strokeWidth={1.8}>
          {[-1, 1].map((s) => (
            <path
              key={s}
              d={openSpline([
                [s * shoulderHalf * 0.2, shoulderY + 108],
                [s * shoulderHalf * 0.52, shoulderY + 96],
                [s * shoulderHalf * 0.64, shoulderY + 58],
              ])}
            />
          ))}
        </g>
      )}

      {/* ---- collar and chest opening ---- */}
      <path
        d={closedSpline([
          [-neckHalf * 1.42, collarY - 8],
          [0, collarY + vDepth],
          [neckHalf * 1.42, collarY - 8],
          [0, collarY - 4],
        ])}
        fill={skin}
      />
      {/* §4.2 gauntness: collarbones surface and the sternum hollows */}
      <g opacity={p.gauntness * 0.85} stroke={shadow} fill="none" strokeWidth={1.5}>
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={openSpline([
              [s * neckHalf * 0.55, collarY + 8],
              [s * neckHalf * 1.5, collarY + 15],
            ])}
          />
        ))}
        <path d={openSpline([[0, collarY + 16], [0, collarY + vDepth * 0.72]])} opacity={0.5} />
      </g>

      {/* collar edges, frayed as ORDER falls */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={openSpline(
            wobble(
              [
                [s * neckHalf * 1.42, collarY - 10],
                [s * neckHalf * 0.95, collarY + vDepth * 0.55],
                [0, collarY + vDepth + 3],
              ],
              frayed,
              2.4,
              s * 3,
            ),
          )}
          stroke={clothShade}
          strokeWidth={2.6}
          fill="none"
        />
      ))}

      {/* placket and buttons — one goes missing as condition falls */}
      <path
        d={openSpline([[0, collarY + vDepth], [0, hem]])}
        stroke={clothShade}
        strokeWidth={2}
        fill="none"
        opacity={0.55}
      />
      {[0, 1, 2].map((i) => {
        const missing = i === 1 ? clamp01((0.55 - cond) / 0.25) : 0;
        return (
          <circle
            key={i}
            cx={0}
            cy={collarY + vDepth + 34 + i * 48}
            r={3.6}
            fill={mix(clothShade, '#D8CFC0', 0.55)}
            opacity={1 - missing}
          />
        );
      })}

      {/* stains */}
      <g opacity={(1 - cond) * 0.45}>
        <ellipse cx={-shoulderHalf * 0.34} cy={shoulderY + 150} rx={18} ry={13} fill="#221C16" />
        <ellipse cx={shoulderHalf * 0.26} cy={shoulderY + 214} rx={12} ry={9} fill="#221C16" />
      </g>
    </g>
  );
}
