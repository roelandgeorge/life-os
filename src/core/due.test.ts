import { describe, expect, it } from 'vitest';
import { dailyTasksDone, editableDays, isDueToday, isEditable, isRestDay, lastHit } from './due';
import type { DayLog, UserHabit } from './types';

const START = '2026-01-01';

const SLEEP: UserHabit = { id: 'sleep', title: 'Sleep', cadence: 'daily', importance: 5, startDate: START };
const RELATIONSHIP: UserHabit = {
  id: 'relationship',
  title: 'Relationship',
  cadence: 'weekly',
  importance: 4,
  startDate: START,
};
const SPORT: UserHabit = {
  id: 'sport',
  title: 'Sport',
  cadence: { everyDays: 2 },
  importance: 4,
  startDate: START,
};

function logOn(date: string, id: string): DayLog {
  return { date, opened: true, ticks: { [id]: true } };
}

describe('isDueToday', () => {
  it('a daily habit is always due', () => {
    expect(isDueToday(SLEEP, [logOn('2026-01-01', 'sleep')], '2026-01-02')).toBe(true);
  });

  it('a cadence habit never hit is due', () => {
    expect(isDueToday(RELATIONSHIP, [], '2026-01-10')).toBe(true);
  });

  it('a cadence habit hit within its gap is not due', () => {
    const logs = [logOn('2026-01-08', 'relationship')];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-10')).toBe(false);
  });

  it('a cadence habit becomes due once its gap has passed', () => {
    const logs = [logOn('2026-01-01', 'relationship')];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-08')).toBe(true);
  });

  it('a habit with no periodic cadence is always due', () => {
    const situational: UserHabit = { ...SLEEP, id: 'x', cadence: 'situational' };
    expect(isDueToday(situational, [], START)).toBe(true);
  });
});

describe('isRestDay', () => {
  it('calls the day after an every-2-days hit a rest day, not a gap', () => {
    const logs = [logOn('2026-01-01', 'sport')];
    expect(isRestDay(SPORT, logs, '2026-01-02')).toBe(true);
  });

  it('is over once the habit is due again', () => {
    const logs = [logOn('2026-01-01', 'sport')];
    expect(isRestDay(SPORT, logs, '2026-01-03')).toBe(false);
  });

  it('never applies before the first hit — nothing has been earned yet', () => {
    expect(isRestDay(SPORT, [], '2026-01-02')).toBe(false);
  });

  it('leaves daily habits alone: there is no resting from a daily cadence', () => {
    expect(isRestDay(SLEEP, [logOn('2026-01-01', 'sleep')], '2026-01-02')).toBe(false);
  });

  it('a weekly habit is done, not resting — the word would be wrong', () => {
    const logs = [logOn('2026-01-08', 'relationship')];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-10')).toBe(false);
    expect(isRestDay(RELATIONSHIP, logs, '2026-01-10')).toBe(false);
  });
});

describe('lastHit', () => {
  it('ignores today and later, returns the most recent match', () => {
    const logs = [logOn('2026-01-01', 'relationship'), logOn('2026-01-05', 'relationship'), logOn('2026-01-09', 'relationship')];
    expect(lastHit(logs, 'relationship', '2026-01-09')).toBe('2026-01-05');
  });

  it('returns null when never hit', () => {
    expect(lastHit([], 'relationship', '2026-01-09')).toBeNull();
  });
});

describe('the retroactive edit window (§5.2)', () => {
  const TODAY = '2026-01-10';

  it('accepts today and the three days before it', () => {
    for (const d of ['2026-01-10', '2026-01-09', '2026-01-08', '2026-01-07']) {
      expect(isEditable(d, TODAY)).toBe(true);
    }
  });

  it('refuses the fourth day back', () => {
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
  const habits = [SLEEP, SPORT, RELATIONSHIP];

  function log(date: string, ticked: string[]): DayLog {
    const ticks: Record<string, true> = {};
    for (const id of ticked) ticks[id] = true;
    return { date, opened: true, ticks };
  }

  it('is false when today has no log at all', () => {
    expect(dailyTasksDone([], habits, '2026-01-10')).toBe(false);
  });

  it('is false while a daily habit is unticked', () => {
    const logs = [log('2026-01-10', ['sport'])];
    expect(dailyTasksDone(logs, habits, '2026-01-10')).toBe(false);
  });

  it('ignores weekly habits — a Tuesday could never be finished otherwise', () => {
    const logs = [log('2026-01-10', ['sleep', 'sport'])];
    expect(isDueToday(RELATIONSHIP, logs, '2026-01-10')).toBe(true);
    expect(dailyTasksDone(logs, habits, '2026-01-10')).toBe(true);
  });

  it('requires the every-2-days habit on a day it is due', () => {
    const logs = [log('2026-01-10', ['sleep'])];
    expect(dailyTasksDone(logs, habits, '2026-01-10')).toBe(false);
  });

  it('does not require it on a rest day', () => {
    const logs = [log('2026-01-09', ['sleep', 'sport']), log('2026-01-10', ['sleep'])];
    expect(isRestDay(SPORT, logs, '2026-01-10')).toBe(true);
    expect(dailyTasksDone(logs, habits, '2026-01-10')).toBe(true);
  });

  it('waits for every short-cadence habit regardless of whether it has a domain', () => {
    const noAlcohol: UserHabit = { id: 'alcohol', title: 'No alcohol', cadence: 'daily', importance: 3, startDate: START };
    const withCustom = [...habits, noAlcohol];
    const logs = [log('2026-01-10', ['sleep', 'sport'])];
    expect(dailyTasksDone(logs, withCustom, '2026-01-10')).toBe(false);
    expect(dailyTasksDone([log('2026-01-10', ['sleep', 'sport', 'alcohol'])], withCustom, '2026-01-10')).toBe(true);
  });

  it('is false when the day asks nothing at all', () => {
    expect(dailyTasksDone([log('2026-01-10', [])], [RELATIONSHIP], '2026-01-10')).toBe(false);
  });

  it('ignores a habit removed before today', () => {
    const removed: UserHabit = { ...SLEEP, id: 'gone', removedDate: '2026-01-10' };
    const logs = [log('2026-01-10', ['sleep'])];
    expect(dailyTasksDone(logs, [SLEEP, removed], '2026-01-10')).toBe(true);
  });
});
