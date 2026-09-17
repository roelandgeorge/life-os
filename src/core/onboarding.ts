/**
 * The onboarding decision tree (docs/onboarding/01-onboarding-spec.md), read
 * as static data from `src/content/onboarding-tree.json` and
 * `src/content/landings.json` — replacing the fixed domain-picker sequence
 * phase 4 built. Pure: no DOM, no clock, no storage, in the same sense as
 * the rest of `core/`.
 *
 * The tree is a graph, not a line: `Q1` branches by panel, a landing seeds
 * habits and immediately continues (a landing is a data point, never its own
 * screen), and a few nodes are skipped once the `Profile` field they'd ask
 * for is already set. `currentNode` is the one function that walks past all
 * of that — skips, and the header-only `SIT` screen, which has no button of
 * its own and simply prefixes whatever comes after it — so callers only ever
 * see a node worth rendering.
 */

import { catalogById, requirementsMet } from './catalog';
import type { CatalogFilter } from './catalog';
import { catalogFilterFor, newHabitFromCatalog } from './habits';
import onboardingTreeJson from '../content/onboarding-tree.json';
import landingsJson from '../content/landings.json';
import type { DateKey } from './dates';
import type { AppState, Gender, Hair, Profile, UserHabit } from './types';

// ---------------------------------------------------------------------------
// The tree, as typed data.
// ---------------------------------------------------------------------------

/** A node's `next` when it depends on a profile field rather than being fixed. */
export type ConditionalNext = { if: string; then: string; else: string };
export type NextRef = string | ConditionalNext;

/** Shared by every node kind — the field `currentNode`'s skip check reads regardless of what else the node is. */
type Skippable = { skipIf?: Readonly<Record<string, 'set'>> };

export type OptionJson = {
  id?: string;
  label: string;
  sub?: string;
  render?: string;
  next?: NextRef;
  /** Only on a `profile`-kind node's options (Q2N, Q3Ny, SIT_partner, SIT_children). */
  value?: boolean;
  /** Side-effect profile writes that aren't the node's own `field` — gym/employed/self-employed. */
  sets?: Readonly<Record<string, boolean>>;
  showIf?: Readonly<Record<string, boolean>>;
  /** Q1's "None of them" — skips `QMORE` on the way out of its landing. */
  skipMore?: boolean;
};

export type ScreenNode = Skippable & {
  kind: 'screen';
  text: string;
  button?: string;
  next?: string;
  countLine?: Readonly<Record<string, string>>;
};

export type QuestionNode = Skippable & {
  kind: 'question';
  text: string;
  options: readonly OptionJson[];
};

export type ProfileNode = Skippable & {
  kind: 'profile';
  field: string;
  text: string;
  options?: readonly OptionJson[];
  optionsFrom?: 'drawings';
  next?: string;
};

export type TreeNode = ScreenNode | QuestionNode | ProfileNode;

type TreeJson = {
  start: string;
  nodes: Readonly<Record<string, TreeNode>>;
  afterLanding: { first: string; second: string; fromNone: string };
};

export type Landing = {
  seeds: readonly string[];
  offers: readonly string[];
  dailyAnchor: string | null;
};

const TREE = onboardingTreeJson as unknown as TreeJson;

/** `landings.json` carries a `_comment` key alongside the real landings — everything but that one. */
export const LANDINGS: Readonly<Record<string, Landing>> = Object.fromEntries(
  Object.entries(landingsJson as unknown as Record<string, Landing>).filter(([id]) => id !== '_comment'),
);

function nodeAt(id: string): TreeNode {
  const node = TREE.nodes[id];
  if (!node) throw new Error(`Unknown onboarding node: ${id}`);
  return node;
}

function isLanding(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(LANDINGS, id);
}

// ---------------------------------------------------------------------------
// Answers — everything decided so far, plus a cursor (`current`) into the
// tree. There is no back button in this onboarding (§00-brief.md's "do not
// add a back button unless one already exists in the app's chrome"), so a
// single cursor is enough; nothing needs to remember how it got there.
// ---------------------------------------------------------------------------

export type Answers = {
  gender?: Gender;
  hair?: Hair;
  partner?: boolean;
  children?: boolean;
  gym?: boolean;
  employed?: boolean;
  selfEmployed?: boolean;
  /** Q1 panel ids chosen so far, in order — at most 2 (rule 4, "two panels is the cap"). */
  chosenPanels: readonly string[];
  /** Landing ids reached so far, in order — at most 2, same cap. */
  landings: readonly string[];
  /** Catalogue ids added from a landing's offer, one-tap, on top of its seeds. */
  offers: readonly string[];
  /** The node id to resolve (via `currentNode`) into what's shown next. */
  current: string;
};

export function initialAnswers(): Answers {
  return { chosenPanels: [], landings: [], offers: [], current: TREE.start };
}

function fieldValue(answers: Answers, key: string): unknown {
  return (answers as unknown as Record<string, unknown>)[key];
}

function conditionsMet(cond: Readonly<Record<string, unknown>> | undefined, answers: Answers): boolean {
  if (cond === undefined) return true;
  return Object.entries(cond).every(([key, want]) =>
    want === 'set' ? fieldValue(answers, key) !== undefined : fieldValue(answers, key) === want,
  );
}

