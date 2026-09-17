# Phase 4 - onboarding, profile, Discover

The decision tree, a profile the user can change afterwards, and a real
catalogue browser. This is the executable plan for phase 4 of
[`PLAN.md`](PLAN.md). The decisions in [`phase-1.md`](phase-1.md) under
"Genomen beslissingen" still bind, in particular the two that define this
phase:

> **Onboarding**: uiterlijk eerst (man/vrouw, blond/donker), dan partner
> ja/nee, gezin/kinderen, domeinen aan/uit en in volgorde, per domein 3
> voorgeselecteerde starters ("Customize" voor de hele lijst), persona.

> Alleen man/vrouw. Achteraf altijd aanpasbaar.

Written in English to match README, CLAUDE.md and the code that reference it.

## Where the build stands

Checked against the repository. Phases 1, 2 and 3 are built and merged. The
suite is green, `tsc --noEmit` is clean for the app and for `api/`.

Phases 1 to 3 built the model, the renderer and the design system. What none of
them built is the way in. `src/app/Onboarding.tsx` is 49 lines of one static
explainer screen with no inputs and no state, and `App.tsx:46-50` writes
`{ schemaVersion: 2, logs: [], habits: [], notificationTime: null }`. A new user
therefore lands on an empty Home with no habits and no profile.

Three things were built for this phase and have been waiting since:

- `Profile.children`, `Profile.domainOrder` and `Profile.personaId` exist in
  `core/types.ts` and are written by nothing.
- `catalogFor(domain, filter)` and `startersFor(domain, filter)` in
  `core/catalog.ts` have no production caller. Their doc comments name
  onboarding's "3 per domain".
- `settings.catalog.added` sits in `i18n/en.ts` with no consumer, because
  nothing tracks what is already on the list.

Meanwhile Settings offers the 123-item catalogue as a single native `<select>`
built from an inline `CATALOG.filter(...)`, with no audience or requires
filtering, no metadata, no search and no duplicate detection.

## Context

Phase 4 is the first phase that hands a user a ready-made habit list, so it is
the first phase in which a seeded habit that moves nothing becomes a shipped
experience rather than a theoretical one. Measured against the catalogue as it
stands, only 19 of the 30 `starter` items can ever move a panel, because
`drivesPanel()` excludes `monthly` alongside `situational` and `once`:

- **finance**: all 3 starters are monthly, and finance is the only domain
  feeding the `wealth` panel. Accept the suggestions and wealth never moves.
- **family**: 1 monthly plus 2 `once` milestones, and family is the only domain
  feeding `partner`. Same outcome.
- **hospitality**: 3 items in the whole catalogue, 2 monthly habits and 1
  situational reminder, so nothing it offers reaches `network`.

That is CLAUDE.md's "a tick that changes nothing on screen breaks the causal
link the app rests on", reached by a different road.

The fix is one predicate. The engine is already period-generic:
`cadencePeriodDays` returns 30 for monthly, `hitInRange` already asks whether a
habit was hit anywhere inside its period, and `steps.ts` already credits +1 on
the closing day of a period that was hit and -1 on one that was not. Ticking a
monthly habit once inside its month is a hit, missing the whole month is a
miss. Only `drivesPanel` stands in the way.

### Decided in this planning session

- **Monthly moves the picture.** This reverses phase 1's "Maandelijks bestaat,
  maar alleen voor streaks en XP, niet voor het beeld", and it is recorded as a
  departure the way README records the other four. A commitment the user
  genuinely keeps once a month should move the picture once a month rather than
  never.
- **The persona step ships in phase 4**, writing `personaId`. The content layer
  that reads it arrives in phase 6. The step's copy therefore says what it is
  and claims no effect.
- **Discover is a full-screen sub-view pushed from Settings**, not a fourth
  tab. The tab bar stays at three, and phase 6 keeps the slot it needs for the
  Guide tab.
- **The domain step controls onboarding's length.** One starter screen per
  domain turned on, no cap, with a step counter so the length of what was just
  chosen is visible. Two domains is two screens, seven is seven.
- **No new `Profile` field, so no `SCHEMA_VERSION` bump.** `serialize.ts:263`
  and `indexeddb.ts:76` each hardcode a two-version assumption, and both stay
  untouched. `parseProfile` already parses all three dormant fields.
- **No component tests, no jsdom.** Phase 3's decision holds, which is why the
  decision tree is pure code in `core/` rather than branching inside a
  component.

## Scope: the line phase 4 does not cross

Phase 5 rebuilds Home and phase 6 adds the guide, the side quests, the
milestones and the recap. Phase 4 edits `MainScreen.tsx` on exactly one line,
for domain order, and touches no other part of it.

