/**
 * The head. Drawn in local coordinates with the origin at the head's centre;
 * the caller places and scales it.
 *
 * Every outline here is a point list, never a literal path (see `path.ts`).
 * Identity supplies the base points, parameters displace them. Nothing switches.
 */

import { clamp01 } from '../../core/math';
import { mix } from '../color';
import { hairColor, skinColor, type Identity } from '../identity';
import { closedSpline, mirrored, openSpline, wobble, type Pt } from '../path';
import type { AvatarParams } from '../params';

/** Lesion sites in normalised head space, so they scale with any face shape. */
const ACNE_SITES: readonly Pt[] = [
  [-0.55, 0.12], [0.62, 0.2], [-0.3, 0.46], [0.34, -0.18], [-0.68, 0.34], [0.7, -0.05],
  [0.12, 0.55], [-0.42, -0.22], [0.5, 0.42], [-0.72, -0.02], [0.26, 0.3], [-0.14, -0.3],
];

/**
 * Left profile of the skull, top to chin. Exported so the §4.7 rim light traces
 * the same geometry the face is built from rather than an approximation of it.
 *
 * Gauntness pulls soft tissue in; sag pushes the jawline out and down. Bone
 * (temple, cheekbone) moves far less than flesh (cheek) — that difference is
 * what makes a gaunt face read as gaunt rather than merely small.
 */
export function headOutline(id: Identity, p: AvatarParams): Pt[] {
  const hh = headHalfHeight(id);
  const hw = headHalfWidth(id);
  const g = p.gauntness;
  const sag = p.skinSag;
  const jawOut = (0.62 + 0.2 * id.face.jaw) * id.jawStrength * (1 + 0.12 * sag) * (1 - 0.1 * g);

  return [
    [0, -hh],
    [-hw * 0.74, -hh * 0.85],
    [-hw * (0.96 - 0.07 * g), -hh * 0.4],
    [-hw * (1.0 - 0.02 * g), -hh * 0.02],
    [-hw * (0.9 - 0.19 * g), hh * 0.33],
    [-hw * jawOut, hh * (0.6 + 0.06 * sag)],
    [-hw * (0.4 + 0.06 * id.face.jaw) * id.jawStrength, hh * (0.87 + 0.03 * sag)],
    [0, hh * (1 + 0.03 * sag)],
  ];
}

