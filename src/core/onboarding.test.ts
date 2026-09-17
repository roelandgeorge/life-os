/**
 * Pins the onboarding tree against docs/onboarding/01-onboarding-spec.md §9
 * and 03-decisions.md's validation table — written before any screen exists
 * (docs/onboarding/00-brief.md's step 4, "write the validation test before
 * the screens").
 */
import { describe, expect, it } from 'vitest';
import { CATALOG, catalogById } from './catalog';
import {
  GENDER_VALUES,
  HAIR_VALUES,
  LANDINGS,
  addOffer,
  advanceScreen,
  buildInitialState,
  chooseDrawing,
  chooseOption,
  countLine,
  currentNode,
  initialAnswers,
  landHeadline,
  profileFrom,
  visibleOptions,
  type Answers,
} from './onboarding';
import { en } from '../i18n/en';
import onboardingTreeJson from '../content/onboarding-tree.json';

const TODAY = '2026-09-17';

// ---------------------------------------------------------------------------
// A full walk of every path the tree allows, from S0 to LAND. Small enough
// to run in a single test (03-decisions.md ran the equivalent walk over
// 4623 paths) and reused by several of the checks below.
// ---------------------------------------------------------------------------

type Walk = { answersAtLand: Answers; taps: number };

function walkAll(answers: Answers, taps: number, depth: number, out: Walk[]): void {
  if (depth > 40) throw new Error('onboarding tree walk exceeded its depth bound — a cycle?');
  const current = currentNode(answers);

  if (current.id === 'LAND') {
    out.push({ answersAtLand: answers, taps });
    return;
  }

  if (current.node.kind === 'screen') {
    walkAll(advanceScreen(answers, current), taps, depth + 1, out);
    return;
  }

  if (current.node.kind === 'profile' && current.node.optionsFrom === 'drawings') {
    const values = current.node.field === 'gender' ? GENDER_VALUES : HAIR_VALUES;
    for (const value of values) walkAll(chooseDrawing(answers, current, value), taps + 1, depth + 1, out);
    return;
  }

  const field = current.node.kind === 'profile' ? current.node.field : undefined;
  if (field === 'partner' || field === 'children') {
    expect((answers as unknown as Record<string, unknown>)[field]).toBeUndefined();
  }

  for (const option of visibleOptions(current, answers)) {
    walkAll(chooseOption(answers, current, option), taps + 1, depth + 1, out);
  }
}

function allWalks(): Walk[] {
  const out: Walk[] = [];
  walkAll(initialAnswers(), 0, 0, out);
  return out;
}

describe('the tree, walked end to end', () => {
  const walks = allWalks();

  it('reaches every landing in landings.json from Q1', () => {
    const reached = new Set(walks.flatMap((w) => w.answersAtLand.landings));
    expect(reached).toEqual(new Set(Object.keys(LANDINGS)));
  });

  it('the shortest path is 5 question taps and the longest is 11', () => {
    const taps = walks.map((w) => w.taps);
    expect(Math.min(...taps)).toBe(5);
    expect(Math.max(...taps)).toBe(11);
  });

  it('never seeds more than two landings on any path', () => {
    for (const w of walks) expect(w.answersAtLand.landings.length).toBeLessThanOrEqual(2);
  });

  it('every walk ends with both partner and children answered', () => {
    for (const w of walks) {
      expect(w.answersAtLand.partner).not.toBeUndefined();
      expect(w.answersAtLand.children).not.toBeUndefined();
    }
  });
});

describe('Q1 on a second visit', () => {
  it('hides the panel already chosen and the "None of them" row', () => {
    let answers = initialAnswers();
    answers = advanceScreen(answers, currentNode(answers)); // S0 -> Q1

    let current = currentNode(answers);
    const body = visibleOptions(current, answers).find((o) => o.id === 'body');
    if (!body) throw new Error('expected a body option on the first Q1 visit');
    answers = chooseOption(answers, current, body); // Q1 -> Q2B

    current = currentNode(answers);
    expect(current.id).toBe('Q2B');
    const tired = visibleOptions(current, answers).find(
      (o) => o.label === en['onboarding.tree.tiredAllTheTime.label'],
    );
    if (!tired) throw new Error('expected "Tired all the time." on Q2B');
    answers = chooseOption(answers, current, tired); // Q2B -> B4 -> QMORE

    current = currentNode(answers);
    expect(current.id).toBe('QMORE');
    const oneMore = visibleOptions(current, answers).find((o) => o.label === en['onboarding.tree.oneMore.label']);
    if (!oneMore) throw new Error('expected "One more." on QMORE');
    answers = chooseOption(answers, current, oneMore); // QMORE -> Q1

    current = currentNode(answers);
    expect(current.id).toBe('Q1');
    const ids = visibleOptions(current, answers).map((o) => o.id);
    expect(ids).not.toContain('body');
    expect(ids).not.toContain('none');
    expect(ids).toEqual(['head', 'people', 'partner', 'money']);
  });
});

