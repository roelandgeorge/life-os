import { describe, expect, it } from 'vitest';
import { CATALOG, DOMAIN_KEYS, catalogById, catalogFor, startersFor } from './catalog';
import type { Audience, CatalogKind, Cadence, Effort, Evidence } from './catalog';

const KINDS: readonly CatalogKind[] = ['habit', 'milestone', 'challenge', 'reminder'];
const EFFORTS: readonly Effort[] = ['low', 'medium', 'high'];
const EVIDENCE: readonly Evidence[] = ['strong', 'moderate', 'anecdotal'];
const AUDIENCES: readonly Audience[] = ['all', 'male', 'female'];

function isValidCadence(c: Cadence): boolean {
  if (c === 'daily' || c === 'weekly' || c === 'monthly' || c === 'situational' || c === 'once') {
    return true;
  }
  return typeof c === 'object' && c !== null && Number.isFinite(c.everyDays) && c.everyDays > 0;
}

describe('the catalogue', () => {
  it('is non-empty and every id is unique', () => {
    expect(CATALOG.length).toBeGreaterThan(0);
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(CATALOG.length);
  });

  it('every item has a valid domain, kind, cadence, effort, evidence and audience', () => {
    for (const item of CATALOG) {
      expect(DOMAIN_KEYS).toContain(item.domain);
      expect(KINDS).toContain(item.kind);
      expect(isValidCadence(item.cadence)).toBe(true);
      expect(EFFORTS).toContain(item.effort);
      expect(EVIDENCE).toContain(item.evidence);
      expect(AUDIENCES).toContain(item.audience);
      expect(item.importance).toBeGreaterThanOrEqual(1);
      expect(item.importance).toBeLessThanOrEqual(5);
    }
  });

  it('every domain has at least one item', () => {
    for (const domain of DOMAIN_KEYS) {
      expect(catalogFor(domain).length).toBeGreaterThan(0);
    }
  });

  it('marks at most 3 starters per domain, and never a lower importance than a non-starter', () => {
    for (const domain of DOMAIN_KEYS) {
      const items = catalogFor(domain);
      const starters = startersFor(domain);
      expect(starters.length).toBeLessThanOrEqual(3);
      expect(starters.length).toBe(Math.min(3, items.length));

      const nonStarters = items.filter((i) => !i.starter);
      if (nonStarters.length === 0 || starters.length === 0) continue;
      const starterMin = Math.min(...starters.map((i) => i.importance));
      const nonStarterMax = Math.max(...nonStarters.map((i) => i.importance));
      expect(nonStarterMax).toBeLessThanOrEqual(starterMin);
    }
  });

  it('catalogById finds a known item and returns undefined for an unknown one', () => {
    const first = CATALOG[0];
    if (!first) throw new Error('catalogue is empty');
    expect(catalogById(first.id)).toEqual(first);
    expect(catalogById('NOT-AN-ID')).toBeUndefined();
  });
});

describe('catalogFor filtering', () => {
  it('with no filter, returns every item in the domain regardless of audience or requires', () => {
    const domain = CATALOG[0]!.domain;
    const all = CATALOG.filter((i) => i.domain === domain);
    expect(catalogFor(domain)).toEqual(all);
  });

  it('excludes items for the other audience once one is given', () => {
    const gendered = CATALOG.find((i) => i.audience !== 'all');
    if (!gendered) return; // this catalogue batch may have no gendered items
    const opposite = gendered.audience === 'male' ? 'female' : 'male';
    const ids = catalogFor(gendered.domain, { audience: opposite }).map((i) => i.id);
    expect(ids).not.toContain(gendered.id);
  });

  it('excludes items requiring something not marked as present', () => {
    const requiring = CATALOG.find((i) => i.requires.length > 0);
    if (!requiring) throw new Error('expected at least one item with a requirement');
    const withoutIt = catalogFor(requiring.domain, { has: [] }).map((i) => i.id);
    expect(withoutIt).not.toContain(requiring.id);
    const withIt = catalogFor(requiring.domain, { has: requiring.requires }).map((i) => i.id);
    expect(withIt).toContain(requiring.id);
  });
});
