/**
 * Personas: the persona step's content, mirroring how `catalog.ts` reads
 * `catalog.json` (§4.4 of docs/plan/phase-4.md). Phase 4 writes `id`, `name`
 * and a one-line `blurb` for each entry and nothing more — the step files a
 * choice and claims no effect yet. Phase 6 adds quotes, sources and the
 * daily wisdom to the same file without moving anything written here.
 *
 * Phase 1's content rule binds: historical figures by name, public domain
 * only; fictional figures as an unnamed archetype.
 */

import personasJson from '../content/personas.json';

export type Persona = {
  id: string;
  name: string;
  blurb: string;
};

export const PERSONAS: readonly Persona[] = personasJson as Persona[];

const BY_ID = new Map(PERSONAS.map((p) => [p.id, p]));

export function personaById(id: string): Persona | undefined {
  return BY_ID.get(id);
}