describe('the situation block', () => {
  it('is skipped entirely when the Partner branch already answered both', () => {
    let answers = initialAnswers();
    answers = advanceScreen(answers, currentNode(answers)); // S0 -> Q1

    let current = currentNode(answers);
    const partnerOpt = visibleOptions(current, answers).find((o) => o.id === 'partner');
    if (!partnerOpt) throw new Error('expected a partner option on Q1');
    answers = chooseOption(answers, current, partnerOpt); // Q1 -> Q2N

    current = currentNode(answers);
    expect(current.id).toBe('Q2N');
    const yes = visibleOptions(current, answers).find((o) => o.label === en['onboarding.tree.yes.label']);
    if (!yes) throw new Error('expected "Yes." on Q2N');
    answers = chooseOption(answers, current, yes); // partner = true

    current = currentNode(answers);
    expect(current.id).toBe('Q3Ny');
    const childYes = visibleOptions(current, answers).find((o) => o.label === en['onboarding.tree.yes.label']);
    if (!childYes) throw new Error('expected "Yes." on Q3Ny');
    answers = chooseOption(answers, current, childYes); // children = true

    current = currentNode(answers);
    expect(current.id).toBe('Q4Ny');
    const first = visibleOptions(current, answers)[0];
    if (!first) throw new Error('expected at least one Q4Ny option');
    answers = chooseOption(answers, current, first); // -> a landing -> QMORE (first landing, same as any branch)

    current = currentNode(answers);
    expect(current.id).toBe('QMORE');
    const thatsIt = visibleOptions(current, answers).find((o) => o.label === en['onboarding.tree.thatsIt.label']);
    if (!thatsIt) throw new Error('expected "That\'s it." on QMORE');
    answers = chooseOption(answers, current, thatsIt); // QMORE -> SIT, which must skip straight past to FIG_gender

    current = currentNode(answers);
    expect(current.id).toBe('FIG_gender');
    expect(current.header).toBeUndefined();
  });
});

describe('currentNode', () => {
  it('folds SIT in as a header on top of SIT_partner when neither is answered', () => {
    const answers: Answers = { ...initialAnswers(), current: 'SIT' };
    const current = currentNode(answers);
    expect(current.id).toBe('SIT_partner');
    expect(current.header).toBe(en['onboarding.tree.sit.text']);
  });

  it('skips SIT_partner once partner is already set, keeping the header for SIT_children', () => {
    const answers: Answers = { ...initialAnswers(), partner: true, current: 'SIT' };
    const current = currentNode(answers);
    expect(current.id).toBe('SIT_children');
    expect(current.header).toBe(en['onboarding.tree.sit.text']);
  });

  it('skips SIT entirely once both are set', () => {
    const answers: Answers = { ...initialAnswers(), partner: true, children: false, current: 'SIT' };
    const current = currentNode(answers);
    expect(current.id).toBe('FIG_gender');
    expect(current.header).toBeUndefined();
  });
});

describe('landing data', () => {
  it('every seed and offer id exists in the catalogue', () => {
    for (const landing of Object.values(LANDINGS)) {
      for (const id of [...landing.seeds, ...landing.offers]) expect(catalogById(id)).toBeDefined();
    }
  });

  it('no seeded item has cadence situational', () => {
    for (const landing of Object.values(LANDINGS)) {
      for (const id of landing.seeds) expect(catalogById(id)?.cadence).not.toBe('situational');
    }
  });

  it('seeded once items are exactly H077, H078, H127, H129, H136', () => {
    const onceSeeded = new Set<string>();
    for (const landing of Object.values(LANDINGS)) {
      for (const id of landing.seeds) if (catalogById(id)?.cadence === 'once') onceSeeded.add(id);
    }
    expect(onceSeeded).toEqual(new Set(['H077', 'H078', 'H127', 'H129', 'H136']));
  });
});

describe('every requires value used by the catalogue', () => {
  it('is known vocabulary or an existing catalogue id', () => {
    const KNOWN = new Set(['partner', 'children', 'hair', 'gym', 'employed', 'self-employed', 'single']);
    const ids = new Set(CATALOG.map((i) => i.id));
    for (const item of CATALOG) {
      for (const r of item.requires) expect(KNOWN.has(r) || ids.has(r)).toBe(true);
    }
  });
});

describe('profileFrom', () => {
  it('omits keys rather than writing undefined', () => {
    expect(Object.keys(profileFrom(initialAnswers()))).toEqual([]);
  });

  it('carries partner as { wanted }, with no gender or hair of its own', () => {
    expect(profileFrom({ ...initialAnswers(), partner: true })).toEqual({ partner: { wanted: true } });
    expect(profileFrom({ ...initialAnswers(), partner: false })).toEqual({ partner: { wanted: false } });
  });

  it('carries gym/employed/selfEmployed only when answered', () => {
    const profile = profileFrom({ ...initialAnswers(), gym: true, employed: false, selfEmployed: true });
    expect(profile).toEqual({ gym: true, employed: false, selfEmployed: true });
  });
});

