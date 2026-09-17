/**
 * The onboarding decision tree, rebuilt around docs/onboarding/ — the design
 * documents that replaced phase 4's domain picker with "point at the panel,
 * then ask what's in the way" (docs/onboarding/01-onboarding-spec.md), then
 * revised it again (docs/onboarding/04-revisions.md, the final word). Pure:
 * no DOM, no clock, no storage, same as the rest of `core/`.
 *
 * `src/content/onboarding-tree.json` holds the question graph as data —
 * text, options, branching — the same way `catalog.json` holds the
 * catalogue. This module is the only code that reads its shape. A landing id
 * (`onboarding-tree.json`'s node ids never collide with `landings.json`'s)
 * is not a screen: reaching one records it in `Answers.landings` and the
 * flow continues immediately, because the seed a landing implies can only be
 * resolved once the whole `Profile` is known — H033 requires hair, and the
 * figure is answered last (docs/onboarding/04-revisions.md §5).
 *
 * `app/Onboarding.tsx` holds a node id plus `Answers` and calls `step()` to
 * render the current node, `choose()`/`chooseDrawing()` to advance. The "ask
 * until they stop" loop (§11) and the Situation block's removal (§3) both
 * live here as engine rules rather than as extra tree data: a landing's own
 * next is always either `QMORE` or `FIG_gender`, decided by how many panels
 * are chosen and whether Q1 was ever answered "none".
 */

import treeJson from '../content/onboarding-tree.json';
import landingsJson from '../content/landings.json';
import type { DateKey } from './dates';
import { catalogById, requirementsMet, type CatalogItem } from './catalog';
import { catalogFilterFor, newHabitFromCatalog } from './habits';
import type { DomainKey } from './domains';
import type { AppState, Gender, Hair, Profile } from './types';

// ---------------------------------------------------------------------------
// The tree, as typed data.
// ---------------------------------------------------------------------------

/** Q1's own panel vocabulary — distinct from `PanelKey`: "people" and "money" name what Q1 calls the network and wealth panels. */
export type Q1PanelId = 'body' | 'head' | 'people' | 'partner' | 'money';

type NextRef = string | { if: 'children'; then: string; else: string };

type TreeOption = {
  id?: string;
  label: string;
  sub?: string;
  next: NextRef;
  sets?: Readonly<Record<string, boolean>>;
  value?: boolean;
  showIf?: Readonly<Record<string, boolean>>;
};

type TreeNode = {
  kind: 'screen' | 'question' | 'profile';
  text: string;
  button?: string;
  field?: string;
  optionsFrom?: 'drawings';
  next?: string;
  options?: readonly TreeOption[];
  countLine?: Readonly<Record<string, string>>;
};

type TreeJson = { start: string; nodes: Readonly<Record<string, TreeNode>> };

const TREE = treeJson as TreeJson;

export const START_NODE = TREE.start;
/** Entry point for Settings' "Redo what you work on" (docs/onboarding/04-revisions.md §5) — the figure is a separate, independent part. */
export const WORK_ON_START_NODE = 'Q1';
/** Entry point for Settings' "Redo the figure". */
export const FIGURE_START_NODE = 'FIG_gender';
/** The terminal hand-off for a full run and for "Redo the figure" — never rendered, see `app/Onboarding.tsx`. */
export const LANDING_NODE = 'LAND';

type LandingData = { seeds: readonly string[]; offers: readonly string[]; dailyAnchor: string | null };

/** `landings.json` carries one non-landing key, `_comment`, alongside the real entries. */
function isLandingData(v: unknown): v is LandingData {
  return typeof v === 'object' && v !== null && Array.isArray((v as LandingData).seeds);
}

const LANDINGS: Readonly<Record<string, LandingData>> = Object.fromEntries(
  Object.entries(landingsJson as Record<string, unknown>).filter((entry): entry is [string, LandingData] =>
    isLandingData(entry[1]),
  ),
);

function isTreeNode(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TREE.nodes, id);
}

// ---------------------------------------------------------------------------
// Answers — what the tree has written so far.
// ---------------------------------------------------------------------------

export type Answers = {
  gender?: Gender;
  hair?: Hair;
  partner?: boolean;
  children?: boolean;
  gym?: boolean;
  employed?: boolean;
  selfEmployed?: boolean;
  /** Q1 panels chosen so far, in the order chosen, deduplicated. */
  chosenPanels?: readonly Q1PanelId[];
  /** Landing ids reached so far, in order — resolved to catalogue ids only once the whole profile is known. */
  landings?: readonly string[];
};

