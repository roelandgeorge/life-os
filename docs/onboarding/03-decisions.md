# Decisions

`00-brief.md` asked for a plan and for the open questions to be answered before
any file changed. This is that answer. `01-onboarding-spec.md` still wins
wherever this document is silent.

Build this in a fresh Sonnet session: "Read CLAUDE.md, then everything in
docs/onboarding/ starting with 00-brief.md. Build steps 2 to 7. Commit per
step."

Two guardrails before anything else:

- **Write step 4's validation test before step 5's screens.** The tree
  semantics get pinned before any UI is built on top of them.
- **Pin the copy with a test, not with care.** A test that walks
  `onboarding-tree.json` and asserts every string it carries appears verbatim
  in `src/i18n/en.ts` turns "character for character" into something the suite
  checks rather than something a reviewer squints at.

## Validation already run

All three data files were checked against section 9 of the spec before any
decision below was taken. Every check passes:

| Check | Result |
|---|---|
| 137 items, no duplicate ids | pass |
| Every `requires` value is known vocabulary or an existing id | pass |
| Every seed and offer id exists in the catalogue | pass |
| No seeded item has cadence `situational` | pass |
| Seeded `once` items are exactly H077, H078, H127, H129, H136 | pass |
| All 40 landings reachable from Q1 | pass |
| Shortest path 5 taps, longest 11 | pass, over 4623 walked paths |
| Partner and children never asked twice | pass |
| Nothing removed from the catalogue, no id renumbered | pass, 14 added and 13 edited |
| Every edit claimed in `02-catalog-changes.md` is present | pass |

Two things the data leaves implicit:

- `SIT_partner` and `SIT_children` carry `skipIf` but no top-level `next`, so a
  skipped node has no stated destination. Every option on both converges on one
  target, so the rule is **a skipped node goes where all its options go**.
  Without it the Partner branch never reaches the figure questions. Encode it
  and let the test pin it.
- Section 8 says the Partner branch reaches 11 taps. It reaches 10. The global
  longest is 11, which is what the acceptance check asks for, so this is a slip
  in the prose rather than a fault in the tree.

## The engine does not change

Spec section 4.2 proposed a rolling seven-day threshold. **It is rejected. No
engine file is touched.**

The behaviour wanted is: tick it and the picture improves now, skip a day and
it slips, tick again and it is fresh again. `core/steps.ts` already does this,
which is worth writing down because it is not obvious from the code:

- A daily habit closes a period every day, and the engine scores the period
  that closed the day before. Ticked is +1, missed is -1.
- `includeCurrentPeriod` adds today's tick on top immediately, so the panel
  shows one step higher in the same render as the tap.
- A missed day lands its -1 the next morning, and the next tick puts it back.

So `importance` keeps weighting and the 0.70 threshold stays, exactly as
CLAUDE.md documents.

Section 4.1, unfed panels hold, is **already true**: `steps.ts:101` returns
`START_STEP` for a panel nothing feeds and `steps.test.ts:71` pins it.

The brief's step 3 therefore collapses into steps 2 and 4.

**One consequence, flagged and not fixed.** Six landings seed two daily habits
onto the same panel: Z, B6, H1, H3, H8, N3. Ticking one of the two scores 0.50
to 0.67 against a 0.70 threshold, so the panel drops rather than rises. Ticking
both scores 1.00 and it rises. Watch this in step 7 and report it. Do not
change the engine to paper over it.

## The five remaining decisions

**Habit-id requirements.** A habit-id requirement never blocks seeding when its
gate is seeded in the same landing, and it still hides the item on the
discovery screens until the gate has been ticked at least once. Without this
P2n loses H130 and M4 loses H137, which section 3.2 plainly does not intend.
`habitHitDates` in `core/habits.ts` already answers "has this been ticked".

**The `starter` flag.** Keep the field, because `catalog.json` is taken as a
full replacement and re-deriving 43 flags is churn. Delete `startersFor`, which
has no consumer once the domain screens go. Replace `catalog.test.ts`'s three
starter invariants with one that says every starter is a real catalogue item.
`starter` is then unused metadata, and CLAUDE.md should say so, so it is a
known dead field rather than a trap.

**The partner drawing.** The partner appearance question leaves onboarding, as
the brief says, but the control stays in Settings' Profile section. Tearing the
two variant axes out of `scene.json` would cut 20 drawings out of
`docs/artwork-guide.md` while they are being drawn, and the brief says not to
touch the drawing system. Until it is set in Settings the partner slot falls
back a rung, which is what it already does for anyone who never opened that
section.

**`Profile.domainOrder`.** Same shape. The domain step leaves onboarding, the
Settings control stays, and `orderedDomains`, `MainScreen` and
`DiscoverScreen` are untouched. The field goes from two writers to one rather
than to none.

