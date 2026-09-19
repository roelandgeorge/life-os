# Revisions, second round

Five remarks after walking the built onboarding and Home. This document
**overrides** `01-onboarding-spec.md` and `04-revisions.md` wherever they
disagree, and it is now the last word in this folder.

Nothing here touches the engine, the panel step logic, the catalogue data or
the tree's questions and landings. It changes what is drawn and what is
tappable.

## 1. The opening screen goes

S0 showed the figure under "This is you in fifteen years. Everything starts in
the middle. It moves with what you do, both ways."

It is removed entirely, screen and copy. The onboarding starts at Q1.

The reason is the one that drives all of section 2: at that moment the app has
not asked what the user looks like, so the figure on screen is a stranger. The
screen existed to show that figure, so without it there is nothing left but a
tap that gives nothing back. What it explained about starting in the middle
belongs on the landing, where there is a real figure to explain.

- `src/content/onboarding-tree.json`: delete the `S0` node, set
  `"start": "Q1"`.
- `src/i18n/en.ts`: delete S0's text and its "Go on" button label.
- `src/app/App.tsx`: the full run's `start` becomes `Q1`.
- The `screen` node kind stays, because `LAND` still uses it.

## 2. No figure until the user has described it

The figure is currently drawn on every step, full size on S0 and the drawing
questions and as a compact strip everywhere else. Q1's five cards also each
carry that panel's drawing.

**The figure appears for the first time on the drawing questions**, where the
user is choosing it, and then on the landing. Every question before that shows
no figure and no panel art at all.

- `src/app/Onboarding.tsx`: render the `.portrait` block only when
  `current.optionsFrom === 'drawings'`. The `compact` class and its branch go
  with it.
- Q1's cards lose their image and become a label and a sub-line. `previewSrc`
  and `Q1_SLOT` lose their only caller and are deleted.
- `src/styles/screens.css`: the `.onboarding.compact` rules go, and the Q1 card
  rules drop their image box.

The `"render": "panel card"` field in the tree stays. It now means a card
carrying a label and a sub-line, which is what it will render as.

## 3. A habit row has two tap targets, not one

Today the whole row toggles the checkbox, and the three-dot menu sits on the
row whether it is wanted or not.

| Tap | Does |
|---|---|
| The checkbox, and the space around it | Ticks and unticks |
| The title, and the space around it | Expands and collapses the row |

**Only an expanded row shows the three-dot menu.** A collapsed row is a
checkbox and a title.

An expanded row shows the catalogue `note` when there is one, for example
"Foundational, affects every other domain." under eight hours of sleep. When
there is no note, and there is none for a habit the user wrote or for most
catalogue items, the row expands to show the menu and nothing else. Do not
invent text to fill it, and do not fall back to showing cadence or importance:
those are the machinery that `04-revisions.md` §9 took off the screen.

`app/DomainCatalog.tsx` already does exactly this split for catalogue rows,
`catalog-row` with a `catalog-row-main` button inside it. Reuse that shape and
its CSS rather than writing a second one, so a row reads the same in both
places.

- `src/app/MainScreen.tsx`: `HabitRow` gains an expanded state, the `<label
  className="checkin-tap">` shrinks to wrap only the checkbox, the title
  becomes a `<button>`, and the `habit-menu` block renders only when expanded.
- The note is `catalogById(habit.catalogId)?.note`, empty for a written habit.

## 4. The offers row on Home goes

The landing currently ends with a row of white cards, each a catalogue item
with a plus. They are `landings.json`'s `offers`.

Remove them from the screen. Those items are in the domain's own catalogue
already, so nothing becomes unreachable, and the plus in section 5 is how they
are added.

This chain loses its only consumer and goes with it:

- `src/core/onboarding.ts`: `offeredCatalogItems()`
- `src/app/App.tsx`: the `offers` field on the finished-run handoff
- `src/app/Shell.tsx`: `landingOffers` state and `onAddLandingOffer`
- `src/app/MainScreen.tsx`: the `landingOffers` and `onAddLandingOffer` props
  and the block that renders them

`landings.json`'s `offers` becomes unused metadata, exactly like
`CatalogItem.starter`. Leave the data in place, say so in CLAUDE.md beside the
`starter` note, and do not build anything new on it without checking who reads
it first.

The landing screen keeps its seeded habits and its count line.

## 5. One way to add a habit

A domain's own group on Home carries a plus. That is the only route, for
catalogue items and for writing your own.

That already holds once section 4 lands: `DomainCatalog` is the sole caller of
`onAddHabit`, and it is opened only from a domain group. Verify it rather than
assume it, and keep it true.

A domain-less group has no plus, which is right: a habit written from a
domain's catalogue arrives with that domain, so nothing can create a new
domain-less habit any more.

## What becomes dead

| Thing | Why it survives |
|---|---|
| `landings.json`'s `offers` | the data file is taken whole, like `catalog.json` |
| `CatalogItem.starter` | already recorded in CLAUDE.md, unchanged here |
| `"render": "panel card"` in the tree | still describes the card, now without art |

## Acceptance checks

These replace the ones in `01-onboarding-spec.md` §9 that they contradict.
Every other check there still stands.

- The onboarding's first screen is Q1. No screen says "This is you in fifteen
  years."
- No figure and no panel artwork appears on any step before the drawing
  questions.
- Q1's cards show a label and a sub-line, no image.
- On a habit row, tapping the checkbox toggles it and does not expand the row.
  Tapping the title expands it and does not toggle the checkbox.
- The three-dot menu is not in the DOM for a collapsed row.
- An expanded row with no catalogue note shows the menu and no empty gap.
- Home shows no offers row.
- `DomainCatalog` is the only caller of `onAddHabit`, and it is reachable only
  from a domain group's plus.
