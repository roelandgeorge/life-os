import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import { DOMAIN_KEYS, emptyTicks } from '../core/domains';
import { domainStep } from '../core/steps';
import { getDomain } from '../core/domains';
import type { AppState, DayLog } from '../core/types';
import { MemoryStore } from './memory';
import { deserialize, ImportError, serialize } from './serialize';

const START = '2026-01-01';

function sampleState(): AppState {
  const logs: DayLog[] = Array.from({ length: 40 }, (_, i) => {
    const ticks = emptyTicks();
    for (const k of DOMAIN_KEYS) ticks[k] = i % 2 === 0;
    return { date: addDays(START, i), opened: true, ticks, customTicks: i % 3 === 0 ? { t1: true } : {} };
  });
  return {
    profile: { currentAge: 35 },
    logs,
    notificationTime: null,
    taskLabels: { SLEEP: 'Went to bed before 22:30' },
    customTasks: [{ id: 't1', name: 'No alcohol' }],
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

  it('survives a round trip through the step model identically', () => {
    const original = sampleState();
    const restored = deserialize(serialize(original));
    const today = addDays(START, 40);
    const sleep = getDomain('SLEEP');

    expect(domainStep(restored.logs, sleep, today)).toBe(domainStep(original.logs, sleep, today));
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
  it('carries renamed check-ins through a round trip', () => {
    const restored = deserialize(serialize(sampleState()));
    expect(restored.taskLabels?.SLEEP).toBe('Went to bed before 22:30');
  });

  it('drops a label that is not a string rather than failing the import', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.taskLabels = { SLEEP: 42, NONSENSE: 'x', FOOD: '  spaces trimmed  ' };
    const restored = deserialize(JSON.stringify(raw));
    expect(restored.taskLabels?.SLEEP).toBeUndefined();
    expect(restored.taskLabels?.FOOD).toBe('spaces trimmed');
  });

  it('carries user-added tasks and their ticks through a round trip', () => {
    const restored = deserialize(serialize(sampleState()));
    expect(restored.customTasks).toEqual([{ id: 't1', name: 'No alcohol' }]);
    expect(restored.logs[0]?.customTicks).toEqual({ t1: true });
    expect(restored.logs[1]?.customTicks).toEqual({});
  });

  it('drops ticks for a task that no longer exists', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.customTasks = [];
    const restored = deserialize(JSON.stringify(raw));
    expect(restored.logs[0]?.customTicks).toEqual({});
  });

  it('drops a malformed task rather than failing the whole import', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.customTasks = [{ id: 't1', name: 'Keep me' }, { id: 42 }, { name: 'no id' }, 'junk'];
    expect(deserialize(JSON.stringify(raw)).customTasks).toEqual([{ id: 't1', name: 'Keep me' }]);
  });
});
