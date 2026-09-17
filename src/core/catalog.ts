/**
 * The habit catalogue: curated, English, tagged content the user can add as
 * their own habits (§1.1 of docs/plan/phase-1.md).
 *
 * `docs/habits.csv` (123 Dutch items) was the original source, translated and
 * tagged once by `scripts/import-catalog.mjs` into `src/content/catalog.json`.
 * The onboarding rebuild (docs/onboarding/02-catalog-changes.md) replaced that
 * file wholesale with 137 items; the CSV and the import script stay as
 * archive, not a build input for the 14 items added since.
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
 * The known, non-habit vocabulary a `requires` entry can hold (docs/onboarding/
 * 01-onboarding-spec.md §4.3). A `requires` entry outside this set is a
 * catalogue habit id instead — the item is available once that habit has
 * been completed. `single` means `partner == false`.
 */
export type KnownRequirement = 'partner' | 'children' | 'hair' | 'gym' | 'employed' | 'self-employed' | 'single';

export const KNOWN_REQUIREMENTS: ReadonlySet<string> = new Set<KnownRequirement>([
  'partner',
  'children',
  'hair',
  'gym',
  'employed',
  'self-employed',
  'single',
]);

/** Either a known requirement keyword or a habit id — see `KNOWN_REQUIREMENTS`. */
export type Requirement = KnownRequirement | string;

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
  /** Onboarding seed data — see docs/onboarding/03-decisions.md. Unused metadata elsewhere. */
  starter: boolean;
};

export const CATALOG: readonly CatalogItem[] = catalogJson as CatalogItem[];

const BY_ID = new Map(CATALOG.map((item) => [item.id, item]));

export function catalogById(id: string): CatalogItem | undefined {
  return BY_ID.get(id);
}

/**
 * What the onboarding profile is known so far — enough to filter the
 * catalogue without depending on `Profile` existing yet. Omitted fields mean
 * "unknown", which filters permissively rather than hiding content nobody
 * has said doesn't apply.
 */
export type CatalogFilter = {
  audience?: 'male' | 'female';
  /** Which known requirement keywords the profile currently satisfies. */
  has?: readonly string[];
  /** Catalogue habit ids the user has completed at least once — gates a habit-id `requires` entry. */
  completed?: ReadonlySet<string>;
};

function requirementMet(requirement: Requirement, filter: CatalogFilter): boolean {
  if (KNOWN_REQUIREMENTS.has(requirement)) return filter.has === undefined || filter.has.includes(requirement);
  return filter.completed === undefined || filter.completed.has(requirement);
}

/** Everything in a domain, honouring `audience` and `requires`. */
export function catalogFor(domain: DomainKey, filter: CatalogFilter = {}): CatalogItem[] {
  return CATALOG.filter((item) => item.domain === domain)
    .filter(
      (item) =>
        item.audience === 'all' || filter.audience === undefined || item.audience === filter.audience,
    )
    .filter((item) => item.requires.every((r) => requirementMet(r, filter)));
}
