/**
 * §7 onboarding, as data — one question per step, in spec order. The
 * component just walks this list; adding or reordering a question never
 * touches Onboarding.tsx.
 */

import type {
  BodyFrame,
  FaceShape,
  FacialHair,
  HairLength,
  Hairline,
  HairType,
  Height,
  Presentation,
  Profile,
} from '../core/types';
import type { I18nKey } from '../i18n/en';
import { EYE_COLORS, HAIR_COLORS, SKIN_TONES } from '../visual/identity';

export type ChoiceOption = { value: string; labelKey: I18nKey };

export type OnboardingStep =
  | { kind: 'age'; key: 'currentAge'; questionKey: I18nKey; noteKey: I18nKey }
  | { kind: 'choice'; key: keyof Profile; questionKey: I18nKey; noteKey?: I18nKey; options: ChoiceOption[] }
  | { kind: 'swatch'; key: keyof Profile; questionKey: I18nKey; swatches: readonly string[] }
  | { kind: 'boolean'; key: keyof Profile; questionKey: I18nKey; options: [ChoiceOption, ChoiceOption] };

function choices<T extends string>(field: string, values: readonly T[]): ChoiceOption[] {
  return values.map((v) => ({ value: v, labelKey: `onboarding.${field}.${v}` as I18nKey }));
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { kind: 'age', key: 'currentAge', questionKey: 'onboarding.currentAge.question', noteKey: 'onboarding.currentAge.note' },
  {
    kind: 'choice',
    key: 'bodyFrame',
    questionKey: 'onboarding.bodyFrame.question',
    options: choices('bodyFrame', ['slight', 'average', 'broad'] satisfies BodyFrame[]),
  },
  {
    kind: 'choice',
    key: 'height',
    questionKey: 'onboarding.height.question',
    options: choices('height', ['short', 'average', 'tall'] satisfies Height[]),
  },
  { kind: 'swatch', key: 'skinTone', questionKey: 'onboarding.skinTone.question', swatches: SKIN_TONES },
  { kind: 'swatch', key: 'hairColor', questionKey: 'onboarding.hairColor.question', swatches: HAIR_COLORS },
  {
    kind: 'choice',
    key: 'hairType',
    questionKey: 'onboarding.hairType.question',
    options: choices('hairType', ['straight', 'wavy', 'curly', 'coily'] satisfies HairType[]),
  },
  {
    kind: 'choice',
    key: 'hairLength',
    questionKey: 'onboarding.hairLength.question',
    options: choices('hairLength', ['shaved', 'short', 'medium', 'long'] satisfies HairLength[]),
  },
  {
    kind: 'choice',
    key: 'hairline',
    questionKey: 'onboarding.hairline.question',
    options: choices('hairline', ['full', 'slight', 'receding', 'baldCrown'] satisfies Hairline[]),
  },
  {
    kind: 'choice',
    key: 'facialHair',
    questionKey: 'onboarding.facialHair.question',
    options: choices('facialHair', ['none', 'stubble', 'shortBeard', 'fullBeard', 'moustache'] satisfies FacialHair[]),
  },
  { kind: 'swatch', key: 'eyeColor', questionKey: 'onboarding.eyeColor.question', swatches: EYE_COLORS },
  {
    kind: 'boolean',
    key: 'glasses',
    questionKey: 'onboarding.glasses.question',
    options: [
      { value: 'false', labelKey: 'onboarding.glasses.none' },
      { value: 'true', labelKey: 'onboarding.glasses.glasses' },
    ],
  },
  {
    kind: 'choice',
    key: 'faceShape',
    questionKey: 'onboarding.faceShape.question',
    options: choices('faceShape', ['oval', 'round', 'square', 'long'] satisfies FaceShape[]),
  },
  {
    kind: 'choice',
    key: 'presentation',
    questionKey: 'onboarding.presentation.question',
    noteKey: 'onboarding.presentation.note',
    options: choices('presentation', ['masculine', 'feminine', 'neutral'] satisfies Presentation[]),
  },
] as const;

export const DEFAULT_DRAFT: Profile = {
  currentAge: 30,
  bodyFrame: 'average',
  height: 'average',
  skinTone: 2,
  hairColor: 1,
  hairType: 'straight',
  hairLength: 'short',
  hairline: 'full',
  facialHair: 'none',
  eyeColor: 0,
  glasses: false,
  faceShape: 'oval',
  presentation: 'neutral',
};
