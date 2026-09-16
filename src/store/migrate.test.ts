import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import { migrateV1ToV2, MIGRATED_IMPORTANCE, type V1AppState, type V1DayLog } from './migrate';
import { deserialize, serialize } from './serialize';
import type { AppState } from '../core/types';

const START = '2026-01-01';

function v1Log(date: string, ticks: V1DayLog['ticks'], customTicks: Record<string, boolean> = {}): V1DayLog {
  return { date, opened: true, ticks, customTicks };
}

function sampleV1(): V1AppState {
  const logs: V1DayLog[] = [
    v1Log(START, { SLEEP: true, SPORT: true, RELATIONSHIP: true }, { alcohol: true }),
    v1Log(addDays(START, 1), { SLEEP: true, FOOD: true }),
    // SPORT every other day
    v1Log(addDays(START, 2), { SLEEP: true, SPORT: true }, { alcohol: false }),
  ];
  return {
    logs,
    notificationTime: '20:00',
    taskLabels: { SLEEP: 'Lights out by ten' },
    customTasks: [
      { id: 'alcohol', name: 'No alcohol', cadence: 'weekly', color: '#B85C38' },
      { id: 'read', name: 'Read' },
    ],
  };
}

describe('migrateV1ToV2', () => {
  it('turns each visible v1 domain into a domain habit, anchored at logs[0].date', () => {
    const v2 = migrateV1ToV2(sampleV1());
    const byId = new Map(v2.habits.map((h) => [h.id, h]));

    expect(byId.get('legacy-sleep')).toMatchObject({ domain: 'sleep', cadence: 'daily', startDate: START });
    expect(byId.get('legacy-food')).toMatchObject({ domain: 'nutrition', cadence: 'daily', startDate: START });
    expect(byId.get('legacy-sport')).toMatchObject({
      domain: 'training',
      cadence: { everyDays: 2 },
      startDate: START,
    });
    expect(byId.get('legacy-relationship')).toMatchObject({ domain: 'family', cadence: 'weekly' });
    expect(byId.get('legacy-income')).toMatchObject({ domain: 'finance', cadence: 'weekly' });
  });

  it('never migrates ORDER or MIND — v1 never showed a checkbox for them', () => {
    const v2 = migrateV1ToV2(sampleV1());
    const ids = v2.habits.map((h) => h.id);
    expect(ids).not.toContain('legacy-order');
    expect(ids).not.toContain('legacy-mind');
  });

  it('uses the renamed taskLabel as the title, and the old default otherwise', () => {
    const v2 = migrateV1ToV2(sampleV1());
    const byId = new Map(v2.habits.map((h) => [h.id, h]));
    expect(byId.get('legacy-sleep')?.title).toBe('Lights out by ten');
    expect(byId.get('legacy-food')?.title).toBe('Hit calories & protein');
  });

  it('gives every migrated habit the same neutral importance — v1 had no weight concept', () => {
    const v2 = migrateV1ToV2(sampleV1());
    for (const h of v2.habits) expect(h.importance).toBe(MIGRATED_IMPORTANCE);
  });

  it('turns each custom task into a domain-less habit, keeping cadence and colour', () => {
    const v2 = migrateV1ToV2(sampleV1());
    const alcohol = v2.habits.find((h) => h.id === 'alcohol');
    expect(alcohol).toMatchObject({ title: 'No alcohol', cadence: 'weekly', color: '#B85C38' });
    expect(alcohol?.domain).toBeUndefined();

    const read = v2.habits.find((h) => h.id === 'read');
    expect(read).toMatchObject({ title: 'Read', cadence: 'daily' });
    expect(read && 'color' in read).toBe(false);
  });

  it('carries ticks over, keyed by the new habit ids', () => {
    const v2 = migrateV1ToV2(sampleV1());
    const day0 = v2.logs.find((l) => l.date === START);
    expect(day0?.ticks).toEqual({
      'legacy-sleep': true,
      'legacy-sport': true,
      'legacy-relationship': true,
      alcohol: true,
    });

    const day1 = v2.logs.find((l) => l.date === addDays(START, 1));
    expect(day1?.ticks).toEqual({ 'legacy-sleep': true, 'legacy-food': true });
  });

  it('drops a false customTick rather than carrying it as an absent-but-present key', () => {
    const v2 = migrateV1ToV2(sampleV1());
    const day2 = v2.logs.find((l) => l.date === addDays(START, 2));
    expect(day2?.ticks.alcohol).toBeUndefined();
  });

  it('carries the notification setting across unchanged', () => {
    expect(migrateV1ToV2(sampleV1()).notificationTime).toBe('20:00');
  });

  it('stamps schemaVersion 2', () => {
    expect(migrateV1ToV2(sampleV1()).schemaVersion).toBe(2);
  });
});

describe('deserialize migrates a v1 export on import', () => {
  it('round-trips a hand-built v1 envelope into a working v2 state', () => {
    const v1 = sampleV1();
    const envelope = JSON.stringify({ schemaVersion: 1, exportedAt: '', state: v1 });
    const v2 = deserialize(envelope);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.habits.some((h) => h.id === 'legacy-sleep')).toBe(true);
    expect(v2.habits.some((h) => h.id === 'alcohol')).toBe(true);
  });

  it('round-trips a v2 export losslessly', () => {
    const v2: AppState = migrateV1ToV2(sampleV1());
    const restored = deserialize(serialize(v2));
    expect(restored).toEqual(v2);
  });
});
