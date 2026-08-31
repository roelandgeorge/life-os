/**
 * §4.6 RELATIONSHIP. Three tiers, crossfaded: absent, present but turned away,
 * close and oriented toward the figure.
 *
 * The middle tier is the one that has to land. Someone in the room whose back
 * is to you is a different statement from an empty room, and the difference is
 * orientation, not distance — `partnerDistance` moves them, the tier turns them.
 */

import { lerp } from '../../core/math';
import { mix } from '../color';
import { mirrored, openSpline } from '../path';
import type { AvatarParams } from '../params';
import { FLOOR_Y } from './Scene';
import { Layered } from './Layered';

export function Partner({ p, light }: { p: AvatarParams; light: number }) {
  // Distance is horizontal offset from the figure toward the frame edge (§4.6).
  const x = lerp(292, 374, p.partnerDistance);
  const skin = mix('#C08F6C', '#171B22', (1 - light) * 0.45);
  const hair = mix('#3A2C22', '#171B22', (1 - light) * 0.45);

  return (
    <Layered pos={p.partnerPresence} count={3}>
      {(tier) => {
        if (tier === 0) return null;
        const facing = tier === 2;
        const cloth = mix(facing ? '#7A5286' : '#4E4A52', '#171B22', (1 - light) * 0.45);
        const headY = 236;

        return (
          <g transform={`translate(${x} 0)`}>
            {/* torso */}
            <path
              d={mirrored(
                [
                  [-13, headY + 26],
                  [-33, headY + 52],
                  [-38, FLOOR_Y - 10],
                  [-34, FLOOR_Y + 60],
                ],
                0,
              )}
              fill={cloth}
            />
            {/* head */}
            <ellipse cx={0} cy={headY} rx={22} ry={26} fill={skin} />
            {/* hair: from behind it covers the whole skull, from the front only the crown */}
            <path
              d={
                facing
                  ? mirrored([
                      [0, headY - 28],
                      [-16, headY - 26],
                      [-23, headY - 4],
                      [-21, headY + 6],
                    ])
                  : mirrored([
                      [0, headY - 30],
                      [-18, headY - 24],
                      [-24, headY + 6],
                      [-19, headY + 24],
                      [0, headY + 28],
                    ])
              }
              fill={hair}
            />
            {/* a face only when they are turned toward the figure */}
            {facing && (
              <g fill={mix(skin, '#2A1D16', 0.7)}>
                <ellipse cx={-8} cy={headY + 1} rx={2.6} ry={2.2} />
                <ellipse cx={8} cy={headY + 1} rx={2.6} ry={2.2} />
                <path
                  d={openSpline([
                    [-7, headY + 13],
                    [0, headY + 15],
                    [7, headY + 13],
                  ])}
                  stroke={mix(skin, '#2A1D16', 0.55)}
                  strokeWidth={1.6}
                  fill="none"
                />
              </g>
            )}
          </g>
        );
      }}
    </Layered>
  );
}