/**
 * The node a skipped node hands off to. `SIT_partner` and `SIT_children`
 * carry `skipIf` but no node-level `next` — every option on both converges
 * on one target (03-decisions.md), so a skipped question goes wherever all
 * of its options go; a skipped screen (`SIT`) already names it directly.
 */
function skipTarget(node: TreeNode): string {
  if (node.kind === 'screen') {
    if (node.next === undefined) throw new Error('skipped screen node has no next to fall through to');
    return node.next;
  }
  const targets = new Set((node.options ?? []).map((o) => (typeof o.next === 'string' ? o.next : null)));
  if (targets.size !== 1 || targets.has(null)) {
    throw new Error('a skippable question node must have exactly one, unconditional next across its options');
  }
  return [...targets][0] as string;
}

export type CurrentNode = {
  id: string;
  node: TreeNode;
  /** `SIT`'s text, when it auto-advanced straight into this node — see the module doc. */
  header?: string;
};

/**
 * Resolves `answers.current` past every skip and every button-less screen
 * until it lands on something worth rendering. A `screen` node with no
 * `button` (only `SIT`) has nothing of its own to tap, so it folds its text
 * in as a header and keeps walking — that is what lets `SIT`'s "Two things
 * the drawing needs." sit above `SIT_partner`'s question as one screen.
 */
export function currentNode(answers: Answers): CurrentNode {
  let id = answers.current;
  let header: string | undefined;
  for (let guard = 0; guard < 50; guard++) {
    const node = nodeAt(id);
    if (conditionsMet(node.skipIf, answers) && node.skipIf !== undefined) {
      id = skipTarget(node);
      continue;
    }
    if (node.kind === 'screen' && node.button === undefined && node.next !== undefined) {
      header = node.text;
      id = node.next;
      continue;
    }
    return header === undefined ? { id, node } : { id, node, header };
  }
  throw new Error(`onboarding tree: no stable node reached from ${answers.current}`);
}

/**
 * `node.options`, minus what shouldn't show right now: a `showIf` that
 * isn't met (Q4Ny's "We're thinking about children."), and — on `Q1`'s
 * second visit, detected by `chosenPanels` already carrying an entry — the
 * panel already chosen and the "None of them" row (§9: a second visit to
 * `Q1` never shows the panel already chosen and never shows "None of them").
 */
export function visibleOptions(current: CurrentNode, answers: Answers): readonly OptionJson[] {
  if (current.node.kind === 'screen') return [];
  const options = current.node.options ?? [];
  const secondQ1Visit = current.id === 'Q1' && answers.chosenPanels.length > 0;
  return options.filter((opt) => {
    if (opt.showIf !== undefined && !conditionsMet(opt.showIf, answers)) return false;
    if (secondQ1Visit && (opt.id === 'none' || (opt.id !== undefined && answers.chosenPanels.includes(opt.id)))) {
      return false;
    }
    return true;
  });
}

function resolveNext(next: NextRef | undefined, answers: Answers): string {
  if (next === undefined) throw new Error('option has no next to resolve');
  if (typeof next === 'string') return next;
  return fieldValue(answers, next.if) === true ? next.then : next.else;
}

function applySets(answers: Answers, sets: Readonly<Record<string, boolean>> | undefined): Answers {
  if (sets === undefined) return answers;
  let next = answers;
  for (const [key, value] of Object.entries(sets)) {
    if (key === 'self-employed') next = { ...next, selfEmployed: value };
    else if (key === 'gym' || key === 'employed') next = { ...next, [key]: value };
  }
  return next;
}

/**
 * Where the flow goes once a landing has been reached — landings are never
 * rendered, so reaching one always continues straight through: `QMORE`
 * after the first (unless Q1's "None of them" was the way in, which skips
 * straight to the situation block), `SIT` after the second.
 */
function nextAfterLanding(landingsSoFar: number, skipMore: boolean): string {
  if (skipMore) return TREE.afterLanding.fromNone;
  return landingsSoFar === 1 ? TREE.afterLanding.first : TREE.afterLanding.second;
}

/**
 * Tapping an option on a `question` or a static-options `profile` node
 * (`Q2N`, `Q3Ny`, `SIT_partner`, `SIT_children`): writes the node's own
 * field when the option carries a `value`, applies any side-effect `sets`,
 * records a `Q1` choice, then resolves onward — chasing straight through
 * any landing(s) it lands on, since those are data points, not screens.
 */
export function chooseOption(answers: Answers, current: CurrentNode, option: OptionJson): Answers {
  if (current.node.kind === 'screen') throw new Error('chooseOption called on a screen node');

  let next = answers;
  if (current.node.kind === 'profile' && option.value !== undefined) {
    next = { ...next, [current.node.field]: option.value };
  }
  next = applySets(next, option.sets);
  if (current.id === 'Q1' && option.id !== undefined && option.id !== 'none') {
    next = { ...next, chosenPanels: [...next.chosenPanels, option.id] };
  }

  let targetId = resolveNext(option.next, next);
  const skipMore = option.skipMore === true;
  while (isLanding(targetId)) {
    next = { ...next, landings: [...next.landings, targetId] };
    targetId = nextAfterLanding(next.landings.length, skipMore);
  }
  return { ...next, current: targetId };
}

