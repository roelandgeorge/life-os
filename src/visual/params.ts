/**
 * The §4 visual parameter system.
 *
 * This module is the contract between the scoring engine and the renderer.
 * The renderer takes an `AvatarParams` and never sees a score; `deriveParams`
 * takes scores and never sees SVG. That split is what makes §9's requirement
 * — "every parameter must be independently drivable before any of them is
 * connected to a score" — structural rather than a promise.
 *
 * ---------------------------------------------------------------------------
 * Three decisions worth stating, all consequences of "no discrete states".
 *
 * 1. TIERS ARE CONTINUOUS POSITIONS, NOT INDICES.
 *    §4.6 requires a ±8-point crossfade around every boundary. A parameter that
 *    resolves to "tier 2" cannot express being 40% of the way into tier 2, so
 *    `backgroundTier` is a real number in [0,3] and the renderer turns it into
 *    opacity weights via `blendWeights`. One slider still drives it, and every
 *    value between the extremes renders.
 *
 * 2. `acneCount` STAYS FRACTIONAL HERE.
 *    §4.2 writes `round(12 * ...)`. Rounding at derive time would make a lesion
 *    pop into existence the moment a score crosses .5 — a visible discontinuity
 *    in the one place the app is asking to be believed. The count is carried
 *    continuously and the renderer fades the fractional lesion in. The rounding
 *    is a drawing concern, not a model concern.
 *
 * 3. FULL DAY IS ITS OWN PARAMETER, NOT A MODIFIER ON `ambientLight`.
 *    §4.7 calls the rim light and warm shift "additive and independent of the
 *    underlying scores". Folding them into `ambientLight` would make that
 *    parameter mean two things and stop the debug slider from isolating either.
 * ---------------------------------------------------------------------------
 */

import type { DomainKey, DomainScores } from '../core/domains';
import { clamp, clamp01, smoothstep } from '../core/math';

// ---------------------------------------------------------------------------
// Tier helpers (§4.6)
// ---------------------------------------------------------------------------

/** Half-width of the crossfade band around a tier boundary, in score points. */
export const TIER_BAND = 8;

/**
 * A 0..100 score to a continuous position in [0, boundaries.length].
 * At a boundary the position is exactly .5, so the two tiers are equally
 * present — there is no score at which one more tick flips the room.
 */
export function tierPosition(
  score: number,
  boundaries: readonly number[],
  band: number = TIER_BAND,
): number {
  let pos = 0;
  for (const b of boundaries) pos += smoothstep(b - band, b + band, score);
  return pos;
}

/**
 * A continuous tier position to per-tier opacity weights summing to 1.
 * At most two are non-zero, so the renderer only ever composites two layers.
 */
export function blendWeights(pos: number, tierCount: number): number[] {
  const p = clamp(pos, 0, tierCount - 1);
  const lo = Math.min(Math.floor(p), tierCount - 1);
  const hi = Math.min(lo + 1, tierCount - 1);
  const t = p - lo;

  const w = new Array<number>(tierCount).fill(0);
  w[lo] = (w[lo] as number) + (1 - t);
  w[hi] = (w[hi] as number) + t;
  return w;
}

/** §4.6 tier boundaries, on the 0..100 score scale. */
export const BACKGROUND_BOUNDARIES = [25, 50, 75] as const; // flat · modest · house · villa
export const VEHICLE_BOUNDARIES = [30, 60, 85] as const; // none · old · decent · premium
export const PARTNER_BOUNDARIES = [30, 60] as const; // absent · distant · close

// ---------------------------------------------------------------------------
// The parameter list
// ---------------------------------------------------------------------------

export const PARAM_KEYS = [
  // §4.1 SLEEP — face and light
  'eyeBagDepth',
  'scleraRedness',
  'eyelidDroop',
  'skinGreyness',
  'ambientLight',
  // §4.2 FOOD — mass and decay
  'gauntness',
  'skinToneHealth',
  'toothStain',
  'acneCount',
  'hairThinning',
  // §4.3 SPORT — build and posture
  'muscleMass',
  'shoulderWidth',
  'postureUpright',
  // §4.4 aging overlay — BODY
  'wrinkleDepth',
  'skinSag',
  'hairGrey',
  // §4.5 ORDER — clothing and room
  'clothingCondition',
  'groomingNeatness',
  'roomTidiness',
  // §4.6 environment
  'partnerPresence',
  'partnerDistance',
  'backgroundTier',
  'vehicleTier',
  'shelfFill',
  // §4.7 Full Day
  'rimLight',
  'ambientWarmth',
] as const;