Phase 4 adds no gamification, no XP, no badges, and no persona content beyond a
name and a one-line blurb. It adds no artwork and changes no artwork code.

## 4.1 Monthly moves the picture

`core/habits.ts`:

```ts
export function drivesPanel(cadence: Cadence): boolean {
  return cadence !== 'situational' && cadence !== 'once';
}
```

`steps.ts:52` is the only production caller. What matters is what does **not**
change, and it is worth verifying rather than assuming:

- `due.ts` already treats monthly as a 30-day period. `isRestDay` returns false
  for it (period >= `REST_MAX_PERIOD_DAYS`), and `dailyTasksDone` leaves it out
  of Full Day for the same reason. Both are already correct under the new rule.
- `atRisk.ts` already includes monthly in the lapse warning and in the push
  digest (`RISK_MIN_PERIOD_DAYS` is 7). The warning now guards a real step loss
  instead of guarding nothing, so it gets more correct, not less.
- The preview already behaves as intended. A monthly habit hit on day 3 shows
  +1 from day 3 onwards through `currentPeriodOf`, and that preview settles
  into a real +1 when `closedPeriodEndingBefore` credits the period on day 30.
  The preview is a promise the closing day keeps.

Rewrite the doc comments on `drivesPanel` and `cadencePeriodDays`, both of
which state the old rule in prose today.

README gains a fifth entry under "Departures from the spec" stating the
reversal and the reasoning.

## 4.2 Starters that move the picture

`scripts/import-catalog.mjs`, `markStarters`: an item is eligible when
`kind === 'habit'` and its cadence drives a panel. Then top 3 by importance,
ties by lowest effort and then by id, exactly as now. Regenerate
`src/content/catalog.json` with `npm run import-catalog`.

Measured effect, only 3 of the 10 domains change:

| Domain | Change |
|---|---|
| social | H068 (situational reminder) out, H072 (weekly) in |
| hospitality | H081 (situational reminder) out, 2 starters left, both monthly |
| family | H077 and H078 (`once` milestones) out, 2 starters left |

Every remaining starter moves a panel. The other seven domains keep exactly the
starters they have today, so the diff is small and reviewable.

`catalog.test.ts`'s starter block is rewritten to import the real `drivesPanel`
from `core/habits.ts`, so the generator's own copy of the predicate cannot
drift without the suite failing:

- every starter is `kind: 'habit'` and drives a panel
- per domain, `starters.length === Math.min(3, eligibleCount)`
- no eligible non-starter outranks the lowest-ranked starter

**Two content gaps stay open and are recorded, not fixed.** Hospitality has
only 2 eligible items in the entire catalogue, both monthly. Family has 2, one
of which requires children, so a user with a partner and no children gets
exactly one family habit (H075, monthly). `network` and `partner` will
therefore move slowly for those users. Filling that is phase 6's content layer,
not this phase's.

## 4.3 The decision tree as data

New `src/core/onboarding.ts`. Pure: no DOM, no clock, no storage, in the same
sense as the rest of `core/`.

```ts
export type Answers = {
  gender?: Gender;
  hair?: Hair;
  partnerWanted?: boolean;
  partnerGender?: Gender;
  partnerHair?: Hair;
  children?: boolean;
  /** The domains turned on, in the chosen order. */
  domains?: readonly DomainKey[];
  /** Catalogue ids picked, per domain key. */
  picked?: Readonly<Record<string, readonly string[]>>;
  personaId?: string;
};

export type Step =
  | { kind: 'gender' }
  | { kind: 'hair' }
  | { kind: 'partner' }
  | { kind: 'partnerLooks' }
  | { kind: 'children' }
  | { kind: 'domains' }
  | { kind: 'starters'; domain: DomainKey }
  | { kind: 'persona' }
  | { kind: 'closing' };

/** The whole visible sequence, given the answers so far. */
export function steps(answers: Answers): readonly Step[];

/** The `Profile` these answers describe. Keys are omitted, never `undefined`. */
export function profileFrom(answers: Answers): Profile;

/** Seeded and ready to save. `newId` is injected the way useLifeOS injects one. */
export function buildInitialState(
  answers: Answers,
  newId: () => string,
  today: DateKey,
): AppState;
```

`steps()` holds the order phase 1 fixed: gender, hair, partner, `partnerLooks`
only when `partnerWanted === true`, children, domains, one `starters` step per
enabled domain in the stored order, persona, closing. A `starters` step carries
its domain rather than an index, so nothing branches on a domain key.