describe('buildInitialState', () => {
  it('seeds both landings and de-duplicates a repeated id', () => {
    const answers: Answers = { ...initialAnswers(), landings: ['Z', 'B4'], current: 'LAND' };
    let n = 0;
    const state = buildInitialState(answers, () => `id-${n++}`, TODAY);
    // Z seeds H001, H020; B4 seeds H001 — H001 appears once.
    expect(state.habits.map((h) => h.catalogId).sort()).toEqual(['H001', 'H020']);
  });

  it('adds a tapped offer on top of the seeds', () => {
    const answers: Answers = addOffer({ ...initialAnswers(), landings: ['B1'], current: 'LAND' }, 'H020');
    const state = buildInitialState(answers, () => 'id', TODAY);
    expect(state.habits.map((h) => h.catalogId).sort()).toEqual(['H014', 'H020']);
  });

  it('drops H033 when hair is none, keeps it otherwise (B5)', () => {
    const withoutHair: Answers = { ...initialAnswers(), landings: ['B5'], hair: 'none', current: 'LAND' };
    const stateNone = buildInitialState(withoutHair, () => 'id', TODAY);
    expect(stateNone.habits.map((h) => h.catalogId)).toEqual(['H036']);

    const withHair: Answers = { ...initialAnswers(), landings: ['B5'], hair: 'blond', current: 'LAND' };
    const stateBlond = buildInitialState(withHair, () => 'id', TODAY);
    expect(stateBlond.habits.map((h) => h.catalogId).sort()).toEqual(['H033', 'H036']);
  });

  it('seeds a habit-id-gated item alongside its own gate, seeded in the same batch (P2n, M4)', () => {
    const p2n: Answers = { ...initialAnswers(), landings: ['P2n'], current: 'LAND' };
    const p2nState = buildInitialState(p2n, () => 'id', TODAY);
    expect(p2nState.habits.map((h) => h.catalogId).sort()).toEqual(['H129', 'H130']);

    const m4: Answers = { ...initialAnswers(), landings: ['M4'], current: 'LAND' };
    const m4State = buildInitialState(m4, () => 'id', TODAY);
    expect(m4State.habits.map((h) => h.catalogId).sort()).toEqual(['H136', 'H137']);
  });

  it('drops an employed-only item for someone who answered self-employed (M3s)', () => {
    const answers: Answers = { ...initialAnswers(), landings: ['M3e'], employed: false, current: 'LAND' };
    const state = buildInitialState(answers, () => 'id', TODAY);
    expect(state.habits).toEqual([]);
  });

  it('carries each landing offer into Profile.pendingOfferIds, unless it was already added', () => {
    const untapped: Answers = { ...initialAnswers(), landings: ['B1'], current: 'LAND' };
    expect(buildInitialState(untapped, () => 'id', TODAY).profile?.pendingOfferIds).toEqual(['H020']);

    const tapped = addOffer(untapped, 'H020');
    expect(buildInitialState(tapped, () => 'id', TODAY).profile?.pendingOfferIds).toBeUndefined();
  });

  it('nothing picked and nothing answered yields a state identical in shape to the pre-onboarding literal', () => {
    const state = buildInitialState(initialAnswers(), () => 'id', TODAY);
    expect(state).toEqual({ schemaVersion: 2, logs: [], habits: [], notificationTime: null });
  });
});

describe('LAND copy', () => {
  it('the headline has the {countLine} placeholder stripped', () => {
    expect(landHeadline()).toBe(en['onboarding.tree.land.text']);
  });

  it('the count line matches the seeded-daily-habit count, 0 through 4', () => {
    expect(countLine(0)).toBe(en['onboarding.tree.land.count.0']);
    expect(countLine(1)).toBe(en['onboarding.tree.land.count.1']);
    expect(countLine(4)).toBe(en['onboarding.tree.land.count.4']);
  });
});

// ---------------------------------------------------------------------------
// "Pin the copy with a test, not with care" (03-decisions.md): every string
// the tree carries must appear, verbatim, somewhere in en.ts.
// ---------------------------------------------------------------------------

describe('copy parity with src/i18n/en.ts', () => {
  it('every on-screen string in onboarding-tree.json appears verbatim in en.ts', () => {
    const tree = onboardingTreeJson as {
      nodes: Record<
        string,
        {
          text?: string;
          button?: string;
          countLine?: Record<string, string>;
          options?: { label: string; sub?: string }[];
        }
      >;
    };

    const known = new Set<string>(Object.values(en));
    const missing: string[] = [];

    function check(label: string, value: string | undefined) {
      if (value === undefined) return;
      if (!known.has(value)) missing.push(`${label}: ${JSON.stringify(value)}`);
    }

    for (const [id, node] of Object.entries(tree.nodes)) {
      const text = node.text?.includes('{countLine}') ? node.text.split('\n{countLine}')[0] : node.text;
      check(`${id}.text`, text);
      check(`${id}.button`, node.button);
      for (const [key, line] of Object.entries(node.countLine ?? {})) check(`${id}.countLine.${key}`, line);
      for (const [i, opt] of (node.options ?? []).entries()) {
        check(`${id}.options[${i}].label`, opt.label);
        check(`${id}.options[${i}].sub`, opt.sub);
      }
    }

    expect(missing).toEqual([]);
  });
});
