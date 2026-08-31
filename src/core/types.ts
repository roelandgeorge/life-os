import type { DateKey } from './dates';
import type { DomainKey, DomainScores, DomainTicks } from './domains';

/** §5 data model. */

export type DayLog = {
  date: DateKey;
  /** false = the app was never opened that day, so it is eligible for amnesty (§2.2). */
  opened: boolean;
  ticks: DomainTicks;
};

export type DomainState = {
  key: DomainKey;
  /** 0..100 */
  score: number;
};

export type BodyFrame = 'slight' | 'average' | 'broad';
export type Height = 'short' | 'average' | 'tall';
export type HairType = 'straight' | 'wavy' | 'curly' | 'coily';
export type HairLength = 'shaved' | 'short' | 'medium' | 'long';
export type Hairline = 'full' | 'slight' | 'receding' | 'baldCrown';
export type FacialHair = 'none' | 'stubble' | 'shortBeard' | 'fullBeard' | 'moustache';
export type FaceShape = 'oval' | 'round' | 'square' | 'long';
export type Presentation = 'masculine' | 'feminine' | 'neutral';

/**
 * Fixed identity (§7). Scores never touch any of this — the person in the
 * picture must stay the same person across every state.
 */
export type Profile = {
  currentAge: number;
  bodyFrame: BodyFrame;
  height: Height;
  /** Index into the 6-step swatch scales from §7. */
  skinTone: number;
  hairColor: number;
  hairType: HairType;
  hairLength: HairLength;
  hairline: Hairline;
  facialHair: FacialHair;
  eyeColor: number;
  glasses: boolean;
  faceShape: FaceShape;
  presentation: Presentation;
};

export type AppState = {
  profile: Profile;
  domains: DomainState[];
  /** Append-only, sorted by date ascending, capped at 400 days (§5). */
  logs: DayLog[];
  /**
   * Last day whose EWMA update has been applied. Initialised to the day before
   * the first log so that day 1 evaluates at the day-1 → day-2 rollover (§2.3).
   */
  lastEvaluatedDate: DateKey;
  /**
   * §6 settings — evening notification time, "HH:mm" local, or `null` for
   * off. Optional so every AppState literal written before step 7 still
   * type-checks; app code always reads it as `?? null`. Step 8 is what makes
   * this actually schedule a notification.
   */
  notificationTime?: string | null;
};

/** Everything the UI needs for one moment in time. Derived, never persisted. */
export type Projection = {
  /** Persisted end-of-yesterday scores. */
  scores: DomainScores;
  /** Display scores: yesterday's, advanced one step by today's ticks (§2.7). */
  preview: DomainScores;
  body: number;
  fullDay: boolean;
  warmup: boolean;
  daysOfHistory: number;
  projectionAge: number;
};