The component holds an index into the returned array and clamps it on every
render, because going back and turning a domain off shortens the sequence
underneath it.

`buildInitialState` drops an unknown catalogue id rather than throwing, which
matches the silent return `useLifeOS.addHabit` already does, and builds every
habit through the existing `newHabitFromCatalog(item, id, today)`. With nothing
picked it returns a state identical in shape to the literal in `App.tsx:47`.

**The profile-to-catalogue filter adapter** goes in `core/habits.ts`. That file
already imports from both `catalog.ts` and `types.ts` and already holds the
other catalogue-to-habit bridge, `newHabitFromCatalog`. `catalog.ts` cannot
import `Profile` without an import cycle, since `types.ts` imports `DomainKey`
and `Cadence` from it.

```ts
export function catalogFilterFor(profile: Profile | undefined): CatalogFilter;
```

It sets `audience` from `gender`, and builds `has` from
`partner.wanted === true` and `children === true`. When the profile has
answered neither question it leaves `has` undefined, which `catalogFor` already
reads as unknown and filters permissively. That is the one case a record
written before onboarding existed needs, and it needs no other special
handling.

**`domainOrder` semantics**, documented on the `Profile` type: the domains the
user turned on, in the order they chose. Anything absent is off. One field
carries both halves of phase 1's "domeinen aan/uit en in volgorde".

A new pure helper in `core/domains.ts`, taking the key list rather than a
`Profile` so no import cycle appears:

```ts
export function orderedDomains(order: readonly DomainKey[] | undefined): readonly DomainConfig[];
```

Listed domains first in the stored order, then the rest in `DOMAINS` order.
Nothing is ever hidden, so a habit added from Settings inside an off domain
still appears on Home. Ordering is the only effect this has.

## 4.4 Personas as data

`src/content/personas.json` plus `src/core/personas.ts`, mirroring how
`catalog.json` is read by `core/catalog.ts`. Phase 4 writes `id`, `name` and a
one-line `blurb` for five or six entries and nothing more. Phase 6 adds the
quotes, the sources and the daily wisdom to the same file without moving
anything.

Phase 1's content rule binds: historical figures by name, public domain only,
and fictional figures as an unnamed archetype.

The step is skippable, and its copy states that the choice is filed and can be
changed. It must not claim an effect the app does not yet have.

## 4.5 The shared fields and the shared picker

Two new modules under `src/app/`, not `src/ui/`. Phase 3's rule is that
`src/ui/` holds the base components, and both of these know about `Profile` and
`CatalogItem`. Keeping model knowledge out of the primitive layer is worth more
than the file location, and both are still shared by two screens.

`src/app/ProfileFields.tsx`: `GenderField`, `HairField`, `PartnerFields`,
`ChildrenField`, `DomainOrderField`. Each takes a value and an `onChange` and
holds no state of its own. Consumed by `Onboarding.tsx` and by
`SettingsScreen.tsx`, so a control changed in Settings is literally the same
control the user met during onboarding.

`DomainOrderField` uses a checkbox plus small up and down buttons per domain.
No drag library, which keeps the "no UI library" rule intact and is keyboard
reachable for free.

`src/app/HabitPicker.tsx`: the "earns a file at two consumers" case, used by
onboarding's starter step and by Discover.

```ts
export type PickerItem = { item: CatalogItem; checked: boolean; locked?: boolean };

export function HabitPicker({
  items,
  onToggle,
}: {
  items: readonly PickerItem[];
  onToggle: (id: string) => void;
}): JSX.Element;
```

One `Card interactive` per item holding a `Checkbox`, the title, a metadata
line (cadence, importance, effort, evidence) and the catalogue note when it is
non-empty. `locked` renders an already-added item as checked and
non-interactive.

## 4.6 Onboarding rebuilt

`src/app/Onboarding.tsx` becomes a renderer over `steps(answers)`. It holds
`Answers` plus an index, renders the step at that index, and shows Back, Next
and a step counter inside the `.onboarding-nav` that `screens.css:165-198`
already styles for exactly that pair. The existing closing copy becomes the
`closing` step and keeps its `.closing` class, which that file also already
styles and the current JSX never applies.

The avatar is recomputed per render as
`scene(START_STEPS, profileFrom(answers))` instead of the module-level constant
it is today, so the figure answers the appearance questions live. That is the
whole reason phase 1 put appearance first.

**The handoff.** Onboarding sits outside `Shell` and has no `useLifeOS`, so
`onComplete` gains a payload and `App.tsx` builds the state:

