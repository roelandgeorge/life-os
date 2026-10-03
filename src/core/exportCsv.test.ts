import { describe, expect, it } from 'vitest';
import { logCsv } from './exportCsv';
import type { AppState } from './types';

const state: AppState = {
  schemaVersion: 2,
  notificationTime: null,
  habits: [
    { id: 'sleep', catalogId: 'H001', title: 'Sleep 7–9 hours', domain: 'sleep', cadence: 'daily', importance: 5, order: 0, startDate: '2026-01-01' },
    { id: 'mine', title: 'Say "no", then mean it', cadence: { everyDays: 2 }, importance: 3, order: 1, startDate: '2026-01-01', removedDate: '2026-01-03' },
  ],
  logs: [
    { date: '2026-01-01', opened: true, ticks: { sleep: true, mine: true } },
    { date: '2026-01-03', opened: true, ticks: {} },
  ],
};

const rows = (csv: string) => csv.replace('﻿', '').trimEnd().split('\r\n');

describe('logCsv', () => {
  it('starts with a BOM and a header, CRLF between lines', () => {
    const csv = logCsv(state);
    expect(csv.startsWith('﻿date,habit_id,catalog_id,title,domain,panels,cadence,importance,order,ticked,opened\r\n')).toBe(true);
  });

  it('writes a row per day per active habit, gap days included as unopened', () => {
    expect(rows(logCsv(state)).slice(1)).toEqual([
      '2026-01-01,sleep,H001,Sleep 7–9 hours,sleep,body|head,daily,5,0,1,1',
      '2026-01-01,mine,,"Say ""no"", then mean it",,,every_2_days,3,1,1,1',
      '2026-01-02,sleep,H001,Sleep 7–9 hours,sleep,body|head,daily,5,0,0,0',
      '2026-01-02,mine,,"Say ""no"", then mean it",,,every_2_days,3,1,0,0',
      '2026-01-03,sleep,H001,Sleep 7–9 hours,sleep,body|head,daily,5,0,0,1',
    ]);
  });

  it('is just the header for an empty log', () => {
    expect(rows(logCsv({ ...state, logs: [] }))).toHaveLength(1);
  });
});
