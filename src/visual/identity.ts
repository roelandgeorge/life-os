/**
 * §7 fixed identity, resolved into drawing constants.
 *
 * Nothing in this file reads a score, and nothing in `params.ts` reads a
 * profile. That is the whole mechanism behind §7's requirement that "the person
 * in the picture must stay the same person across every state" — the two inputs
 * meet only in the renderer, where identity sets base geometry and palette and
 * the parameters modulate them.
 *
 * The division is not always obvious, so the rule: if a stranger could tell it
 * about you from a photograph on your best day, it is identity. Whether you
 * have a beard is identity; whether it is trimmed is ORDER. How long your hair
 * is, is identity; whether it is greasy is ORDER; whether it is thinning is
 * FOOD and SLEEP.
 */

import { clamp01 } from '../core/math';
import type { Profile } from '../core/types';
import { mix } from './color';

/** §7 six-step swatch scales. Indices are stored in `Profile`, not colours. */
export const SKIN_TONES = ['#F4D9C4', '#E9BE9B', '#D29C74', '#B0784E', '#875433', '#583520'];
export const HAIR_COLORS = [
  '#1A1513', // black
  '#38281E', // dark brown
  '#6A492E', // brown
  '#9A5F2C', // auburn
  '#C9A85F', // blond
  '#A63B1F', // red
  '#C6C3BE', // grey
];
export const EYE_COLORS = ['#4A2C17', '#7C5C2C', '#4C7A48', '#3E6C8F', '#6C7880'];

function pick<T>(list: readonly T[], i: number, fallback: T): T {
  return list[Math.max(0, Math.min(list.length - 1, Math.round(i)))] ?? fallback;
}

/**
 * Face shape as three multipliers rather than four named outlines, so the
 * shapes sit on a continuum and `gauntness` and `skinSag` can push along the
 * same axes instead of fighting a fixed silhouette.
 */
const FACE_SHAPES = {
  oval: { width: 1.0, length: 1.0, jaw: 0.2 },
  round: { width: 1.12, length: 0.9, jaw: 0.08 },
  square: { width: 1.06, length: 0.94, jaw: 0.85 },
  long: { width: 0.9, length: 1.14, jaw: 0.35 },
} as const;

const FRAMES = { slight: 0.15, average: 0.5, broad: 0.9 } as const;
const HEIGHTS = { short: 0.95, average: 1.0, tall: 1.05 } as const;

/** §7 presentation drives the base silhouette, nothing else. */
const PRESENTATION = {
  masculine: { shoulder: 1.0, waist: 0.78, chest: 0.0, jawStrength: 1.0, browHeight: 0.0 },
  feminine: { shoulder: 0.85, waist: 0.7, chest: 1.0, jawStrength: 0.72, browHeight: 1.0 },
  neutral: { shoulder: 0.93, waist: 0.74, chest: 0.35, jawStrength: 0.86, browHeight: 0.5 },
} as const;

const HAIR_LENGTHS = { shaved: 0.04, short: 0.22, medium: 0.55, long: 1.0 } as const;
const HAIR_CURL = { straight: 0.0, wavy: 0.35, curly: 0.7, coily: 1.0 } as const;
const HAIRLINES = { full: 0.0, slight: 0.25, receding: 0.55, baldCrown: 0.85 } as const;

/** Coverage is where it grows; length is how far it grows. */
const FACIAL_HAIR = {
  none: { coverage: 0, length: 0, moustache: 0 },
  stubble: { coverage: 1, length: 0.08, moustache: 0.6 },
  shortBeard: { coverage: 1, length: 0.35, moustache: 1 },
  fullBeard: { coverage: 1, length: 0.8, moustache: 1 },
  moustache: { coverage: 0, length: 0, moustache: 1 },
} as const;

export interface Identity {
  skin: string;
  skinShadow: string;
  skinLight: string;
  hair: string;
  eye: string;

  face: { width: number; length: number; jaw: number };
  /** 0 slight … 1 broad. */
  frame: number;
  heightScale: number;
  shoulder: number;
  waist: number;
  chest: number;
  jawStrength: number;
  browHeight: number;

  hairLength: number;
  hairCurl: number;
  /** Baseline recession before FOOD and SLEEP add any (§4.2 `hairThinning`). */
  hairlineRecession: number;
  facialHair: { coverage: number; length: number; moustache: number };
  glasses: boolean;

  projectionAge: number;
}

export function resolveIdentity(p: Profile): Identity {
  const skin = pick(SKIN_TONES, p.skinTone, SKIN_TONES[2] as string);
  const pres = PRESENTATION[p.presentation] ?? PRESENTATION.neutral;

  return {
    skin,
    skinShadow: mix(skin, '#3A2418', 0.34),
    skinLight: mix(skin, '#FFF3E4', 0.3),
    hair: pick(HAIR_COLORS, p.hairColor, HAIR_COLORS[1] as string),
    eye: pick(EYE_COLORS, p.eyeColor, EYE_COLORS[0] as string),

    face: FACE_SHAPES[p.faceShape] ?? FACE_SHAPES.oval,
    frame: FRAMES[p.bodyFrame] ?? FRAMES.average,
    heightScale: HEIGHTS[p.height] ?? HEIGHTS.average,
    shoulder: pres.shoulder,
    waist: pres.waist,
    chest: pres.chest,
    jawStrength: pres.jawStrength,
    browHeight: pres.browHeight,

    hairLength: HAIR_LENGTHS[p.hairLength] ?? HAIR_LENGTHS.short,
    hairCurl: HAIR_CURL[p.hairType] ?? 0,
    hairlineRecession: HAIRLINES[p.hairline] ?? 0,
    facialHair: FACIAL_HAIR[p.facialHair] ?? FACIAL_HAIR.none,
    glasses: p.glasses === true,

    // §3 — the horizon is fixed and the projection is always +15.
    projectionAge: p.currentAge + 15,
  };
}

/**
 * The skin actually drawn: identity tone, pushed toward sallow by FOOD and
 * toward ashen by SLEEP (§4.1, §4.2). Both apply — they are different failures
 * and the picture should be able to show either alone.
 */
export function skinColor(id: Identity, skinToneHealth: number, skinGreyness: number): string {
  const sallow = mix(id.skin, '#C2B172', 0.55);
  const ashen = mix(id.skin, '#9E9A96', 0.7);
  return mix(mix(id.skin, sallow, clamp01(1 - skinToneHealth)), ashen, clamp01(skinGreyness) * 0.8);
}

/** §4.4 — greying is an aging overlay on the identity colour, not a swap. */
export function hairColor(id: Identity, hairGrey: number): string {
  return mix(id.hair, '#D6D3CE', clamp01(hairGrey) * 0.7);
}