export function Head({ id, p }: { id: Identity; p: AvatarParams }) {
  const hh = headHalfHeight(id);
  const hw = headHalfWidth(id);

  const skin = skinColor(id, p.skinToneHealth, p.skinGreyness);
  const shadow = mix(skin, '#40261A', 0.38);
  const hair = hairColor(id, p.hairGrey);
  const g = p.gauntness;
  const sag = p.skinSag;

  const outline = headOutline(id, p);

  const eyeY = -hh * 0.06;
  const eyeDx = hw * 0.43;
  const eyeW = hw * 0.29;
  // §4.1 says half-closed at the extreme, not shut: a closed eye reads as
  // asleep or dead, and the projection has to stay a person looking back.
  const open = 1 - 0.55 * clamp01(p.eyelidDroop / 0.8);
  const eyeH = eyeW * 0.44 * open;

  const browY = eyeY - hh * (0.18 + 0.04 * id.browHeight) - eyeH;
  const mouthY = hh * 0.62;
  const mouthW = hw * 0.44;
  const noseBottom = hh * 0.42;

  const recession = clamp01(id.hairlineRecession + p.hairThinning * 0.55);
  const density = clamp01(1 - p.hairThinning * 0.8);
  const curl = id.hairCurl;
  const messy = 1 - p.groomingNeatness;

  return (
    <g>
      {/* ---- hair behind the head, for medium and long ---- */}
      {id.hairLength > 0.28 && (
        <path
          d={mirrored(
            wobble(
              [
                [0, -hh * 1.04],
                [-hw * 0.8, -hh * 0.92],
                [-hw * (1.0 + 0.1 * curl), -hh * 0.2],
                [-hw * (1.04 + 0.14 * curl), hh * (0.3 + 0.7 * id.hairLength)],
                [-hw * 0.6, hh * (0.55 + 0.85 * id.hairLength)],
                [0, hh * (0.6 + 0.9 * id.hairLength)],
              ],
              curl * 3 + messy * 1.5,
              1.7,
            ),
          )}
          fill={hair}
          opacity={0.55 + 0.45 * density}
        />
      )}

      {/* ---- ears ---- */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse
            cx={s * hw * (1.0 - 0.03 * g)}
            cy={eyeY + hh * 0.16}
            rx={hw * 0.13}
            ry={hh * 0.19}
            fill={skin}
          />
          <ellipse
            cx={s * hw * (1.01 - 0.03 * g)}
            cy={eyeY + hh * 0.16}
            rx={hw * 0.06}
            ry={hh * 0.11}
            fill={shadow}
            opacity={0.45}
          />
        </g>
      ))}

      {/* ---- face ---- */}
      <path d={mirrored(outline)} fill={skin} />

      {/* §4.2 gauntness: hollows under the cheekbone and at the temples */}
      <g opacity={g}>
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={closedSpline([
                [s * hw * 0.88, -hh * 0.04],
                [s * hw * 0.58, hh * 0.2],
                [s * hw * 0.66, hh * 0.46],
                [s * hw * 0.86, hh * 0.24],
              ])}
              fill={shadow}
              opacity={0.42}
            />
            <ellipse
              cx={s * hw * 0.82}
              cy={-hh * 0.42}
              rx={hw * 0.16}
              ry={hh * 0.13}
              fill={shadow}
              opacity={0.34}
            />
          </g>
        ))}
      </g>

      {/* §4.4 jowls: sag hangs the lower face over the jawline */}
      {sag > 0.2 && (
        <g opacity={(sag - 0.2) * 0.9}>
          {[-1, 1].map((s) => (
            <path
              key={s}
              d={openSpline([
                [s * hw * 0.72, hh * 0.34],
                [s * hw * 0.82, hh * 0.62],
                [s * hw * 0.5, hh * 0.86],
              ])}
              stroke={shadow}
              strokeWidth={1.1}
              fill="none"
              opacity={0.5}
            />
          ))}
        </g>
      )}

      {/* ---- eyes ---- */}
      <defs>
        {[-1, 1].map((s) => (
          <clipPath key={s} id={`eye${s > 0 ? 'R' : 'L'}`}>
            <path d={eyePath(s, eyeDx, eyeY, eyeW, eyeH, sag)} />
          </clipPath>
        ))}
      </defs>

      {[-1, 1].map((s) => {
        const cx = s * eyeDx;
        return (
          <g key={s}>
            {/* §4.1 eye bags: a shadowed crescent, deepening and darkening */}
            {p.eyeBagDepth > 0.02 && (
              <path
                d={closedSpline([
                  [cx - eyeW * 0.95, eyeY + eyeH * 0.6],
                  [cx, eyeY + eyeH * 0.5 + hh * 0.02],
                  [cx + eyeW * 0.95, eyeY + eyeH * 0.6],
                  [cx, eyeY + eyeH + hh * (0.05 + 0.09 * p.eyeBagDepth)],
                ])}
                fill={mix(skin, '#5B3A4A', 0.55)}
                opacity={p.eyeBagDepth * 0.7}
              />
            )}

            <path d={eyePath(s, eyeDx, eyeY, eyeW, eyeH, sag)} fill={mix('#FBF7F2', '#C85A50', p.scleraRedness * 0.55)} />

            <g clipPath={`url(#eye${s > 0 ? 'R' : 'L'})`}>
              <circle cx={cx} cy={eyeY + eyeH * 0.05} r={eyeW * 0.44} fill={id.eye} />
              <circle cx={cx} cy={eyeY + eyeH * 0.05} r={eyeW * 0.2} fill="#171310" />
              <circle cx={cx - eyeW * 0.14} cy={eyeY - eyeH * 0.2} r={eyeW * 0.09} fill="#FFFFFF" opacity={0.85} />

              {/* §4.1 bloodshot: vessels, not just a pink fill */}
              <g stroke="#B03A32" strokeWidth={0.7} fill="none" opacity={p.scleraRedness * 0.8}>
                <path d={`M ${cx - eyeW} ${eyeY + eyeH * 0.2} q ${s * eyeW * 0.4} ${-eyeH * 0.3} ${s * eyeW * 0.75} ${-eyeH * 0.1}`} />
                <path d={`M ${cx + eyeW} ${eyeY - eyeH * 0.1} q ${-s * eyeW * 0.5} ${eyeH * 0.4} ${-s * eyeW * 0.9} ${eyeH * 0.2}`} />
              </g>
            </g>

            {/* upper lid, drawn over the sclera so droop occludes the iris */}
            <path
              d={openSpline([
                [cx - eyeW, eyeY + eyeH * 0.1],
                [cx, eyeY - eyeH],
                [cx + eyeW, eyeY + eyeH * 0.1],
              ])}
              stroke={mix(shadow, '#241813', 0.4)}
              strokeWidth={1.3 + 0.9 * sag}
              fill="none"
            />

            {/* brows */}
            <path
              d={openSpline(
                wobble(
                  [
                    [cx - eyeW * 1.05, browY + hh * 0.03],
                    [cx - eyeW * 0.2, browY - hh * 0.015],
                    [cx + eyeW * 0.95, browY + hh * 0.025],
                  ],
                  messy * 0.8,
                  2,
                  s,
                ),
              )}
              stroke={hair}
              strokeWidth={hh * 0.05 * (0.6 + 0.4 * density)}
              strokeLinecap="round"
              fill="none"
              opacity={0.5 + 0.5 * density}
            />
          </g>
        );
      })}

      {/* ---- nose ---- */}
      <path
        d={openSpline([
          [-hw * 0.06, eyeY + hh * 0.06],
          [-hw * 0.13, noseBottom - hh * 0.08],
          [-hw * 0.18, noseBottom],
          [0, noseBottom + hh * 0.03],
        ])}
        stroke={shadow}
        strokeWidth={1.2}
        fill="none"
        opacity={0.55}
      />
      {[-1, 1].map((s) => (
        <ellipse key={s} cx={s * hw * 0.13} cy={noseBottom + hh * 0.015} rx={hw * 0.05} ry={hh * 0.018} fill={shadow} opacity={0.6} />
      ))}

      {/* ---- mouth ---- */}
      {/* Barely parted, not bared. §4.2 needs the teeth legible, but a mouth
          held open across every state reads as a rictus, and the projection is
          confrontational enough without one. Corners fall with sag. */}
      <g>
        <path
          d={closedSpline([
            [-mouthW * 0.8, mouthY + hh * 0.012 * sag],
            [0, mouthY - hh * 0.016],
            [mouthW * 0.8, mouthY + hh * 0.012 * sag],
            [0, mouthY + hh * 0.022],
          ])}
          fill="#2C1B16"
        />
        <g>
          {[-2, -1, 0, 1, 2].map((i) => {
            const gap = 0.8 + p.toothStain * 1.4;
            const w = mouthW * 0.17;
            // The outermost tooth fades out entirely at a heavy stain.
            const missing = i === 2 ? clamp01((p.toothStain - 0.62) / 0.3) : 0;
            const edge = 1 - Math.abs(i) * 0.18; // the arch falls away at the corners
            return (
              <rect
                key={i}
                x={i * (w + gap) - w / 2}
                y={mouthY - hh * 0.012}
                width={w}
                height={hh * 0.024 * edge}
                rx={0.8}
                fill={mix('#F2ECE0', '#7A5427', p.toothStain)}
                opacity={1 - missing}
              />
            );
          })}
        </g>
        {/* lips */}
        <path
          d={openSpline([
            [-mouthW, mouthY + hh * 0.026 * sag],
            [0, mouthY - hh * 0.03],
            [mouthW, mouthY + hh * 0.026 * sag],
          ])}
          stroke={mix(skin, '#8C4A44', 0.5)}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={openSpline([
            [-mouthW * 0.94, mouthY + hh * 0.026 * sag],
            [0, mouthY + hh * 0.05],
            [mouthW * 0.94, mouthY + hh * 0.026 * sag],
          ])}
          stroke={mix(skin, '#8C4A44', 0.38)}
          strokeWidth={2.8}
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* ---- §4.4 wrinkles ---- */}
      <g
        stroke={mix(shadow, '#3A2018', 0.4)}
        fill="none"
        strokeLinecap="round"
        opacity={p.wrinkleDepth * 0.75}
        strokeWidth={0.5 + 1.5 * p.wrinkleDepth}
      >
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={openSpline([
              [-hw * (0.5 + 0.05 * i), -hh * (0.5 - 0.08 * i)],
              [0, -hh * (0.56 - 0.08 * i)],
              [hw * (0.5 + 0.05 * i), -hh * (0.5 - 0.08 * i)],
            ])}
            opacity={i === 2 ? p.wrinkleDepth : 1}
          />
        ))}
        {/* nasolabial folds */}
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={openSpline([
              [s * hw * 0.22, noseBottom - hh * 0.01],
              [s * hw * 0.42, mouthY - hh * 0.02],
              [s * hw * 0.36, mouthY + hh * 0.11],
            ])}
          />
        ))}
        {/* crow's feet */}
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => (
            <path
              key={`${s}-${i}`}
              d={`M ${s * (eyeDx + eyeW * 0.9)} ${eyeY + (i - 1) * eyeH * 0.7} l ${s * hw * 0.14} ${(i - 1) * hh * 0.03}`}
            />
          )),
        )}
      </g>

      {/* ---- §4.2 acne ---- */}
      {ACNE_SITES.map(([nx, ny], i) => {
        const a = clamp01(p.acneCount - i);
        if (a <= 0) return null;
        const r = hw * (0.028 + 0.022 * a);
        return (
          <g key={i} opacity={0.5 + 0.5 * a}>
            <circle cx={nx * hw * 0.82} cy={ny * hh * 0.7} r={r} fill={mix(skin, '#A8443C', 0.75)} />
            <circle cx={nx * hw * 0.82} cy={ny * hh * 0.7 - r * 0.25} r={r * 0.42} fill="#E8CFC0" opacity={a * 0.55} />
          </g>
        );
      })}

      {/* ---- §7 facial hair, §4.5 kempt or not ---- */}
      {id.facialHair.coverage > 0 && (
        <path
          d={mirrored(
            wobble(
              [
                [0, hh * (0.3 + 0.06 * id.facialHair.length)],
                [-hw * 0.5, hh * 0.3],
                [-hw * (0.82 - 0.14 * g), hh * 0.16],
                [-hw * (0.86 - 0.14 * g), hh * (0.62 + 0.28 * id.facialHair.length)],
                [-hw * 0.36, hh * (0.95 + 0.5 * id.facialHair.length)],
                [0, hh * (1.02 + 0.6 * id.facialHair.length)],
              ],
              messy * (1.5 + 4 * id.facialHair.length),
              2.3,
              3,
            ),
          )}
          fill={hair}
          opacity={id.facialHair.length < 0.15 ? 0.45 : 0.92}
        />
      )}
      {id.facialHair.moustache > 0 && (
        <path
          d={mirrored(
            wobble(
              [
                [0, mouthY - hh * 0.14],
                [-mouthW * 0.5, mouthY - hh * 0.15],
                [-mouthW * 1.15, mouthY - hh * 0.05],
                [-mouthW * 0.55, mouthY - hh * 0.06],
                [0, mouthY - hh * 0.07],
              ],
              messy * 1.6,
              2.6,
              5,
            ),
          )}
          fill={hair}
          opacity={0.9 * id.facialHair.moustache}
        />
      )}

      {/* ---- §7 hair, §4.2 thinning, §4.4 greying ---- */}
      {id.hairLength > 0.06 && (
        <g opacity={0.35 + 0.65 * density}>
          <path
            d={closedSpline(
              wobble(
                [
                  [0, -hh * (0.52 - 0.42 * recession)],
                  [-hw * 0.5, -hh * (0.56 - 0.36 * recession)],
                  [-hw * 0.9, -hh * (0.3 - 0.5 * recession)],
                  [-hw * (1.0 + 0.1 * curl), -hh * 0.62],
                  [-hw * 0.66, -hh * (1.02 + 0.06 * curl)],
                  [0, -hh * (1.06 + 0.08 * curl)],
                  [hw * 0.66, -hh * (1.02 + 0.06 * curl)],
                  [hw * (1.0 + 0.1 * curl), -hh * 0.62],
                  [hw * 0.9, -hh * (0.3 - 0.5 * recession)],
                  [hw * 0.5, -hh * (0.56 - 0.36 * recession)],
                ],
                curl * 4 + messy * 2,
                1.4,
                7,
              ),
            )}
            fill={hair}
          />
          {/* scalp showing through as it thins */}
          {p.hairThinning > 0.35 && (
            <ellipse
              cx={0}
              cy={-hh * 0.78}
              rx={hw * 0.42 * p.hairThinning}
              ry={hh * 0.2 * p.hairThinning}
              fill={skin}
              opacity={(p.hairThinning - 0.35) * 1.1}
            />
          )}
        </g>
      )}

      {/* ---- §7 glasses ---- */}
      {id.glasses && (
        <g stroke={mix('#2A2622', hair, 0.3)} strokeWidth={1.8} fill="none" opacity={0.9}>
          {[-1, 1].map((s) => (
            <rect
              key={s}
              x={s * eyeDx - eyeW * 1.3}
              y={eyeY - eyeW * 0.78}
              width={eyeW * 2.6}
              height={eyeW * 1.56}
              rx={eyeW * 0.5}
            />
          ))}
          <path d={`M ${-eyeDx + eyeW * 1.3} ${eyeY - eyeW * 0.1} L ${eyeDx - eyeW * 1.3} ${eyeY - eyeW * 0.1}`} />
          {[-1, 1].map((s) => (
            <path key={s} d={`M ${s * (eyeDx + eyeW * 1.3)} ${eyeY - eyeW * 0.3} L ${s * hw * 1.02} ${eyeY + hh * 0.06}`} />
          ))}
        </g>
      )}
    </g>
  );
}

/** Almond eye opening. Droop lowers the top; sag hoods the outer corner. */
function eyePath(s: number, dx: number, y: number, w: number, h: number, sag: number): string {
  const cx = s * dx;
  return closedSpline([
    [cx - w, y + h * 0.12],
    [cx - w * 0.1, y - h],
    [cx + w, y + h * (0.14 + 0.18 * sag * s)],
    [cx, y + h],
  ]);
}

export function headHalfHeight(id: Identity): number {
  return 74 * id.face.length;
}

export function headHalfWidth(id: Identity): number {
  return 53 * id.face.width;
}
