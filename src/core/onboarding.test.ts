import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { catalogFilterFor } from './habits';
import { buildInitialState, profileFrom, steps, type Answers } from './onboarding';

const TODAY = '2026-09-17';

describe('steps', () => {
  it('holds the fixed order with no partner and no domains chosen', () => {
    expect(steps({}).map((s) => s.kind)).toEqual(['gender', 'hair', 'partner', 'children', 'domains']);
  });

  it('partnerLooks appears only once a partner is wanted', () => {
    expect(steps({ partnerWanted: false }).map((s) => s.kind)).not.toContain('partnerLooks');
    expect(steps({ partnerWanted: true }).map((s) => s.kind)).toContain('partnerLooks');
  });

  it('one starters step per enabled domain, in the stored order', () => {
    const answers: Answers = { domains: ['finance', 'sleep', 'mindset'] };
    const starterSteps = steps(answers).filter((s) => s.kind === 'starters');
    expect(starterSteps.map((s) => s.domain)).toEqual(['finance', 'sleep', 'mindset']);
  });

  it('no domains on yields a valid sequence with no starters steps', () => {
    const withNone = steps({ domains: [] });
    expect(withNone.some((s) => s.kind === 'starters')).toBe(false);
    expect(withNone[0]).toEqual({ kind: 'gender' });
    expect(withNone[withNone.length - 1]).toEqual({ kind: 'domains' });
  });

  // The tree ends where the answers end, which is what lets the component
  // wire its last Next to "finish" without knowing which step that is.
  it('ends on the last domain turned on', () => {
    const withDomains = steps({ domains: ['sleep', 'finance'] });
    expect(withDomains[withDomains.length - 1]).toEqual({ kind: 'starters', domain: 'finance' });
  });
});

describe('profileFrom', () => {
  it('omits keys rather than writing undefined', () => {
    const profile = profileFrom({});
    expect(Object.keys(profile)).toEqual([]);
  });

  it('carries only what was answered', () => {
    expect(profileFrom({ gender: 'male' })).toEqual({ gender: 'male' });
    expect(profileFrom({ children: true })).toEqual({ children: true });
    expect(profileFrom({ domains: ['sleep', 'finance'] })).toEqual({ domainOrder: ['sleep', 'finance'] });
  });

  it('partner carries gender and hair only when wanted', () => {
    expect(profileFrom({ partnerWanted: false, partnerGender: 'female', partnerHair: 'dark' })).toEqual({
      partner: { wanted: false },
    });
    expect(profileFrom({ partnerWanted: true, partnerGender: 'female', partnerHair: 'dark' })).toEqual({
      partner: { wanted: true, gender: 'female', hair: 'dark' },
    });
    expect(profileFrom({ partnerWanted: true })).toEqual({ partner: { wanted: true } });
  });
});

describe('buildInitialState', () => {
  it('seeds one habit per picked id, anchored today, carrying the catalogue importance and catalogId', () => {
    const first = CATALOG.find((i) => i.kind === 'habit');
    if (!first) throw new Error('expected at least one habit in the catalogue');
    const answers: Answers = { picked: { [first.domain]: [first.id] } };

    let n = 0;
    const state = buildInitialState(answers, () => `id-${n++}`, TODAY);

    expect(state.habits).toHaveLength(1);
    const habit = state.habits[0];
    if (!habit) throw new Error('expected a habit');
    expect(habit.catalogId).toBe(first.id);
    expect(habit.title).toBe(first.title);
    expect(habit.domain).toBe(first.domain);
    expect(habit.cadence).toEqual(first.cadence);
    expect(habit.importance).toBe(first.importance);
    expect(habit.startDate).toBe(TODAY);
  });

  it('drops an unknown catalogue id rather than throwing', () => {
    const answers: Answers = { picked: { sleep: ['NOT-AN-ID'] } };
    const state = buildInitialState(answers, () => 'id', TODAY);
    expect(state.habits).toEqual([]);
  });

  it('nothing picked and nothing answered yields a state identical in shape to the pre-onboarding literal', () => {
    const state = buildInitialState({}, () => 'id', TODAY);
    expect(state).toEqual({ schemaVersion: 2, logs: [], habits: [], notificationTime: null });
  });

  it('multiple picks across domains all seed, each with a fresh id', () => {
    const habits = CATALOG.filter((i) => i.kind === 'habit');
    const a = habits.find((i) => i.domain === 'sleep');
    const b = habits.find((i) => i.domain === 'finance');
    if (!a || !b) throw new Error('expected at least one sleep and one finance habit in the catalogue');
    const answers: Answers = { picked: { [a.domain]: [a.id], [b.domain]: [b.id] } };

    let n = 0;
    const state = buildInitialState(answers, () => `id-${n++}`, TODAY);
    expect(state.habits).toHaveLength(2);
    expect(new Set(state.habits.map((h) => h.id)).size).toBe(2);
  });
});

describe('catalogFilterFor', () => {
  it('leaves audience and has both unset for a profile that has answered nothing', () => {
    expect(catalogFilterFor(undefined)).toEqual({});
  });

  it('sets audience from gender', () => {
    expect(catalogFilterFor({ gender: 'female' })).toMatchObject({ audience: 'female' });
  });

  it('a yes answer becomes a has entry', () => {
    expect(catalogFilterFor({ partner: { wanted: true }, children: true }).has).toEqual(
      expect.arrayContaining(['partner', 'children']),
    );
  });

  it('a no answer to one question still sets has, just without that entry', () => {
    expect(catalogFilterFor({ partner: { wanted: false } }).has).toEqual([]);
  });

  it('leaves has undefined only when neither question has been answered', () => {
    expect(catalogFilterFor({ gender: 'male' }).has).toBeUndefined();
    expect(catalogFilterFor({ children: false }).has).toEqual([]);
  });
});