/**
 * The `Profile` these answers describe so far. Keys are omitted, never
 * written as `undefined` — `exactOptionalPropertyTypes` means those are
 * different things, and a store round trip must not have to tell them apart.
 * `domainOrder` is not derived here: it comes from the seeded habits'
 * domains, in seed order (docs/onboarding/04-revisions.md §11), which needs
 * the resolved habit list `buildInitialState` builds.
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

// ---------------------------------------------------------------------------
// Rendering the current node.
// ---------------------------------------------------------------------------

export type StepOption = { index: number; id?: string; label: string; sub?: string };

export type Step = {
  id: string;
  kind: 'screen' | 'question' | 'profile';
  text: string;
  button?: string;
  field?: string;
  optionsFrom?: 'drawings';
  options?: readonly StepOption[];
  countLine?: Readonly<Record<string, string>>;
};

function optionVisible(nodeId: string, option: TreeOption, answers: Answers): boolean {
  if (option.showIf) {
    for (const [key, value] of Object.entries(option.showIf)) {
      if ((answers as Record<string, unknown>)[key] !== value) return false;
    }
  }
  // Q1's own dynamic rule (§11, §9): a repeat visit hides every panel
  // already chosen, and "none" is only ever offered on the very first visit.
  if (nodeId === 'Q1') {
    const chosen = answers.chosenPanels ?? [];
    if (option.id === 'none') return chosen.length === 0;
    if (option.id !== undefined && chosen.includes(option.id as Q1PanelId)) return false;
  }
  return true;
}

/** The node to render, with `options` already filtered for this visit. */
export function step(nodeId: string, answers: Answers): Step {
  const node = TREE.nodes[nodeId];
  if (!node) throw new Error(`Unknown onboarding node: ${nodeId}`);

  const base: Step = { id: nodeId, kind: node.kind, text: node.text };
  if (node.button !== undefined) base.button = node.button;
  if (node.field !== undefined) base.field = node.field;
  if (node.optionsFrom !== undefined) base.optionsFrom = node.optionsFrom;
  if (node.countLine !== undefined) base.countLine = node.countLine;

  if (node.options) {
    base.options = node.options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => optionVisible(nodeId, option, answers))
      .map(({ option, index }) => {
        const resolved: StepOption = { index, label: option.label };
        if (option.id !== undefined) resolved.id = option.id;
        if (option.sub !== undefined) resolved.sub = option.sub;
        return resolved;
      });
  }
  return base;
}

// ---------------------------------------------------------------------------
// Advancing. `choose` handles every node with static `options`; `chooseDrawing`
// handles FIG_gender/FIG_hair, whose options are the drawing set rather than
// tree data. Both funnel through `advanceThroughLandings`, which is the one
// place a landing id (absent from `TREE.nodes`) is recognised and resolved.
// ---------------------------------------------------------------------------

export type Advance = { nextId: string; answers: Answers };

function resolveNextRef(next: NextRef, answers: Answers): string {
  if (typeof next === 'string') return next;
  return answers[next.if] === true ? next.then : next.else;
}

function applySets(sets: Readonly<Record<string, boolean>> | undefined, answers: Answers): Answers {
  if (!sets) return answers;
  let next = answers;
  for (const [key, value] of Object.entries(sets)) {
    if (key === 'self-employed') next = { ...next, selfEmployed: value };
    else if (key === 'gym') next = { ...next, gym: value };
    else if (key === 'employed') next = { ...next, employed: value };
  }
  return next;
}

/**
 * The one place a bare landing id is resolved: it is recorded, then the flow
 * moves straight on without a screen of its own. §5's ordering constraint —
 * seeds are only resolvable once the whole profile is known — is why nothing
 * here reads `landings.json`'s `seeds`/`offers`; that happens in
 * `resolveSeeds` below, against the finished `Answers`.
 */
function advanceThroughLandings(id: string, answers: Answers): Advance {
  let current = id;
  let next = answers;
  while (!isTreeNode(current)) {
    if (!(current in LANDINGS)) throw new Error(`Unknown onboarding destination: ${current}`);
    next = { ...next, landings: [...(next.landings ?? []), current] };
    if (current === 'Z') {
      // Q1 answered "none" — no Q-More, straight to the figure (§1, §11).
      current = FIGURE_START_NODE;
      continue;
    }
    const chosen = next.chosenPanels ?? [];
    current = chosen.length >= 5 ? FIGURE_START_NODE : 'QMORE';
  }
  return { nextId: current, answers: next };
}

/** Advances past a `question`/`profile` node with static `options` — everything except FIG_gender/FIG_hair. */
export function choose(nodeId: string, answers: Answers, optionIndex: number): Advance {
  const node = TREE.nodes[nodeId];
  if (!node?.options) throw new Error(`${nodeId} has no options to choose from`);
  const option = node.options[optionIndex];
  if (!option) throw new Error(`${nodeId} has no option at index ${optionIndex}`);

  let next = answers;
  if (node.kind === 'profile' && node.field === 'partner' && option.value !== undefined) {
    next = { ...next, partner: option.value };
  }
  if (node.kind === 'profile' && node.field === 'children' && option.value !== undefined) {
    next = { ...next, children: option.value };
  }
  next = applySets(option.sets, next);

  if (nodeId === 'Q1' && option.id !== undefined && option.id !== 'none') {
    const chosen = next.chosenPanels ?? [];
    if (!chosen.includes(option.id as Q1PanelId)) next = { ...next, chosenPanels: [...chosen, option.id as Q1PanelId] };
  }

  return advanceThroughLandings(resolveNextRef(option.next, next), next);
}

