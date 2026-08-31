import { describe, expect, it } from 'vitest';
import { emptyTicks, getDomain } from './domains';
import { isDueToday, lastHit } from './due';
import type { DayLog } from './types';

const SLEEP = getDomain('SLEEP');
const RELATIONSHIP = getDomain('RELATIONSHIP');

function logOn(date: string, key: 'SLEEP' | 'RELATIONSHIP'): DayLog {
  const ticks = emptyTicks();
  ticks[key] = true;
  return { date, opened: true, ticks };
}

describe('isDueToday', () => {
  it('a daily domain is always due', () => {
    expect(isDueToday(SLEEP, [logOn('2026-01-01', 'SLEEP')], '2026-01-02')).toBe(true);
  });

  it('a cadence domain never hit is due', () => {
    expect(isDueToday(RELATIONSHIP, [], '2026-01-10')).toBe(true);
  });

  it('a cadence domain hit within its gap is not due', () => {
    const logs = [logOn('2026-01-08', 'RELATIONSHIP')];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-10')).toBe(false); // RELATIONSHIP gap = 7 days
  });

  it('a cadence domain becomes due once its gap has passed', () => {
    const logs = [logOn('2026-01-01', 'RELATIONSHIP')];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-08')).toBe(true); // 7 days later
  });
});

describe('lastHit', () => {
  it('ignores today and later, returns the most recent match', () => {
    const logs = [logOn('2026-01-01', 'RELATIONSHIP'), logOn('2026-01-05', 'RELATIONSHIP'), logOn('2026-01-09', 'RELATIONSHIP')];
    expect(lastHit(logs, 'RELATIONSHIP', '2026-01-09')).toBe('2026-01-05');
  });

  it('returns null when never hit', () => {
    expect(lastHit([], 'RELATIONSHIP', '2026-01-09')).toBeNull();
  });
});
