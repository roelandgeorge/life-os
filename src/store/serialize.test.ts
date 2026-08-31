import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import { DOMAIN_KEYS } from '../core/domains';
import { AT_TARGET, buildLogs } from '../core/fixtures';
import { scoresAsOf } from '../core/scoring';
import type { AppState, Profile } from '../core/types';
import { MemoryStore } from './memory';
import { deserialize, ImportError, serialize } from './serialize';

const START = '2026-01-01';

const PROFILE: Profile = {
  currentAge: 35,
  bodyFrame: 'average',
  height: 'average',
  skinTone: 2,
  hairColor: 2,
  hairType: 'straight',
  hairLength: 'short',
  hairline: 'full',
  facialHair: 'none',
  eyeColor: 2,
  glasses: false,
  faceShape: 'oval',
  presentation: 'masculine',
};

function sampleState(): AppState {
  const logs = buildLogs({ start: START, days: 40, pattern: AT_TARGET });
  const today = addDays(START, 40);
  const scores = scoresAsOf(logs, today);
  return {
    profile: PROFILE,
    domains: DOMAIN_KEYS.map((key) => ({ key, score: scores[key] })),
    logs,
    lastEvaluatedDate: addDays(today, -1),
    notificationTime: null,
  };
}

describe('export/import', () => {
  it('round-trips without loss', async () => {
    const store = new MemoryStore(sampleState());
    const json = await store.export();

    const restored = new MemoryStore();
    await restored.import(json);

    expect(await restored.load()).toEqual(await store.load());
  });

  it('survives a round trip through the scoring engine identically', async () => {
    const original = sampleState();
    const restored = deserialize(serialize(original));
    const today = addDays(START, 40);

    expect(scoresAsOf(restored.logs, today)).toEqual(scoresAsOf(original.logs, today));
  });

  it('rejects a file from a newer schema rather than guessing', () => {
    const json = JSON.stringify({ schemaVersion: 99, exportedAt: '', state: sampleState() });
    expect(() => deserialize(json)).toThrow(ImportError);
    expect(() => deserialize(json)).toThrow(/newer version/);
  });

  it('rejects garbage with a reason', () => {
    expect(() => deserialize('not json')).toThrow(/valid JSON/);
    expect(() => deserialize('{}')).toThrow(/Life OS export/);
    expect(() => deserialize(JSON.stringify({ schemaVersion: 1 }))).toThrow(/no state/);
  });

  it('rejects a duplicated log date, which would double-count in the window', () => {
    const state = sampleState();
    state.logs.push({ ...(state.logs[0] as AppState['logs'][number]) });
    expect(() => deserialize(serialize(state))).toThrow(/Duplicate log entry/);
  });

  it('sorts logs by date, so an export edited by hand still replays in order', () => {
    const state = sampleState();
    state.logs.reverse();
    expect(deserialize(serialize(state)).logs.map((l) => l.date)).toEqual(
      sampleState().logs.map((l) => l.date),
    );
  });

  it('tolerates unknown and missing tick keys', () => {
    const state = sampleState();
    const raw = JSON.parse(serialize(state));
    raw.state.logs[0].ticks = { SLEEP: true, LEGACY_DOMAIN: true };

    const [first] = deserialize(JSON.stringify(raw)).logs;
    expect(first?.ticks.SLEEP).toBe(true);
    expect(first?.ticks.FOOD).toBe(false);
    expect(Object.keys(first?.ticks ?? {}).sort()).toEqual([...DOMAIN_KEYS].sort());
  });

  it('leaves existing state intact when an import fails', async () => {
    const store = new MemoryStore(sampleState());
    const before = await store.load();

    await expect(store.import('{"schemaVersion":1}')).rejects.toThrow(ImportError);
    expect(await store.load()).toEqual(before);
  });
});
