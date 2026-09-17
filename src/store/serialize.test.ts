import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import type { AppState, DayLog, UserHabit } from '../core/types';
import { MemoryStore } from './memory';
import { deserialize, ImportError, serialize } from './serialize';

const START = '2026-01-01';

const HABITS: UserHabit[] = [
  { id: 'sleep', title: 'Slept 8 hours', domain: 'sleep', cadence: 'daily', importance: 5, startDate: START },
  {
    id: 'alcohol',
    title: 'No alcohol',
    cadence: 'weekly',
    importance: 4,
    startDate: START,
    color: '#B85C38',
  },
];

function sampleState(): AppState {
  const logs: DayLog[] = Array.from({ length: 40 }, (_, i) => {
    const ticks: Record<string, true> = {};
    if (i % 2 === 0) {
      ticks.sleep = true;
      ticks.alcohol = true;
    }
    return { date: addDays(START, i), opened: true, ticks };
  });
  return {
    schemaVersion: 2,
    logs,
    habits: HABITS,
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

  it('rejects a file from a newer schema rather than guessing', () => {
    const json = JSON.stringify({ schemaVersion: 99, exportedAt: '', state: sampleState() });
    expect(() => deserialize(json)).toThrow(ImportError);
    expect(() => deserialize(json)).toThrow(/newer version/);
  });

  it('rejects garbage with a reason', () => {
    expect(() => deserialize('not json')).toThrow(/valid JSON/);
    expect(() => deserialize('{}')).toThrow(/Life OS export/);
    expect(() => deserialize(JSON.stringify({ schemaVersion: 2 }))).toThrow(/no state/);
  });

  it('rejects a duplicated log date, which would double-count in the window', () => {
    const state = sampleState();
    state.logs.push({ ...(state.logs[0] as DayLog) });
    expect(() => deserialize(serialize(state))).toThrow(/Duplicate log entry/);
  });

  it('sorts logs by date, so an export edited by hand still replays in order', () => {
    const state = sampleState();
    state.logs.reverse();
    expect(deserialize(serialize(state)).logs.map((l) => l.date)).toEqual(
      sampleState().logs.map((l) => l.date),
    );
  });

  it('drops a tick for a habit that no longer exists', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.habits = raw.state.habits.filter((h: UserHabit) => h.id !== 'alcohol');

    const restored = deserialize(JSON.stringify(raw));
    expect(restored.logs[0]?.ticks.alcohol).toBeUndefined();
    expect(restored.logs[0]?.ticks.sleep).toBe(true);
  });

  it('drops a malformed habit rather than failing the whole import', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.habits = [...raw.state.habits, { id: 42 }, { name: 'no id' }, 'junk'];
    const restored = deserialize(JSON.stringify(raw));
    expect(restored.habits.map((h) => h.id).sort()).toEqual(['alcohol', 'sleep']);
  });

  it('drops an unknown domain rather than failing the import', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.habits[0].domain = 'NOT-A-DOMAIN';
    const restored = deserialize(JSON.stringify(raw));
    expect(restored.habits.find((h) => h.id === 'sleep')?.domain).toBeUndefined();
  });

  it('drops a colour that is not one, keeping the habit', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.habits[1].color = 'chartreuse';
    const restored = deserialize(JSON.stringify(raw));
    const alcohol = restored.habits.find((h) => h.id === 'alcohol');
    expect(alcohol?.title).toBe('No alcohol');
    expect(alcohol && 'color' in alcohol).toBe(false);
  });

  it('normalises an out-of-range importance rather than rejecting the habit', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.habits[0].importance = 99;
    expect(deserialize(JSON.stringify(raw)).habits[0]?.importance).toBe(5);
  });

  it('accepts an { everyDays } cadence and rejects a malformed one to the daily default', () => {
    const raw = JSON.parse(serialize(sampleState()));
    raw.state.habits[0].cadence = { everyDays: 3 };
    expect(deserialize(JSON.stringify(raw)).habits[0]?.cadence).toEqual({ everyDays: 3 });

    raw.state.habits[0].cadence = { everyDays: -1 };
    expect(deserialize(JSON.stringify(raw)).habits[0]?.cadence).toBe('daily');
  });

  it('leaves existing state intact when an import fails', async () => {
    const store = new MemoryStore(sampleState());
    const before = await store.load();

    await expect(store.import('{"schemaVersion":2}')).rejects.toThrow(ImportError);
    expect(await store.load()).toEqual(before);
  });

  it('carries a profile through a round trip when present', () => {
    const state = sampleState();
    state.profile = {
      gender: 'male',
      hair: 'blond',
      partner: { wanted: true, gender: 'female', hair: 'dark' },
    };
    const restored = deserialize(serialize(state));
    expect(restored.profile).toEqual({
      gender: 'male',
      hair: 'blond',
      partner: { wanted: true, gender: 'female', hair: 'dark' },
    });
  });

  it('omits profile entirely rather than storing an empty object', () => {
    const restored = deserialize(serialize(sampleState()));
    expect(restored.profile).toBeUndefined();
  });

  it('drops a hair value outside the closed union rather than storing it', () => {
    const json = JSON.stringify({
      schemaVersion: 2,
      exportedAt: '',
      state: { ...sampleState(), profile: { hair: 'ginger', partner: { wanted: true, hair: 'also-not-real' } } },
    });
    const restored = deserialize(json);
    expect(restored.profile?.hair).toBeUndefined();
    expect(restored.profile?.partner).toEqual({ wanted: true });
  });
});
