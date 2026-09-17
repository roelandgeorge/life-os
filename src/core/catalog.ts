/**
 * The habit catalogue: curated, English, tagged content the user can add as
 * their own habits (§1.1 of docs/plan/phase-1.md).
 *
 * `docs/habits.csv` (123 Dutch items) is the source; `scripts/import-catalog.mjs`
 * translated and tagged it once into `src/content/catalog.json`, which is what
 * this module reads. The CSV stays as archive, not a build input.
 */

import catalogJson from '../content/catalog.json';

/**
 * The 10 catalogue domains. A closed union, like the old `DomainKey` —
 * nothing downstream may branch on one of these values; `domains.ts` re-exports
 * this type so the rest of the app has one name for it.
 */
export type DomainKey =
  | 'sleep'
  | 'nutrition'
  | 'training'
  | 'appearance'
  | 'mindset'
  | 'productivity'
  | 'social'
  | 'hospitality'
  | 'family'
  | 'finance';

export const DOMAIN_KEYS: readonly DomainKey[] = [
  'sleep',
  'nutrition',
  'training',
  'appearance',
  'mindset',
  'productivity',
  'social',
  'hospitality',
  'family',
  'finance',
];

export type CatalogKind = 'habit' | 'milestone' | 'challenge' | 'reminder';

/**
 * Shared with `UserHabit.cadence` (§1.3). `{ everyDays: n }` covers the
 * cadences that are not a clean daily/weekly/monthly — "every 2-3 weeks",
 * "quarterly" — without growing the enum for each one.
 */
export type Cadence =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | { everyDays: number }
  | 'situational'
  | 'once';

export type Effort = 'low' | 'medium' | 'high';
export type Evidence = 'strong' | 'moderate' | 'anecdotal';
export type Audience = 'all' | 'male' | 'female';

/**
 * A profile fact (`single` means `partner === false`), or a catalogue habit
 * id — the item is available once that habit has been ticked at least once.
 * Kept as `string` rather than a closed union so a habit id fits without a
 * type assertion at every call site; `onboarding.test.ts` and the seed-time
 * checks are what actually pin the vocabulary.
 */
export type Requirement = 'partner' | 'children' | 'hair' | 'gym' | 'employed' | 'self-employed' | 'single' | string;

export type CatalogItem = {
  id: string;
  title: string;
  domain: DomainKey;
  kind: CatalogKind;
  cadence: Cadence;
  /** 1-5, per-habit adjustable once added; the catalogue value is the default. */
  importance: number;
  effort: Effort;
  evidence: Evidence;
  note: string;
  audience: Audience;
  requires: readonly Requirement[];
  /**
   * Unused since the onboarding rebuild (docs/onboarding/): the per-domain
   * "3 pre-checked starters" step is gone. Kept because `catalog.json` is
   * taken as a full replacement and re-deriving 43 flags on every import
   * would be churn — a known dead field, not a trap.
   */
  starter: boolean;
};

export const CATALOG: readonly CatalogItem[] = catalogJson as CatalogItem[];

const BY_ID = new Map(CATALOG.map((item) => [item.id, item]));

export function catalogById(id: string): CatalogItem | undefined {
  return BY_ID.get(id);
}

/**
 * What the onboarding profile (§1.3, filled in phase 4) is known so far —
 * enough to filter the catalogue without depending on `Profile` existing yet.
 * Omitted fields mean "unknown", which filters permissively rather than
 * hiding content nobody has said doesn't apply.
 */
export type CatalogFilter = {
  audience?: 'male' | 'female';
  has?: readonly Requirement[];
};

/**
 * Whether every `requires` value on `item` is satisfied by `filter.has` —
 * shared by `catalogFor` and, at seed time, `core/onboarding.ts`'s
 * `buildInitialState`, which builds its own `CatalogFilter` from the
 * catalogue ids being seeded together rather than the ones already ticked.
 */
export function requirementsMet(item: CatalogItem, filter: CatalogFilter): boolean {
  return item.requires.every((r) => filter.has === undefined || filter.has.includes(r));
}

/** Everything in a domain, honouring `audience` and `requires` (§1.1). */
export function catalogFor(domain: DomainKey, filter: CatalogFilter = {}): CatalogItem[] {
  return CATALOG.filter((item) => item.domain === domain)
    .filter(
      (item) =>
        item.audience === 'all' || filter.audience === undefined || item.audience === filter.audience,
    )
    .filter((item) => requirementsMet(item, filter));
}
