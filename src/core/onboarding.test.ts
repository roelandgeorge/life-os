import { describe, expect, it } from 'vitest';
import { catalogById, CATALOG } from './catalog';
import treeJson from '../content/onboarding-tree.json';
import landingsJson from '../content/landings.json';
import { en } from '../i18n/en';
import {
  buildInitialState,
  choose,
  chooseDrawing,
  dailySeedCount,
  everyLandingCatalogId,
  profileFrom,
  seededCatalogItems,
  step,
  START_NODE,
  WORK_ON_START_NODE,
  FIGURE_START_NODE,
  type Advance,
  type Answers,
} from './onboarding';

const TODAY = '2026-09-17';

type TreeOptionJson = { id?: string; label: string };
type TreeNodeJson = {
  kind: string;
  text: string;
  field?: string;
  options?: readonly TreeOptionJson[];
  countLine?: Readonly<Record<string, string>>;
};
const NODES = (treeJson as { nodes: Record<string, TreeNodeJson> }).nodes;
function node(id: string): TreeNodeJson {
  const n = NODES[id];
  if (!n) throw new Error(`Unknown node ${id}`);
  return n;
}
type LandingJson = { seeds: readonly string[]; offers: readonly string[] };
const LANDINGS: Record<string, LandingJson> = Object.fromEntries(
  Object.entries(landingsJson as Record<string, unknown>).filter(
    (entry): entry is [string, LandingJson] => typeof entry[1] === 'object' && entry[1] !== null && Array.isArray((entry[1] as LandingJson).seeds),
  ),
);
const LANDING_IDS = Object.keys(LANDINGS);

function chooseById(nodeId: string, answers: Answers, optionId: string): Advance {
  const s = step(nodeId, answers);
  const opt = s.options?.find((o) => o.id === optionId || o.label === optionId);
  if (!opt) throw new Error(`No option "${optionId}" visible on ${nodeId}`);
  return choose(nodeId, answers, opt.index);
}

// ---------------------------------------------------------------------------
// Structural checks against the raw data (docs/onboarding/01-onboarding-spec.md §9,
// as replaced by docs/onboarding/04-revisions.md's own acceptance list).
// ---------------------------------------------------------------------------

describe('landings.json against catalog.json', () => {
  it('every seed and offer id exists in the catalogue', () => {
    for (const id of everyLandingCatalogId()) {
      expect(catalogById(id), `unknown catalogue id ${id}`).toBeDefined();
    }
  });

  it('no seeded item has cadence situational', () => {
    for (const landing of Object.values(LANDINGS)) {
      for (const id of landing.seeds) {
        expect(catalogById(id)?.cadence, id).not.toBe('situational');
      }
    }
  });

  it('seeded once-cadence items are exactly H077, H078, H127, H129, H136', () => {
    const onceSeeded = new Set<string>();
    for (const landing of Object.values(LANDINGS)) {
      for (const id of landing.seeds) {
        if (catalogById(id)?.cadence === 'once') onceSeeded.add(id);
      }
    }
    expect([...onceSeeded].sort()).toEqual(['H077', 'H078', 'H127', 'H129', 'H136']);
  });

  it('every landing carries a seeds array of at most two ids', () => {
    for (const [id, landing] of Object.entries(LANDINGS)) {
      expect(landing.seeds.length, id).toBeGreaterThan(0);
      expect(landing.seeds.length, id).toBeLessThanOrEqual(2);
    }
  });
});