/** The drawing sets, in the order they're offered — `FIG_gender`/`FIG_hair` read from these rather than a static `options` array. */
export const GENDER_VALUES: readonly Gender[] = ['male', 'female'];
export const HAIR_VALUES: readonly Hair[] = ['blond', 'dark', 'none'];

/** Tapping a drawing on `FIG_gender` or `FIG_hair` — the one case `optionsFrom: 'drawings'` replaces a static option list. */
export function chooseDrawing(answers: Answers, current: CurrentNode, value: Gender | Hair): Answers {
  if (current.node.kind !== 'profile' || current.node.optionsFrom !== 'drawings' || current.node.next === undefined) {
    throw new Error(`chooseDrawing called on a node that isn't a drawing question: ${current.id}`);
  }
  return { ...answers, [current.node.field]: value, current: current.node.next };
}

/** Tapping `S0`'s "Go on" — the only node with a real button in the whole tree. */
export function advanceScreen(answers: Answers, current: CurrentNode): Answers {
  if (current.node.kind !== 'screen' || current.node.next === undefined) {
    throw new Error(`advanceScreen called on a node with nothing to advance to: ${current.id}`);
  }
  return { ...answers, current: current.node.next };
}

/** The landing screen's one-tap "add" on an offer — never touches `landings`, only what actually gets seeded. */
export function addOffer(answers: Answers, catalogId: string): Answers {
  return answers.offers.includes(catalogId) ? answers : { ...answers, offers: [...answers.offers, catalogId] };
}

/** `LAND`'s headline, with the `{countLine}` placeholder stripped — `countLine` supplies the second line. */
export function landHeadline(): string {
  const node = nodeAt('LAND');
  if (node.kind !== 'screen') throw new Error('LAND is not a screen node');
  return node.text.split('\n{countLine}')[0] ?? node.text;
}

/** The second line under `LAND`'s headline — §6, the count of seeded daily habits, capped at the table's own range. */
export function countLine(dailyCount: number): string {
  const node = nodeAt('LAND');
  if (node.kind !== 'screen' || node.countLine === undefined) throw new Error('LAND has no countLine table');
  const key = String(Math.min(4, Math.max(0, dailyCount)));
  const line = node.countLine[key];
  if (line === undefined) throw new Error(`LAND.countLine has no entry for ${key}`);
  return line;
}

// ---------------------------------------------------------------------------
// Profile and seeding — the tree's two outputs, both built only once, at
// `LAND` (§6: "Seeds committed after hair is known").
// ---------------------------------------------------------------------------

/**
 * The `Profile` these answers describe. Keys are omitted, never written as
 * `undefined` — `exactOptionalPropertyTypes` means those are different
 * things, and a store round trip must not have to tell them apart.
 * `partner`'s gender/hair stay unset: onboarding no longer asks what a
 * partner looks like (03-decisions.md — that control stays in Settings).
 */
export function profileFrom(answers: Answers): Profile {
  const profile: Profile = {};
  if (answers.gender !== undefined) profile.gender = answers.gender;
  if (answers.hair !== undefined) profile.hair = answers.hair;
  if (answers.partner !== undefined) profile.partner = { wanted: answers.partner };
  if (answers.children !== undefined) profile.children = answers.children;
  if (answers.gym !== undefined) profile.gym = answers.gym;
  if (answers.employed !== undefined) profile.employed = answers.employed;
  if (answers.selfEmployed !== undefined) profile.selfEmployed = answers.selfEmployed;
  return profile;
}

/**
 * Seeded and ready to save. Every landing reached contributes its `seeds`,
 * plus whatever offers were tapped; `requires` is enforced against the final
 * profile the same way it is everywhere else (§4.3) — with one twist a plain
 * `catalogFilterFor(profile)` wouldn't give: a habit-id `requires` counts as
 * met the moment its gate is seeded in this same batch, ticked or not, which
 * is what lets `P2n` seed H130 alongside its own gate H129, and `M4` seed
 * H137 alongside H136 (03-decisions.md).
 */
export function buildInitialState(answers: Answers, newId: () => string, today: DateKey): AppState {
  const profile = profileFrom(answers);

  const seedIds: string[] = [];
  for (const landingId of answers.landings) seedIds.push(...(LANDINGS[landingId]?.seeds ?? []));
  seedIds.push(...answers.offers);
  const uniqueIds = [...new Set(seedIds)];

  const filter: CatalogFilter = catalogFilterFor(profile, new Set(uniqueIds));
  const habits: UserHabit[] = [];
  for (const id of uniqueIds) {
    const item = catalogById(id);
    if (!item || !requirementsMet(item, filter)) continue;
    habits.push(newHabitFromCatalog(item, newId(), today));
  }

  const state: AppState = { schemaVersion: 2, logs: [], habits, notificationTime: null };
  if (Object.keys(profile).length > 0) state.profile = profile;
  return state;
}