```ts
// Onboarding.tsx
{ onComplete: (answers: Answers) => void }

// App.tsx
async function finishOnboarding(answers: Answers) {
  const initial = buildInitialState(answers, () => crypto.randomUUID(), dateKeyFor(new Date()));
  await store.save(initial);
  setPhase({ kind: 'ready' });
}
```

The clock and the id source stay at the `App` boundary, which is where
`useLifeOS` already keeps both, and `core/onboarding.ts` stays pure.

`src/i18n/en.ts` gains the `onboarding.*` block. Phase 3 added no copy at all,
and this phase adds most of what it skipped.

## 4.7 Discover

New `src/app/DiscoverScreen.tsx`, opened full-screen from a button in Settings
where the `<select>` sits today, and closed with a back control.

- Sections in `orderedDomains(state.profile?.domainOrder)` order.
- Each section filtered through
  `catalogFor(domain, catalogFilterFor(state.profile))`, which is the first
  time the `audience` and `requires` tags do anything in the UI.
- A plain text search filtering titles across all domains, as a raw `<input>`
  inside the existing `Field`, matching how `SettingsScreen` already does text
  input. There is no `TextInput` in `src/ui/` and one consumer does not earn
  one.
- Already-added items render `locked`, which closes today's duplicate bug and
  finally gives `settings.catalog.added` a consumer.
- Adding only. Removal stays in Settings' habit editor, where it already exists
  and already says "Remove", so nothing in Discover can soft-delete a habit by
  accident.

**Discover shows `kind: 'habit'` only, which is 75 of the 123 items.**
Milestones, challenges and reminders are phase 6 concepts with their own homes
coming: a milestone checklist, the weekly side quest, and the contextual
reminder card. Offering them as habits is a category error, because a milestone
is not a recurring tick and a reminder asks nothing of any period. Habits the
user already added from those kinds are untouched and keep working.

## 4.8 The Settings profile section and the domain order

`AppearanceSection` (`SettingsScreen.tsx:310-393`) is replaced by a Profile
section built from `ProfileFields`, covering gender, hair, partner, children
and domain order. `children` gets a UI for the first time.

This is what makes phase 4 safe for the install already on the user's phone.
That record is v2 and will never see onboarding, and every answer onboarding
collects has to be reachable from here instead.

`MainScreen.groupHabits` (`MainScreen.tsx:40-50`) swaps its
`for (const domain of DOMAINS)` loop for
`orderedDomains(state.profile?.domainOrder)`. One line, and it is the only edit
phase 4 makes to Home.

## 4.9 Docs

- README: the fifth departure (monthly moves the picture), a section describing
  the tree and what it seeds, and Discover under "Layout".
- CLAUDE.md: `core/onboarding.ts`, `core/personas.ts`, `content/personas.json`,
  `app/DiscoverScreen.tsx`, `app/ProfileFields.tsx` and `app/HabitPicker.tsx`
  in the project structure, plus the `domainOrder` semantics and the rule that
  monthly now moves a panel.
- `PLAN.md`: phase 4 set to Built.

## Critical files

| File | What happens |
|---|---|
| `src/core/habits.ts` | `drivesPanel` accepts monthly, new `catalogFilterFor` |
| `src/core/domains.ts` | new `orderedDomains` |
| `src/core/onboarding.ts`, `onboarding.test.ts` | new: the tree, `profileFrom`, `buildInitialState` |
| `src/core/personas.ts`, `personas.test.ts`, `src/content/personas.json` | new |
| `scripts/import-catalog.mjs`, `src/content/catalog.json` | starter rule, regenerated |
| `src/core/catalog.test.ts`, `steps.test.ts`, `habits.test.ts` | starter and monthly invariants |
| `src/app/Onboarding.tsx` | rebuilt as a renderer over `steps()` |
| `src/app/App.tsx` | `onComplete(answers)` and the initial-state handoff |
| `src/app/ProfileFields.tsx`, `HabitPicker.tsx`, `DiscoverScreen.tsx` | new |
| `src/app/SettingsScreen.tsx` | Profile section replaces Appearance, Discover replaces the `<select>` |
| `src/app/MainScreen.tsx` | one line, domain order |
| `src/core/types.ts` | `domainOrder` doc comment only, no field added |
| `src/i18n/en.ts`, `src/styles/components.css`, `screens.css` | copy and the new markup |
| `README.md`, `CLAUDE.md`, `docs/plan/PLAN.md` | docs |