/** Advances past a `screen` node's single button (S0's "Go on"). */
export function advanceScreen(nodeId: string, answers: Answers): Advance {
  const node = TREE.nodes[nodeId];
  if (!node || node.kind !== 'screen' || !node.next) throw new Error(`${nodeId} is not an advanceable screen`);
  return advanceThroughLandings(node.next, answers);
}

/** Advances past FIG_gender/FIG_hair, whose options are drawings rather than tree data. */
export function chooseDrawing(nodeId: string, answers: Answers, value: Gender | Hair): Advance {
  const node = TREE.nodes[nodeId];
  if (!node || node.optionsFrom !== 'drawings' || !node.field || !node.next) {
    throw new Error(`${nodeId} is not a drawing question`);
  }
  const next: Answers = node.field === 'gender' ? { ...answers, gender: value as Gender } : { ...answers, hair: value as Hair };
  return advanceThroughLandings(node.next, next);
}

// ---------------------------------------------------------------------------
// Resolving landings into catalogue items — deferred until here so a
// requirement answered later in the tree (hair, most often) still gates
// correctly. `requirementsMet` is the same check `catalogFor` runs; a
// habit-id `requires` is left permissive here exactly as it is on seeding —
// only the discovery screens gate it against a completed set.
// ---------------------------------------------------------------------------

function resolveSeeds(answers: Answers): CatalogItem[] {
  const filter = catalogFilterFor(profileFrom(answers));
  const seen = new Set<string>();
  const items: CatalogItem[] = [];
  for (const landingId of answers.landings ?? []) {
    const landing = LANDINGS[landingId];
    if (!landing) continue;
    for (const id of landing.seeds) {
      if (seen.has(id)) continue;
      const item = catalogById(id);
      if (!item || !requirementsMet(item, filter)) continue;
      seen.add(id);
      items.push(item);
    }
  }
  return items;
}

/** The catalogue items every landing reached so far seeds, deduplicated, filtered by the final profile. */
export function seededCatalogItems(answers: Answers): readonly CatalogItem[] {
  return resolveSeeds(answers);
}

/** The landing screen's one-tap-add offers — never one already seeded. */
export function offeredCatalogItems(answers: Answers): readonly CatalogItem[] {
  const seededIds = new Set(resolveSeeds(answers).map((i) => i.id));
  const filter = catalogFilterFor(profileFrom(answers));
  const seen = new Set<string>();
  const items: CatalogItem[] = [];
  for (const landingId of answers.landings ?? []) {
    const landing = LANDINGS[landingId];
    if (!landing) continue;
    for (const id of landing.offers) {
      if (seen.has(id) || seededIds.has(id)) continue;
      const item = catalogById(id);
      if (!item || !requirementsMet(item, filter)) continue;
      seen.add(id);
      items.push(item);
    }
  }
  return items;
}

/** The landing screen's count line: seeded habits across every landing reached that are due today. */
export function dailySeedCount(answers: Answers): number {
  return resolveSeeds(answers).filter((item) => item.cadence === 'daily').length;
}

/**
 * `Profile.domainOrder` for a set of seeded catalogue items: the order their
 * domains first appear, repeats dropped — not the order panels were chosen,
 * since a domain can feed more than one panel and the mapping is not one to
 * one (docs/onboarding/04-revisions.md §11). Exposed so Settings' "Redo what
 * you work on" can rebuild it from that redo's own seeds alone, the same way
 * changing the order is meant to work: run the work-on part again.
 */
export function domainOrderFromSeeds(items: readonly CatalogItem[]): DomainKey[] {
  const order: DomainKey[] = [];
  const seen = new Set<DomainKey>();
  for (const item of items) {
    if (seen.has(item.domain)) continue;
    seen.add(item.domain);
    order.push(item.domain);
  }
  return order;
}

/** Seeded and ready to save — the first, full onboarding run. */
export function buildInitialState(answers: Answers, newId: () => string, today: DateKey): AppState {
  const items = resolveSeeds(answers);
  const habits = items.map((item) => newHabitFromCatalog(item, newId(), today));
  const state: AppState = { schemaVersion: 2, logs: [], habits, notificationTime: null };

  const profile = profileFrom(answers);
  const order = domainOrderFromSeeds(items);
  if (order.length > 0) profile.domainOrder = order;
  if (Object.keys(profile).length > 0) state.profile = profile;
  return state;
}

/** Every catalogue habit id `landings.json` can seed or offer — used in tests to check it against `CATALOG`. */
export function everyLandingCatalogId(): readonly string[] {
  const ids = new Set<string>();
  for (const landing of Object.values(LANDINGS)) {
    for (const seedId of landing.seeds) ids.add(seedId);
    for (const offerId of landing.offers) ids.add(offerId);
  }
  return [...ids];
}
