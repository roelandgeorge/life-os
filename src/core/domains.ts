/**
 * Domains are data, not code (§1).
 *
 * Everything downstream — scoring, visual mapping, the check-in list — iterates
 * this array. Adding an eighth domain must never require editing the engine.
 */

export type DomainKey =
  | 'SLEEP'
  | 'FOOD'
  | 'SPORT'
  | 'ORDER'
  | 'RELATIONSHIP'
  | 'MIND'
  | 'INCOME';

export interface DomainConfig {
  key: DomainKey;
  /** i18n key into src/i18n/en.ts (§5.3). The literal string lives there, not here. */
  label: string;
  /**
   * Target rate `r` (§1), as the rational cadence it actually is: `n` hits per
   * `per` days. Two reasons this is not a decimal.
   *
   * 1. §1 gives both decimals and fractions; the fractions are normative.
   *    0.143 rounds 1/7 *up*, capping a perfectly adherent weekly domain at
   *    A = 4/(0.143·28) = 0.999 — the user does exactly what was asked and
   *    never reaches 100. The other roundings happen to fall the generous way.
   *    Relying on that is luck, not design.
   * 2. Even with exact fractions, `hits / (r · W)` is not 1.0 in doubles:
   *    (3/90)·90 is 3.0000000000000004. Keeping numerator and denominator
   *    separate makes `adherence` integer arithmetic, so exact cadence gives
   *    exactly 1.0 rather than something that merely rounds to it.
   *
   * It is also the form a user would type: "4 times per 7 days", not "0.571".
   */
  r: { n: number; per: number };
  color: string;
  /**
   * True when the domain is expected every day. Drives §2.6 Full Day and the
   * "not due today, shown collapsed" rule on the main screen (§6).
   */
  daily: boolean;
  /**
   * False hides the domain completely: no artwork layer, and no checkbox
   * either. A tick that changes nothing on screen would break the causal link
   * the whole app rests on, so a domain with no layer gets no check-in.
   *
   * Must agree with `visual/layers.ts`, which decides what artwork exists;
   * `layers.test.ts` asserts the two tables match.
   */
  visible: boolean;
}

export const DOMAINS: readonly DomainConfig[] = [
  {
    key: 'SLEEP',
    label: 'domain.sleep',
    r: { n: 1, per: 1 },
    color: '#6C8EBF',
    daily: true,
    visible: true,
  },
  {
    key: 'FOOD',
    label: 'domain.food',
    r: { n: 1, per: 1 },
    color: '#B85C38',
    daily: true,
    visible: true,
  },
  {
    key: 'SPORT',
    label: 'domain.sport',
    r: { n: 4, per: 7 }, // §1 lists 0.571
    color: '#C08A2E',
    daily: true,
    visible: true,
  },
  {
    key: 'ORDER',
    label: 'domain.order',
    r: { n: 6, per: 7 }, // §1 lists 0.857
    color: '#5C8A72',
    daily: true,
    visible: false,
  },
  {
    key: 'RELATIONSHIP',
    label: 'domain.relationship',
    r: { n: 1, per: 7 }, // §1 lists 0.143
    color: '#A8557F',
    daily: false,
    visible: true,
  },
  {
    key: 'MIND',
    label: 'domain.mind',
    r: { n: 1, per: 7 }, // §1 lists 0.143
    color: '#7A6BA8',
    daily: false,
    visible: false,
  },
  {
    key: 'INCOME',
    label: 'domain.income',
    r: { n: 3, per: 90 }, // §1 lists 0.033
    color: '#4F6F7A',
    daily: false,
    visible: true,
  },
] as const;

export const DOMAIN_KEYS: readonly DomainKey[] = DOMAINS.map((d) => d.key);

const BY_KEY = new Map<DomainKey, DomainConfig>(DOMAINS.map((d) => [d.key, d]));

export function getDomain(key: DomainKey): DomainConfig {
  const d = BY_KEY.get(key);
  if (!d) throw new Error(`Unknown domain: ${key}`);
  return d;
}

/** Everything the app shows a checkbox for. */
export const VISIBLE_DOMAINS: readonly DomainConfig[] = DOMAINS.filter((d) => d.visible);

/**
 * The daily domains that must all be ticked for a Full Day (§2.6) — visible
 * ones only, so a hidden domain cannot make a Full Day unreachable.
 */
export const DAILY_DOMAIN_KEYS: readonly DomainKey[] = DOMAINS.filter(
  (d) => d.daily && d.visible,
).map((d) => d.key);

/** `r` as a decimal, for display and for sanity checks against the §1 table. */
export function targetRate(d: DomainConfig): number {
  return d.r.n / d.r.per;
}

/**
 * How many days a domain may sit untouched before it is due, derived from the
 * cadence rather than configured separately. Drives the "not due today" collapse
 * on the main screen (§6), so a user-defined domain gets it for free.
 */
export function expectedGapDays(d: DomainConfig): number {
  return Math.max(1, Math.round(d.r.per / d.r.n));
}

export type DomainTicks = Record<DomainKey, boolean>;

export function emptyTicks(): DomainTicks {
  return Object.fromEntries(DOMAIN_KEYS.map((k) => [k, false])) as DomainTicks;
}