export type ParamKey = (typeof PARAM_KEYS)[number];
export type AvatarParams = Record<ParamKey, number>;

export type ParamGroup =
  | 'faceAndLight'
  | 'massAndDecay'
  | 'buildAndPosture'
  | 'aging'
  | 'clothingAndRoom'
  | 'environment'
  | 'fullDay';

/** What drives a parameter. Composite sources are not domain keys. */
export type ParamSource = DomainKey | 'BODY' | 'FULL_DAY';

export interface ParamSpec {
  key: ParamKey;
  group: ParamGroup;
  /** Renderable range. [0,1] unless the parameter counts something. */
  min: number;
  max: number;
  /** The §4 formula, verbatim, shown next to the slider on the debug screen. */
  formula: string;
  /** §4's own words for the extremes — the renderer's acceptance criteria. */
  atMin: string;
  atMax: string;
  drivenBy: readonly ParamSource[];
  /** Number of discrete artwork layers to crossfade between, if any. */
  tiers?: number;
}

export const PARAM_SPECS: readonly ParamSpec[] = [
  // §4.1 ---------------------------------------------------------------------
  {
    key: 'eyeBagDepth',
    group: 'faceAndLight',
    min: 0,
    max: 1,
    formula: '1 - s_sleep',
    atMax: 'heavy dark hollows',
    atMin: 'none',
    drivenBy: ['SLEEP'],
  },
  {
    key: 'scleraRedness',
    group: 'faceAndLight',
    min: 0,
    max: 1,
    formula: '1 - s_sleep',
    atMax: 'bloodshot',
    atMin: 'clear',
    drivenBy: ['SLEEP'],
  },
  {
    key: 'eyelidDroop',
    group: 'faceAndLight',
    min: 0,
    max: 0.8,
    formula: '0.8 * (1 - s_sleep)',
    atMax: 'half-closed',
    atMin: 'open, alert',
    drivenBy: ['SLEEP'],
  },
  {
    key: 'skinGreyness',
    group: 'faceAndLight',
    min: 0,
    max: 1,
    formula: '1 - s_sleep',
    atMax: 'ashen, waxy',
    atMin: 'warm',
    drivenBy: ['SLEEP'],
  },
  {
    key: 'ambientLight',
    group: 'faceAndLight',
    min: 0.25,
    max: 1,
    formula: '0.25 + 0.75 * s_sleep',
    atMin: 'dim, flat, cold',
    atMax: 'bright, warm',
    drivenBy: ['SLEEP'],
  },

  // §4.2 ---------------------------------------------------------------------
  {
    key: 'gauntness',
    group: 'massAndDecay',
    min: 0,
    max: 1,
    formula: '1 - s_food',
    atMax: 'hollow cheeks, sunken temples, visible ribs',
    atMin: 'full face',
    drivenBy: ['FOOD'],
  },
  {
    key: 'skinToneHealth',
    group: 'massAndDecay',
    min: 0,
    max: 1,
    formula: 's_food',
    atMin: 'sallow, yellowish',
    atMax: 'healthy',
    drivenBy: ['FOOD'],
  },
  {
    key: 'toothStain',
    group: 'massAndDecay',
    min: 0,
    max: 1,
    formula: '1 - s_food',
    atMax: 'brown, gapped, one missing',
    atMin: 'white, even',
    drivenBy: ['FOOD'],
  },
  {
    key: 'acneCount',
    group: 'massAndDecay',
    min: 0,
    max: 12,
    formula: '12 * (0.6*(1 - s_food) + 0.4*(1 - s_sleep))',
    atMax: '~12 lesions, cystic',
    atMin: '0',
    drivenBy: ['FOOD', 'SLEEP'],
  },
  {
    key: 'hairThinning',
    group: 'massAndDecay',
    min: 0,
    max: 1,
    formula: '1 - (0.5*s_food + 0.5*s_sleep)',
    atMax: 'receded crown, patchy scalp',
    atMin: 'full',
    drivenBy: ['FOOD', 'SLEEP'],
  },

  // §4.3 ---------------------------------------------------------------------
  {
    key: 'muscleMass',
    group: 'buildAndPosture',
    min: 0,
    max: 1,
    formula: 'effectiveMuscle = s_sport * (0.4 + 0.6 * s_food)',
    atMin: 'thin, no definition',
    atMax: 'broad, defined',
    drivenBy: ['SPORT', 'FOOD'],
  },
  {
    key: 'shoulderWidth',
    group: 'buildAndPosture',
    min: 0.75,
    max: 1,
    formula: '0.75 + 0.25 * effectiveMuscle',
    atMin: 'narrow, sloped',
    atMax: 'wide, square',
    drivenBy: ['SPORT', 'FOOD'],
  },
  {
    key: 'postureUpright',
    group: 'buildAndPosture',
    min: 0,
    max: 1,
    formula: '0.5*s_sport + 0.5*s_sleep',
    atMin: 'hunched, head forward, curved spine',
    atMax: 'tall, open chest',
    drivenBy: ['SPORT', 'SLEEP'],
  },

  // §4.4 ---------------------------------------------------------------------
  {
    key: 'wrinkleDepth',
    group: 'aging',
    min: 0.2,
    max: 1,
    formula: '0.2 + 0.8 * (1 - body)',
    atMin: 'lines a 50-year-old has regardless',
    atMax: 'deep, everywhere',
    drivenBy: ['BODY'],
  },
  {
    key: 'skinSag',
    group: 'aging',
    min: 0.15,
    max: 1,
    formula: '0.15 + 0.85 * (1 - body)',
    atMin: 'slight',
    atMax: 'jowls, hooded lids',
    drivenBy: ['BODY'],
  },
  {
    key: 'hairGrey',
    group: 'aging',
    min: 0.3,
    max: 1,
    formula: '0.3 + 0.7 * (1 - body)',
    atMin: 'greying at the temples',
    atMax: 'white',
    drivenBy: ['BODY'],
  },

  // §4.5 ---------------------------------------------------------------------
  {
    key: 'clothingCondition',
    group: 'clothingAndRoom',
    min: 0,
    max: 1,
    formula: 's_order',
    atMin: 'stained, frayed collar, missing button, ill-fitting',
    atMax: 'clean, pressed, fitted',
    drivenBy: ['ORDER'],
  },
  {
    key: 'groomingNeatness',
    group: 'clothingAndRoom',
    min: 0,
    max: 1,
    formula: 's_order',
    atMin: 'unkempt beard, greasy hair, overgrown nails',
    atMax: 'groomed',
    drivenBy: ['ORDER'],
  },
  {
    key: 'roomTidiness',
    group: 'clothingAndRoom',
    min: 0,
    max: 1,
    formula: 's_order',
    atMin: 'clutter on the floor, peeling paint, crooked frames',
    atMax: 'ordered, straight lines',
    drivenBy: ['ORDER'],
  },

  // §4.6 ---------------------------------------------------------------------
  {
    key: 'partnerPresence',
    group: 'environment',
    min: 0,
    max: 2,
    formula: 'tierPosition(S_relationship, [30, 60])',
    atMin: 'absent',
    atMax: 'close, oriented toward the figure',
    drivenBy: ['RELATIONSHIP'],
    tiers: 3,
  },
  {
    key: 'partnerDistance',
    group: 'environment',
    min: 0,
    max: 1,
    formula: '1 - s_relationship',
    atMin: 'beside the figure',
    atMax: 'at the far edge of the frame',
    drivenBy: ['RELATIONSHIP'],
  },
  {
    key: 'backgroundTier',
    group: 'environment',
    min: 0,
    max: 3,
    formula: 'tierPosition(S_income, [25, 50, 75])',
    atMin: 'cramped flat',
    atMax: 'villa',
    drivenBy: ['INCOME'],
    tiers: 4,
  },
  {
    key: 'vehicleTier',
    group: 'environment',
    min: 0,
    max: 3,
    formula: 'tierPosition(S_income, [30, 60, 85])',
    atMin: 'none',
    atMax: 'premium',
    drivenBy: ['INCOME'],
    tiers: 4,
  },
  {
    key: 'shelfFill',
    group: 'environment',
    min: 0,
    max: 1,
    formula: 's_mind',
    atMin: 'empty and dusty',
    atMax: 'full, lit workspace',
    drivenBy: ['MIND'],
  },

  // §4.7 ---------------------------------------------------------------------
  {
    key: 'rimLight',
    group: 'fullDay',
    min: 0,
    max: 1,
    formula: 'fullDay(t) ? 1 : 0',
    atMin: 'none',
    atMax: 'rim light on the figure',
    drivenBy: ['FULL_DAY'],
  },
  {
    key: 'ambientWarmth',
    group: 'fullDay',
    min: 0,
    max: 1,
    formula: 'fullDay(t) ? 1 : 0',
    atMin: 'neutral',
    atMax: 'warm shift, additive over ambientLight',
    drivenBy: ['FULL_DAY'],
  },
];