describe('the copy — pinned verbatim against docs/onboarding/04-revisions.md, the final word', () => {
  it('the tree opens straight on Q1, with no explainer screen before it', () => {
    expect(START_NODE).toBe('Q1');
    expect(NODES['S0']).toBeUndefined();
    // LAND is the only `screen` left, and it is a terminal hand-off the
    // renderer never reaches — nothing shows a screen node any more.
    const screens = Object.entries(NODES).filter(([, n]) => n.kind === 'screen');
    expect(screens.map(([id]) => id)).toEqual(['LAND']);
  });

  it('Q1 asks what the revision replaces it with, not the original spec wording', () => {
    expect(node('Q1').text).toBe('What do you most want to work on?');
  });

  it('Q1 carries the five panel cards plus the unchanged sixth row', () => {
    const labels = node('Q1').options?.map((o) => o.label);
    expect(labels).toEqual([
      'Body',
      'Head',
      'People',
      'Partner',
      'Money',
      "None of them. I'm here to keep it that way.",
    ]);
  });

  it('the partner and children questions are asked plainly (§2)', () => {
    expect(node('Q2N').text).toBe('Do you have a partner?');
    expect(node('Q3Ny').text).toBe('Do you have children?');
  });

  it('Q-More is reworded and shows Yes / No, that\'s it (§11)', () => {
    expect(node('QMORE').text).toBe('Is there anything else you want to work on?');
    expect(node('QMORE').options?.map((o) => o.label)).toEqual(['Yes.', "No, that's it."]);
  });

  it('the Situation block is gone entirely (§3)', () => {
    expect(NODES.SIT).toBeUndefined();
    expect(NODES.SIT_partner).toBeUndefined();
    expect(NODES.SIT_children).toBeUndefined();
    for (const n of Object.values(NODES)) {
      expect(n.text).not.toContain('Two things the drawing needs');
    }
  });

  it('the figure questions keep their original wording', () => {
    expect(node('FIG_gender').text).toBe('Now the figure. Which one?');
    expect(node('FIG_hair').text).toBe('Hair?');
  });

  it("the landing screen's headline and count line match app/MainScreen.tsx's own copy — LAND itself is never rendered", () => {
    expect(node('LAND').text.split('\n')[0]).toBe(en['main.landing.headline']);
    expect(node('LAND').countLine).toEqual({
      '0': en['main.landing.count.0'],
      '1': en['main.landing.count.1'],
      '2': en['main.landing.count.2'],
      '3': en['main.landing.count.3'],
      '4': en['main.landing.count.4'],
    });
  });

  it('partner and children are written exactly once each, only inside the Partner branch', () => {
    const partnerNodes = Object.entries(NODES).filter(([, n]) => n.field === 'partner');
    const childrenNodes = Object.entries(NODES).filter(([, n]) => n.field === 'children');
    expect(partnerNodes.map(([id]) => id)).toEqual(['Q2N']);
    expect(childrenNodes.map(([id]) => id)).toEqual(['Q3Ny']);
  });

  it('every node docs/onboarding/04-revisions.md leaves untouched still matches docs/onboarding/onboarding-tree.json verbatim', async () => {
    // A real diff against the original source doc, not just spot checks —
    // "copy is final" for every branch (Body, Head, People, Money, the N/Y
    // sub-trees) this suite does not otherwise assert string-for-string.
    const original = (await import('../../docs/onboarding/onboarding-tree.json')) as unknown as {
      default: { nodes: Record<string, TreeNodeJson> };
    };
    const revisedOrRemoved = new Set(['S0', 'Q1', 'Q2N', 'Q3Ny', 'QMORE', 'SIT', 'SIT_partner', 'SIT_children']);
    for (const [id, sourceNode] of Object.entries(original.default.nodes)) {
      if (revisedOrRemoved.has(id)) continue;
      const shipped = NODES[id];
      expect(shipped, `${id} missing from the shipped tree`).toBeDefined();
      expect(shipped!.text, id).toBe(sourceNode.text);
      for (const [i, option] of (sourceNode.options ?? []).entries()) {
        const shippedOption = shipped!.options?.[i];
        expect(shippedOption?.label, `${id} option ${i}`).toBe(option.label);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Reachability (§9): every landing reachable from Q1 by some path. A single
// fresh DFS from Q1 with empty answers already reaches every landing any
// later Q-More loop could — revisiting Q1 only ever removes options, so it
// unlocks nothing a first pass didn't already see.
// ---------------------------------------------------------------------------

function collectLandings(nodeId: string, answers: Answers, seen: Set<string>): void {
  const s = step(nodeId, answers);
  for (const option of s.options ?? []) {
    const before = answers.landings?.length ?? 0;
    const result = choose(nodeId, answers, option.index);
    const after = result.answers.landings?.length ?? 0;
    if (after > before) {
      seen.add(result.answers.landings![result.answers.landings!.length - 1] as string);
      continue; // a landing was reached — stop, don't walk into QMORE/FIG_gender
    }
    collectLandings(result.nextId, result.answers, seen);
  }
}

describe('reachability', () => {
  it('every landing in landings.json is reachable from Q1', () => {
    const seen = new Set<string>();
    collectLandings('Q1', {}, seen);
    expect([...seen].sort()).toEqual([...LANDING_IDS].sort());
  });
});

// ---------------------------------------------------------------------------
// The engine rules docs/onboarding/04-revisions.md adds on top of the tree.
// ---------------------------------------------------------------------------

describe('Q1 on a repeat visit', () => {
  it('hides every panel already chosen and never shows "none" again', () => {
    const q1 = chooseById('Q1', {}, 'body');
    const first = chooseById('Q2B', q1.answers, 'Tired all the time.'); // B4, one tap
    // First landing reached — Q-More offered.
    expect(first.nextId).toBe('QMORE');
    const afterYes = choose('QMORE', first.answers, 0); // "Yes."
    expect(afterYes.nextId).toBe('Q1');

    const secondVisit = step('Q1', afterYes.answers);
    const ids = secondVisit.options?.map((o) => o.id);
    expect(ids).not.toContain('body');
    expect(ids).not.toContain('none');
    expect(ids).toEqual(['head', 'people', 'partner', 'money']);
  });

  it('answering "none" first skips Q-More and the Situation block entirely, straight to the figure', () => {
    const result = chooseById('Q1', {}, 'none');
    expect(result.nextId).toBe(FIGURE_START_NODE);
    expect(result.answers.landings).toEqual(['Z']);
  });

  it('choosing a fifth panel skips Q-More too — nothing left to ask', () => {
    let answers: Answers = {};
    for (const id of ['body', 'head', 'people', 'partner'] as const) {
      const chosen = chooseById('Q1', answers, id);
      answers = choose('QMORE', chosen.answers, 0).answers; // "Yes." back to Q1
    }
    // Money is the fifth and last panel — Q3M_low > "It's fine..." branch, take the short "Debt." leaf.
    const q2m = chooseById('Q2M', chooseById('Q1', answers, 'money').answers, 'Debt.');
    expect(q2m.nextId).toBe(FIGURE_START_NODE);
    expect(q2m.answers.chosenPanels).toEqual(['body', 'head', 'people', 'partner', 'money']);
  });
});

describe('H033 (maintain your haircut) requires hair', () => {
  function reachB5(): Answers {
    const q1 = chooseById('Q1', {}, 'body');
    return chooseById('Q2B', q1.answers, "I've let myself go. Hair, skin, clothes.").answers;
  }

  it('is not seeded when hair is none', () => {
    const answers: Answers = { ...reachB5(), hair: 'none' };
    expect(seededCatalogItems(answers).map((i) => i.id)).not.toContain('H033');
  });

  it('is seeded once hair is answered', () => {
    const answers: Answers = { ...reachB5(), hair: 'blond' };
    expect(seededCatalogItems(answers).map((i) => i.id)).toContain('H033');
  });
});

describe('a habit-id requirement gated at the same landing', () => {
  it('P2n seeds both H129 and its own gate H130, though H129 has not been ticked yet', () => {
    const q1 = chooseById('Q1', {}, 'people');
    const q3pa = chooseById('Q2P', q1.answers, 'There aren\'t many people to lose touch with.');
    const landed = chooseById('Q3Pa', q3pa.answers, 'No.');
    expect(landed.answers.landings).toEqual(['P2n']);
    const ids = seededCatalogItems(landed.answers).map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['H129', 'H130']));
  });
});

describe('the Money branch sets employed / self-employed', () => {
  it('"Both" sets both flags and lands on the self-employed landing', () => {
    const q1 = chooseById('Q1', {}, 'money');
    const q3 = chooseById('Q2M', q1.answers, "I don't earn enough.");
    const landed = chooseById('Q3M_low', q3.answers, 'Both.');
    expect(landed.answers.employed).toBe(true);
    expect(landed.answers.selfEmployed).toBe(true);
    expect(landed.answers.landings).toEqual(['M3s']);
  });
});

describe('the figure', () => {
  it('chooseDrawing writes gender then hair and lands on LAND', () => {
    const afterGender = chooseDrawing(FIGURE_START_NODE, {}, 'male');
    expect(afterGender.answers.gender).toBe('male');
    expect(afterGender.nextId).toBe('FIG_hair');
    const afterHair = chooseDrawing('FIG_hair', afterGender.answers, 'dark');
    expect(afterHair.answers.hair).toBe('dark');
    expect(afterHair.nextId).toBe('LAND');
  });
});

describe('profileFrom', () => {
  it('omits keys rather than writing undefined', () => {
    expect(Object.keys(profileFrom({}))).toEqual([]);
  });

  it('partner is written as {wanted} to match what scene.ts already reads', () => {
    expect(profileFrom({ partner: true })).toEqual({ partner: { wanted: true } });
    expect(profileFrom({ partner: false })).toEqual({ partner: { wanted: false } });
  });

  it('carries gym / employed / selfEmployed only once answered', () => {
    expect(profileFrom({ gym: true, employed: true, selfEmployed: false })).toEqual({
      gym: true,
      employed: true,
      selfEmployed: false,
    });
  });
});

describe('buildInitialState', () => {
  it('seeds one habit per resolved catalogue item, anchored today', () => {
    const q1 = chooseById('Q1', {}, 'body');
    const landed = chooseById('Q2B', q1.answers, 'Tired all the time.'); // B4: H001 only
    let n = 0;
    const state = buildInitialState(landed.answers, () => `id-${n++}`, TODAY);
    expect(state.habits.map((h) => h.catalogId)).toEqual(['H001']);
    expect(state.habits[0]?.startDate).toBe(TODAY);
  });

  it('nothing answered yields a state identical in shape to the pre-onboarding literal', () => {
    const state = buildInitialState({}, () => 'id', TODAY);
    expect(state).toEqual({ schemaVersion: 2, logs: [], habits: [], notificationTime: null });
  });

  it('domainOrder follows the order the seeded habits\' domains first appear, repeats dropped', () => {
    let answers: Answers = chooseById('Q1', {}, 'body').answers;
    answers = chooseById('Q2B', answers, 'Tired all the time.').answers; // B4 -> sleep (H001)
    answers = choose('QMORE', answers, 0).answers; // Yes.
    answers = chooseById('Q1', answers, 'money').answers;
    answers = chooseById('Q2M', answers, 'Debt.').answers; // M4 -> finance (H136, H137)

    let n = 0;
    const state = buildInitialState(answers, () => `id-${n++}`, TODAY);
    expect(state.profile?.domainOrder).toEqual(['sleep', 'finance']);
  });

  it('drops a landing whose seed no longer exists in the catalogue rather than throwing', () => {
    const answers: Answers = { landings: ['NOT-A-LANDING'] };
    expect(() => buildInitialState(answers, () => 'id', TODAY)).not.toThrow();
    expect(buildInitialState(answers, () => 'id', TODAY).habits).toEqual([]);
  });

  it('dailySeedCount counts only daily-cadence seeds, deduplicated', () => {
    const answers: Answers = { landings: ['Z'] }; // H001 (daily), H020 (daily) per landings.json
    expect(dailySeedCount(answers)).toBe(2);
  });
});

describe('every catalogue habit-kind item reachable from some landing is a real habit, not a milestone masquerading as one', () => {
  it('a spot check: every seeded id resolves to a catalogue item', () => {
    for (const id of everyLandingCatalogId()) expect(CATALOG.some((i) => i.id === id)).toBe(true);
  });
});

describe('starting points', () => {
  it('START_NODE, WORK_ON_START_NODE and FIGURE_START_NODE are all real nodes', () => {
    expect(step(START_NODE, {})).toBeDefined();
    expect(step(WORK_ON_START_NODE, {})).toBeDefined();
    expect(step(FIGURE_START_NODE, {})).toBeDefined();
  });
});
