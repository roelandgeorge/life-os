import { describe, expect, it } from 'vitest';
import { CATALOG, DOMAIN_KEYS, byImportance, catalogById, catalogFor } from './catalog';
import type { Audience, CatalogKind, Cadence, Evidence } from './catalog';

const KINDS: readonly CatalogKind[] = ['habit', 'milestone', 'challenge', 'reminder'];
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

  it('every item has a valid domain, kind, cadence, evidence and audience', () => {
    for (const item of CATALOG) {
      expect(DOMAIN_KEYS).toContain(item.domain);
      expect(KINDS).toContain(item.kind);
      expect(isValidCadence(item.cadence)).toBe(true);
      expect(EVIDENCE).toContain(item.evidence);
      expect(AUDIENCES).toContain(item.audience);
      expect(item.importance).toBeGreaterThanOrEqual(1);
      expect(item.importance).toBeLessThanOrEqual(5);
    }
  });

  it('every item has an integer dayPosition in [0, 100]', () => {
    for (const item of CATALOG) {
      expect(Number.isInteger(item.dayPosition)).toBe(true);
      expect(item.dayPosition).toBeGreaterThanOrEqual(0);
      expect(item.dayPosition).toBeLessThanOrEqual(100);
    }
  });

  // The JSON is taken as a full replacement when it changes, so pin that a
  // field the app no longer has cannot come back with it unnoticed.
  it('no item carries an effort key', () => {
    const withEffort = CATALOG.filter((i) => 'effort' in i).map((i) => i.id);
    expect(withEffort).toEqual([]);
  });

  it('every domain has at least one item', () => {
    for (const domain of DOMAIN_KEYS) {
      expect(catalogFor(domain).length).toBeGreaterThan(0);
    }
  });

  // `starter` is unused metadata since the onboarding rebuild — the tree in
  // docs/onboarding/ seeds by landing, not by this flag. The only invariant
  // left is that it still names a real catalogue item.
  it('every starter flag marks a real catalogue item', () => {
    for (const item of CATALOG) {
      if (!item.starter) continue;
      expect(catalogById(item.id)).toBe(item);
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

describe('the note every row expands to', () => {
  // A row's only expanded content is its note. An item without one expands
  // to nothing, which reads as a broken tap rather than as an empty field,
  // so every item carries one.
  it('every item has a note', () => {
    const empty = CATALOG.filter((i) => i.note.trim() === '').map((i) => i.id);
    expect(empty).toEqual([]);
  });

  it('no note merely repeats the title', () => {
    const echoes = CATALOG.filter((i) => i.note.trim().toLowerCase() === i.title.trim().toLowerCase());
    expect(echoes.map((i) => i.id)).toEqual([]);
  });
});

describe('byImportance', () => {
  const ids = (domain: (typeof DOMAIN_KEYS)[number]) => byImportance(catalogFor(domain)).map((i) => i.id);

  it('opens nutrition on protein, ahead of supplements', () => {
    expect(ids('nutrition').slice(0, 3)).toEqual(['H009', 'H011', 'H016']);
  });

  it('breaks an importance tie on evidence', () => {
    expect(ids('sleep').slice(0, 3)).toEqual(['H001', 'H003', 'H002']);
  });

  it('does not reorder its input', () => {
    const items = catalogFor('sleep');
    const before = items.map((i) => i.id);
    byImportance(items);
    expect(items.map((i) => i.id)).toEqual(before);
  });
});
