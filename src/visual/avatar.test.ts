/**
 * The §9 acceptance criterion for step 3, and the §7 one, as tests rather than
 * promises:
 *
 *   §9 "Every parameter must be independently drivable."
 *   §7 "The person in the picture must stay the same person across every state."
 *
 * The second is the harder claim and is checked from both sides: identity has
 * to change the picture, and scores must not be able to change identity.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { uniformScores } from '../core/domains';
import type { Profile } from '../core/types';
import { Avatar } from './Avatar';
import { resolveIdentity } from './identity';
import { deriveParams, PARAM_SPECS, type AvatarParams } from './params';

const PROFILE: Profile = {
  currentAge: 35,
  bodyFrame: 'average',
  height: 'average',
  skinTone: 2,
  hairColor: 1,
  hairType: 'straight',
  hairLength: 'short',
  hairline: 'full',
  facialHair: 'stubble',
  eyeColor: 0,
  glasses: false,
  faceShape: 'oval',
  presentation: 'masculine',
};

/** Every §7 field, with a value that differs from PROFILE. */
const IDENTITY_VARIANTS: Partial<Profile>[] = [
  { currentAge: 60 },
  { bodyFrame: 'broad' },
  { height: 'tall' },
  { skinTone: 5 },
  { hairColor: 4 },
  { hairType: 'coily' },
  { hairLength: 'long' },
  { hairline: 'baldCrown' },
  { facialHair: 'fullBeard' },
  { eyeColor: 3 },
  { glasses: true },
  { faceShape: 'long' },
  { presentation: 'feminine' },
];

const MID = deriveParams(uniformScores(50), 50);

function render(params: AvatarParams, profile: Profile = PROFILE): string {
  return renderToStaticMarkup(createElement(Avatar, { profile, params }));
}

describe('the avatar', () => {
  it('renders across the whole score range without throwing', () => {
    for (let v = 0; v <= 100; v += 10) {
      expect(render(deriveParams(uniformScores(v), v, { fullDay: v > 50 }))).toContain('<svg');
    }
  });

  it('renders for every identity variant', () => {
    for (const v of IDENTITY_VARIANTS) {
      expect(render(MID, { ...PROFILE, ...v })).toContain('<svg');
    }
  });

  it('emits no NaN, undefined or Infinity in any attribute', () => {
    const cases: AvatarParams[] = [MID];
    for (const spec of PARAM_SPECS) {
      cases.push({ ...MID, [spec.key]: spec.min }, { ...MID, [spec.key]: spec.max });
    }
    for (const params of cases) {
      for (const v of IDENTITY_VARIANTS) {
        expect(render(params, { ...PROFILE, ...v })).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });

  it('§9 — changes visibly when any single parameter moves on its own', () => {
    const base = render(MID);
    for (const spec of PARAM_SPECS) {
      const low = render({ ...MID, [spec.key]: spec.min });
      const high = render({ ...MID, [spec.key]: spec.max });
      expect(low !== base || high !== base, `${spec.key} drives nothing`).toBe(true);
      expect(low, `${spec.key} has no visible range`).not.toBe(high);
    }
  });

  it('§7 — every identity field changes the picture', () => {
    const base = render(MID);
    for (const v of IDENTITY_VARIANTS) {
      expect(render(MID, { ...PROFILE, ...v }), Object.keys(v)[0]).not.toBe(base);
    }
  });

  it('§7 — no score can alter the resolved identity', () => {
    // The load-bearing separation: `resolveIdentity` takes a Profile and nothing
    // else, so there is no path by which a domain score reaches it. If this ever
    // needs a score argument, the projection has stopped being the same person.
    const identity = resolveIdentity(PROFILE);
    expect(resolveIdentity({ ...PROFILE })).toEqual(identity);
    expect(resolveIdentity.length).toBe(1);
  });

  it('§3 — renders exactly one figure, never an idealised comparison', () => {
    // Two <svg> roots, or a duplicated head group, would mean a second person.
    const svg = render(deriveParams(uniformScores(100), 100));
    expect(svg.match(/<svg/g)?.length).toBe(1);
  });
});

describe('identity survives the extremes', () => {
  it('keeps face geometry keyed to the profile at every score', () => {
    // A long face must still be longer than a round one when both are starving.
    const longFace = resolveIdentity({ ...PROFILE, faceShape: 'long' });
    const roundFace = resolveIdentity({ ...PROFILE, faceShape: 'round' });

    expect(longFace.face.length).toBeGreaterThan(roundFace.face.length);
    expect(roundFace.face.width).toBeGreaterThan(longFace.face.width);

    for (const v of [0, 50, 100]) {
      const params = deriveParams(uniformScores(v), v);
      expect(render(params, { ...PROFILE, faceShape: 'long' })).not.toBe(
        render(params, { ...PROFILE, faceShape: 'round' }),
      );
    }
  });

  it('never lets greying erase the identity hair colour entirely', () => {
    // §4.4 greys toward white but must not converge every profile on one head.
    const blond = resolveIdentity({ ...PROFILE, hairColor: 4 });
    const black = resolveIdentity({ ...PROFILE, hairColor: 0 });
    const grey = deriveParams(uniformScores(0), 0); // hairGrey at its maximum

    expect(render(grey, { ...PROFILE, hairColor: 4 })).not.toBe(
      render(grey, { ...PROFILE, hairColor: 0 }),
    );
    expect(blond.hair).not.toBe(black.hair);
  });
});
