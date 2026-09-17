import { describe, expect, it } from 'vitest';
import { PERSONAS, personaById } from './personas';

describe('personas', () => {
  it('is non-empty, with 5-6 entries as phase 4 scopes it', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(5);
    expect(PERSONAS.length).toBeLessThanOrEqual(6);
  });

  it('every id is unique', () => {
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
  });

  it('every entry has a non-empty name and blurb', () => {
    for (const persona of PERSONAS) {
      expect(persona.name.trim().length).toBeGreaterThan(0);
      expect(persona.blurb.trim().length).toBeGreaterThan(0);
    }
  });

  it('personaById finds a known id and returns undefined for an unknown one', () => {
    const first = PERSONAS[0];
    if (!first) throw new Error('personas is empty');
    expect(personaById(first.id)).toEqual(first);
    expect(personaById('not-a-real-id')).toBeUndefined();
  });
});
