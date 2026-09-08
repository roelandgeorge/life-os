import { describe, expect, it } from 'vitest';
import { emptyTicks, getDomain } from './domains';
import { dailyTasksDone, editableDays, isDueToday, isEditable, isRestDay, lastHit } from './due';
import type { CustomTask, DayLog } from './types';
import type { DomainKey } from './domains';

const SLEEP = getDomain('SLEEP');
const RELATIONSHIP = getDomain('RELATIONSHIP');
const SPORT = getDomain('SPORT');

function logOn(date: string, key: 'SLEEP' | 'RELATIONSHIP' | 'SPORT'): DayLog {
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

describe('isRestDay', () => {
  it('calls the day after training a rest day, not a gap', () => {
    const logs = [logOn('2026-01-01', 'SPORT')];
    expect(isRestDay(SPORT, logs, '2026-01-02')).toBe(true);
  });

  it('is over once the domain is due again', () => {
    const logs = [logOn('2026-01-01', 'SPORT')];
    expect(isRestDay(SPORT, logs, '2026-01-03')).toBe(false);
  });

  it('never applies before the first session — nothing has been earned yet', () => {
    expect(isRestDay(SPORT, [], '2026-01-02')).toBe(false);
  });

  it('leaves daily domains alone: there is no resting from sleep', () => {
    expect(isRestDay(SLEEP, [logOn('2026-01-01', 'SLEEP')], '2026-01-02')).toBe(false);
  });

  it('a weekly domain is done, not resting — the word would be wrong', () => {
    const logs = [logOn('2026-01-08', 'RELATIONSHIP')];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-10')).toBe(false);
    expect(isRestDay(RELATIONSHIP, logs, '2026-01-10')).toBe(false);
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

describe('the retroactive edit window (§5.2)', () => {
  const TODAY = '2026-01-10';

  it('accepts today and the three days before it', () => {
    for (const d of ['2026-01-10', '2026-01-09', '2026-01-08', '2026-01-07']) {
      expect(isEditable(d, TODAY)).toBe(true);
    }
  });

  it('refuses the fourth day back — a log you can rewrite at will records nothing', () => {
    expect(isEditable('2026-01-06', TODAY)).toBe(false);
  });

  it('refuses the future', () => {
    expect(isEditable('2026-01-11', TODAY)).toBe(false);
  });

  it('offers four days oldest-first, so today sits at the right-hand end', () => {
    expect(editableDays(TODAY)).toEqual(['2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10']);
  });
});

describe('dailyTasksDone', () => {
  const domains = [SLEEP, SPORT, RELATIONSHIP];

  function log(date: string, ticked: DomainKey[], custom: string[] = []): DayLog {
    const ticks = emptyTicks();
    for (const k of ticked) ticks[k] = true;
    const customTicks: Record<string, boolean> = {};
    for (const id of custom) customTicks[id] = true;
    return { date, opened: true, ticks, customTicks };
  }

  it('is false when today has no log at all', () => {
    expect(dailyTasksDone([], domains, undefined, '2026-01-10')).toBe(false);
  });

  it('is false while a daily domain is unticked', () => {
    const logs = [log('2026-01-10', ['SPORT'])];
    expect(dailyTasksDone(logs, domains, undefined, '2026-01-10')).toBe(false);
  });

  it('ignores the weekly domains — a Tuesday could never be finished otherwise', () => {
    const logs = [log('2026-01-10', ['SLEEP', 'SPORT'])];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-10')).toBe(true);
    expect(dailyTasksDone(logs, domains, undefined, '2026-01-10')).toBe(true);
  });

  it('requires training on a day it is due', () => {
    const logs = [log('2026-01-10', ['SLEEP'])];
    expect(dailyTasksDone(logs, domains, undefined, '2026-01-10')).toBe(false);
  });

  it('does not require training on a rest day', () => {
    const logs = [log('2026-01-09', ['SLEEP', 'SPORT']), log('2026-01-10', ['SLEEP'])];
    expect(isRestDay(SPORT, logs, '2026-01-10')).toBe(true);
    expect(dailyTasksDone(logs, domains, undefined, '2026-01-10')).toBe(true);
  });

  it('waits for the daily tasks the user added', () => {
    const tasks: CustomTask[] = [{ id: 't1', name: 'No alcohol', cadence: 'daily' }];
    const logs = [log('2026-01-10', ['SLEEP', 'SPORT'])];
    expect(dailyTasksDone(logs, domains, tasks, '2026-01-10')).toBe(false);
    expect(dailyTasksDone([log('2026-01-10', ['SLEEP', 'SPORT'], ['t1'])], domains, tasks, '2026-01-10')).toBe(
      true,
    );
  });

  it('ignores a weekly task of the user’s own, the same as a weekly domain', () => {
    const tasks: CustomTask[] = [{ id: 't1', name: 'Call mum', cadence: 'weekly' }];
    const logs = [log('2026-01-10', ['SLEEP', 'SPORT'])];
    expect(dailyTasksDone(logs, domains, tasks, '2026-01-10')).toBe(true);
  });

  it('treats a task with no cadence as daily, the shape they had before weeklies', () => {
    const tasks: CustomTask[] = [{ id: 't1', name: 'No alcohol' }];
    const logs = [log('2026-01-10', ['SLEEP', 'SPORT'])];
    expect(dailyTasksDone(logs, domains, tasks, '2026-01-10')).toBe(false);
  });

  it('is false when the day asks nothing at all', () => {
    const logs = [log('2026-01-10', [])];
    expect(dailyTasksDone(logs, [RELATIONSHIP], [], '2026-01-10')).toBe(false);
  });
});