Reused rather than rebuilt: `catalogFor` and `startersFor`, written in phase 1
for exactly this and never called since, `newHabitFromCatalog`, `HabitPatch`,
`updateProfile`, the merge shape of `withPartner`, every `src/ui/` primitive,
the `.onboarding-nav` and `.closing` CSS phase 3 already wrote, the
JSON-into-a-typed-module pattern of `core/catalog.ts` for personas, and
`scene()` unchanged.

Untouched on purpose: `core/steps.ts`, `core/periods.ts`, `core/due.ts`,
`core/atRisk.ts`, everything under `src/visual/`, `store/migrate.ts`,
`store/indexeddb.ts`, `store/serialize.ts`, `api/`, and every artwork script.

## Tests

All pure, all in the existing `environment: node` setup.

`src/core/onboarding.test.ts`

- `partnerLooks` appears only when `partnerWanted === true`
- one `starters` step per enabled domain, in the stored order
- no domains on still yields a valid sequence, with no `starters` steps
- `profileFrom` omits keys rather than writing `undefined`, and `partner`
  carries gender and hair only when wanted
- `buildInitialState` seeds one habit per picked id, with `startDate === today`,
  the catalogue's importance, and `catalogId` set
- an unknown catalogue id is dropped rather than thrown
- nothing picked yields a valid empty state
- `catalogFilterFor`: a yes answer becomes a `has` entry, a profile that
  answered neither question leaves `has` undefined, and gender sets `audience`

`src/core/catalog.test.ts`: the starter block rewritten against the real
`drivesPanel`.

`src/core/steps.test.ts`: "monthly never drives a panel" (line 83) is replaced
by a monthly habit stepping its panel on the closing day, and by a mid-period
hit showing in the preview before it settles.

`src/core/habits.test.ts`: `drivesPanel('monthly')` flips to `true`.

`src/core/personas.test.ts`: ids unique, `name` and `blurb` non-empty.

`src/store/serialize.test.ts`: a round trip of a profile carrying `children`,
`domainOrder` and `personaId`.

## Verification

`npm test`, `npm run typecheck` and `npm run build` green.

1. **Export the real data from the phone before anything else.** 4.1 recomputes
   every panel from the whole log, so any monthly habit already on the list
   starts moving the picture retroactively. This is not a migration, it is a
   different answer to the same question asked of the same data. Check whether
   the deployed picture moves on the day this ships and confirm it moved the
   way it should have.
2. `npm run placeholders && npm run slice` first, then `npm run dev`. Without
   placeholders there is no head, no partner and no gender variant of the body,
   so the appearance steps change nothing on screen and the live preview cannot
   be verified at all.
3. Settings, Reset, then walk the tree. Turn on 2 domains and confirm 2 starter
   screens. Go back, turn on 7, confirm 7 and confirm the counter follows. Turn
   partner off and confirm the partner looks step leaves the sequence.
4. Finish onboarding, then check Home: the picked habits are there, grouped in
   the domain order chosen, each carrying the catalogue's importance.
5. Tick a monthly habit. Its panel's preview moves in the same second and stays
   up for the rest of the period.
6. Discover: search, add, and confirm an added item shows as added and cannot
   be added twice. Confirm the family items requiring children are absent after
   answering no and present after answering yes.
7. Settings, Profile: change gender, hair, partner, children and the domain
   order. Home regroups, the picture answers, and History's partner row
   follows.
8. Export, reset, import. The full profile including `domainOrder` and
   `personaId` survives the round trip.
9. Keyboard only through onboarding and Discover. Every control shows the phase
   3 focus ring, and the domain up and down buttons are reachable.

## Risks

**The live preview shows nothing today.** `artwork.json` holds 15 files, there
is no `you/` directory, no head and no partner art, and `body` resolves from
the bare rung because only `body1-5.png` exist. Changing gender or hair
currently moves not one pixel on the deployed app. Appearance goes first for a
payoff that arrives with the drawings, not with this phase. This is the largest
gap between what the plan intends and what the user will see.

**Monthly re-scores history.** See verification step 1. Export first.

**Onboarding can get long.** Ten domains on is ten starter screens after six
profile screens. The domain step is where that is chosen and the step counter
is what makes it visible.

**The persona step has no consequence until phase 6.** Decided deliberately.
The risk is copy that implies otherwise, so the step has to say what it is.

**Content gaps stay open.** Hospitality has two usable items, both monthly, and
a partner without children yields one family habit. Those panels will move
slowly, and honestly.

## Working between sessions

This plan was written on Opus in plan mode. Build it in a fresh Sonnet session:
"Read CLAUDE.md and docs/plan/phase-4.md and build phase 4. Commit per
sub-step." Come back to Opus only for a real architectural knot.

Everything in this plan is decided. There is nothing left to ask before
building.