const SPEC_BY_KEY = new Map<ParamKey, ParamSpec>(PARAM_SPECS.map((s) => [s.key, s]));

export function getParamSpec(key: ParamKey): ParamSpec {
  const s = SPEC_BY_KEY.get(key);
  if (!s) throw new Error(`Unknown parameter: ${key}`);
  return s;
}

export const PARAM_GROUPS: readonly ParamGroup[] = [
  'faceAndLight',
  'massAndDecay',
  'buildAndPosture',
  'aging',
  'clothingAndRoom',
  'environment',
  'fullDay',
];

// ---------------------------------------------------------------------------
// Derivation (§4)
// ---------------------------------------------------------------------------

/**
 * §4.3 — muscle is gated by food. Training without eating cannot produce a
 * built figure, and the model has to teach that rather than contradict it.
 */
export function effectiveMuscle(sSport: number, sFood: number): number {
  return sSport * (0.4 + 0.6 * sFood);
}

export type DeriveOptions = {
  /** §2.6 — drives the §4.7 additive state. */
  fullDay?: boolean;
};

/**
 * Scores (0..100) and BODY (0..100) to the full parameter set.
 * Pure. The only input the renderer is allowed to have.
 */
export function deriveParams(
  scores: DomainScores,
  body: number,
  { fullDay = false }: DeriveOptions = {},
): AvatarParams {
  const s = (k: DomainKey) => clamp01(scores[k] / 100);
  const sSleep = s('SLEEP');
  const sFood = s('FOOD');
  const sSport = s('SPORT');
  const sOrder = s('ORDER');
  const sRel = s('RELATIONSHIP');
  const sMind = s('MIND');
  const b = clamp01(body / 100);

  const muscle = effectiveMuscle(sSport, sFood);

  return {
    eyeBagDepth: 1 - sSleep,
    scleraRedness: 1 - sSleep,
    eyelidDroop: 0.8 * (1 - sSleep),
    skinGreyness: 1 - sSleep,
    ambientLight: 0.25 + 0.75 * sSleep,

    gauntness: 1 - sFood,
    skinToneHealth: sFood,
    toothStain: 1 - sFood,
    acneCount: 12 * (0.6 * (1 - sFood) + 0.4 * (1 - sSleep)),
    hairThinning: 1 - (0.5 * sFood + 0.5 * sSleep),

    muscleMass: muscle,
    shoulderWidth: 0.75 + 0.25 * muscle,
    postureUpright: 0.5 * sSport + 0.5 * sSleep,

    wrinkleDepth: 0.2 + 0.8 * (1 - b),
    skinSag: 0.15 + 0.85 * (1 - b),
    hairGrey: 0.3 + 0.7 * (1 - b),

    clothingCondition: sOrder,
    groomingNeatness: sOrder,
    roomTidiness: sOrder,

    partnerPresence: tierPosition(scores.RELATIONSHIP, PARTNER_BOUNDARIES),
    partnerDistance: 1 - sRel,
    backgroundTier: tierPosition(scores.INCOME, BACKGROUND_BOUNDARIES),
    vehicleTier: tierPosition(scores.INCOME, VEHICLE_BOUNDARIES),
    shelfFill: sMind,

    rimLight: fullDay ? 1 : 0,
    ambientWarmth: fullDay ? 1 : 0,
  };
}

/** Midpoint of every parameter's range. The debug screen's reset position. */
export function midParams(): AvatarParams {
  const out = {} as AvatarParams;
  for (const spec of PARAM_SPECS) out[spec.key] = (spec.min + spec.max) / 2;
  return out;
}

/** Per-parameter linear interpolation, for the §2.7 ~600 ms tick animation. */
export function lerpParams(a: AvatarParams, b: AvatarParams, t: number): AvatarParams {
  const out = {} as AvatarParams;
  for (const key of PARAM_KEYS) out[key] = (a[key] as number) + (b[key] - a[key]) * t;
  return out;
}
