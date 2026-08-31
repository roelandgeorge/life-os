/**
 * Renders sample states to SVG on disk. Opt-in — it writes files, so it stays
 * out of the normal test run:
 *
 *   RENDER_OUT=./out npx vitest run src/visual/_render.test.ts
 *
 * Kept because the avatar is the one part of this project that cannot be
 * verified by assertion. The tests prove every parameter changes *something*;
 * only looking proves it changed something that reads as a person.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it } from 'vitest';
import { uniformScores } from '../core/domains';
import { computeBody } from '../core/scoring';
import type { Profile } from '../core/types';
import { Avatar } from './Avatar';
import { deriveParams } from './params';

const OUT = process.env.RENDER_OUT;

const BASE: Profile = {
  currentAge: 35, bodyFrame: 'average', height: 'average', skinTone: 2, hairColor: 1,
  hairType: 'straight', hairLength: 'short', hairline: 'full', facialHair: 'stubble',
  eyeColor: 0, glasses: false, faceShape: 'oval', presentation: 'masculine',
};

const CASES: [name: string, score: number, profile: Partial<Profile>, fullDay: boolean][] = [
  ['00-collapsed', 5, {}, false],
  ['01-low', 30, {}, false],
  ['02-mid', 50, {}, false],
  ['03-good', 78, {}, false],
  ['04-thriving', 97, {}, true],
  ['05-alt-identity', 60, {
    presentation: 'feminine', hairLength: 'long', hairType: 'curly', skinTone: 4,
    hairColor: 5, glasses: true, faceShape: 'round', facialHair: 'none',
  }, false],
];

it.skipIf(!OUT)('renders sample states to disk', () => {
  mkdirSync(OUT as string, { recursive: true });
  for (const [name, score, profile, fullDay] of CASES) {
    const scores = uniformScores(score);
    const params = deriveParams(scores, computeBody(scores), { fullDay });
    const svg = renderToStaticMarkup(
      createElement(Avatar, { profile: { ...BASE, ...profile }, params }),
    );
    writeFileSync(`${OUT}/${name}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`);
  }
});