**Hair "none".** `Hair` gains `'none'`. No drawing exists, the resolver drops a
rung, so a bald choice renders the blond head. Add the ten
`head-<gender>-none<1-5>.png` filenames to `docs/artwork-guide.md` so the gap
is written down instead of silent.

## Where the current code contradicts the spec

| Spec | Current code | Work |
|---|---|---|
| Unfed panels hold (§4.1) | already true, `steps.ts:101`, pinned at `steps.test.ts:71` | none |
| Rolling seven-day threshold (§4.2) | `steps.ts:119-135` | rejected, none |
| No domain picker | `Onboarding.tsx` domains step, `ProfileFields.DomainOrderField` | remove from onboarding only |
| No three-pre-checked-per-domain | `catalog.ts:109` `startersFor`, `Onboarding.tsx:63,208` | remove |
| `requires` vocabulary of 7 plus habit ids (§4.3) | `catalog.ts:60` is `'partner' \| 'children'`, evaluated at `catalog.ts:105`, `habits.ts:180`, `scene.ts:100` | extend |
| Hair includes none (§5) | `types.ts:52`, `serialize.ts` `isHair` | extend |
| Profile carries `gym`, `employed`, `self-employed` (§5) | absent, `parseProfile` would drop them on import | add |
| Partner appearance question goes | `scene.json`'s partner slot reads `profile.partner.gender/hair` | keep the control in Settings |
| Third panel labelled People (§4.4) | `en.ts:25` says Network | one string |
| Landing screen is the main screen, offers off with one-tap add, count line | `MainScreen` has neither | new |
| Seeds committed after hair is known | H033 requires `hair`, asked after the landing is reached | ordering constraint |

Replacing `catalog.json` breaks `catalog.test.ts` as it stands: 43 starters, 7
of them non-habit or non-panel-driving, per-domain counts from 3 to 7. Expected,
and handled by the starter decision above.

## The work, one commit per step

**Step 2, catalogue.** Replace `src/content/catalog.json`. Extend `Requirement`
to `partner | children | hair | gym | employed | self-employed | single` plus a
habit id. Update `catalogFilterFor` in `core/habits.ts` and `requirementMet` in
`visual/scene.ts`, which must not break on values it does not handle. Rework
the starter block in `catalog.test.ts`. Delete `startersFor`. `single` means
`partner === false`.

**Step 3.** Folded into steps 2 and 4. No engine change.

**Step 4, tree data, and its test before any screen.** Copy
`onboarding-tree.json` and `landings.json` into `src/content/`. Rewrite
`core/onboarding.ts` around them. Encode the skipped-node rule above. Write
`core/onboarding.test.ts` covering every row of the validation table, plus the
copy-parity test.

**Step 5, screens.** `app/Onboarding.tsx` becomes a renderer over the tree:
screen, question, profile and landing node kinds, large tap targets, one option
per row or card, nothing below the fold at 390x844. `MainScreen` gains the
offers row and the count line. `styles/screens.css` for the panel cards.
`en.ts` for every string plus the People rename. Seeds are committed at the
landing screen, not when the landing is reached, because H033 requires `hair`
and the hair question comes later in the tree.

**Step 6, removals.** Out of `Onboarding.tsx`: the domain step, the per-domain
starter step, the appearance questions as the opener, the partner appearance
question. `ProfileFields.tsx` keeps every field, Settings still uses them all.

**Step 7, verify.** Walk every path at 390x844 with Playwright, which this
container already has. Report section 9 item by item with no softening. Then
`npm test`, `npm run typecheck`, `npm run build`.

**Docs last.** `README.md`, `CLAUDE.md`, `docs/plan/PLAN.md`, and the ten
filenames in `docs/artwork-guide.md`.

## Types and storage

`core/types.ts`: `Hair` gains `'none'`, `Profile` gains optional `gym`,
`employed`, `selfEmployed`. `store/serialize.ts` parses all four.

**No `SCHEMA_VERSION` bump.** Every new field is optional and `Hair` gains a
value rather than changing shape, so a stored v2 record and a v2 export both
still read. `serialize.ts:263` and `indexeddb.ts:76` stay untouched.

## Verification

- `npm test`, `npm run typecheck`, `npm run build` green.
- `onboarding.test.ts` pins all of section 9 in the node environment, no jsdom,
  consistent with phase 3's decision.
- Playwright at 390x844: the none path at 5 taps, an 11-tap path, partner asked
  once, Q1 on a second visit hiding the chosen card and the none row.
- Tick one seeded habit and confirm the panel moves in the same render.
  Back-date a missed day and confirm it slips. Tick again and confirm it
  recovers.
- Export, reset, import. The profile round trips with the three new fields.

## Not in scope

`steps.ts`, `periods.ts`, `due.ts`, `scene.ts`, `scene.json`, `Avatar.tsx` and
the artwork scripts are not touched. No copy, screen or habit is invented
outside `landings.json`. The schema is not bumped.
