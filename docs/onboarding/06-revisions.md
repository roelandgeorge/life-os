# Revisions, third round

Remarks from using the built app. This document **overrides**
`01-onboarding-spec.md`, `04-revisions.md` and `05-revisions.md` wherever they
disagree, and it is now the last word in this folder.

Nothing here touches the engine, the panel step logic, the catalogue data or
the tree's questions and landings. Two of the eight sections reverse a
decision made earlier in this folder or in `docs/plan/phase-3.md`, and both
say so.

## 1. The small square actions are the size of the tick box

`05-revisions.md` settled a domain group's +, a catalogue row's + and a habit
row's ✕ at one size, 44x28. At that size they are the heaviest thing in a row
whose point is the habit's name: a 44px-wide danger glyph beside an 18px
checkbox reads as the bigger of the two promises.

They are now 22px square, against the 18px tick box they sit beside. That is
well under `--tap`'s 44px floor, deliberately and against that rule: these are
row furniture, not what the screen is asking you to press, and the gap between
them (`--space-3`) is what keeps them separable by thumb.

`.icon-action` is still one rule for all four, so no two of them can drift.

## 2. Every habit can be edited, including one from the catalogue

**This reverses `04-revisions.md` §9**, which said a catalogue habit's title,
weight, cadence and domain are not the user's to change, and gave a catalogue
row's menu Remove only.

The reasoning then was that showing those controls exposes the machinery. What
using it showed is the opposite case: the catalogue is one person's wording of
a habit, and a habit you cannot word your own way is someone else's habit. A
row's menu now offers Edit and Remove for every habit, catalogue or not.

The form is the one `DomainCatalog` already uses to write a habit, so there is
one form, not two. It now collects:

| Field | Note |
|---|---|
| the title | as before |
| the line under it | new, see section 3 |
| how much it matters | three choices, 5 / 3 / 1, as before |
| how often | daily, weekly, monthly, as before |
| an emoji | as before |

The domain is **not** editable and is not in the form. It decides which panel
the habit moves, and moving a habit between panels through a row's menu is a
different decision from wording it.

`WriteHabitForm` therefore no longer takes a `domain`: the caller adds it when
creating (`DomainCatalog` knows which domain it is), and editing never sets
one.

## 3. A habit carries its own note

Section 2 needs somewhere to put an edited subtitle. `UserHabit` gains
`note?: string`.

The fallback is the point: **absent** means fall back to the catalogue item's
own note, so an unedited catalogue habit still reads as `catalog.json` wrote
it and a later catalogue edit reaches every user who never touched that row.
Editing copies the catalogue note into the form as its starting value, so
clearing the field is how you get a row with no line at all, rather than
silently restoring the original.

Capped at `MAX_HABIT_NOTE_LENGTH` (160), which fits every note in the
catalogue and keeps a row's expansion to one paragraph.

No schema bump: the field is optional, so a stored v2 record and a v2 export
both still read. `store/serialize.ts` parses it.

## 4. Home's copy

| Line | What happens |
|---|---|
| "Today's ticks moved 2 of them up a step." | **Removed.** `main.nextMove.*` and `nextMove()` go with it. |
| "Filling in Sunday. The picture still shows today's standing." | **Moves above the habit list**, directly under the day picker that caused it. It is an instruction about what the next tap will do, so it has to be read before the taps, not after them. |
| the day name inside it | **Pinned to `en-GB`.** `toLocaleDateString(undefined, …)` used the device locale, so a Dutch phone rendered "zondag" inside an English sentence. |
| "Fifteen years out. Everything in the middle." | **Replaced by "This is you in fifteen years."** It was two sentences doing one job badly: the first half is the only part the user needs, and the second half — that every panel starts at the middle step — is something one tick demonstrates better than a line of copy can explain. This is the line `05-revisions.md` §1 deleted with S0; it works here because on the landing there is a real figure under it. |
| "Three boxes today." | **Removed, and the whole count line with it**, zero included. See below. |

### The count line goes entirely

Two separate reasons, and the second is the one that settles it.

**The count was never a target.** `dailyTasksDone()` asks whether
*everything* due today is ticked, and that is what the celebration and the
Full Day marker answer to. There is no partial goal. So "Three boxes today."
named nothing but the length of the list three centimetres below it, which
the list already states.

**And "Nothing due today." was never true.** `01-onboarding-spec.md` §6
defined the count as seeded habits with cadence `daily`, but Home decides
what to show with `isDueToday()`, and a freshly seeded weekly or monthly
habit is due in its first open period. Measured across all 40 landings:

| | |
|---|---|
| landings with no `daily` seed | 21 |
| of those, landings with nothing actually due on day one | **0** |

So the zero line was shown on 21 of 40 landings and was wrong on all 21. The
"seed few, so Home looks empty" worry it existed for does not occur.

What goes with it: `main.landing.count.*`, LAND's `countLine` map in
`onboarding-tree.json`, `Step.countLine` (which had no reader anyway, LAND
being a terminal hand-off the renderer never reaches), `dailySeedCount()` and
its test. `JustOnboarded` was only ever carrying that count, so it collapses
to a bare `justOnboarded?: true` flag on the ready phase, which is all the
landing headline needs.

The landing keeps the headline and nothing under it.

## 5. See your best version is a glyph

A full-width bronze button was the widest thing on Home, for a view most
sessions never open, and it sat between the headline and the list it pushed
down.

It is now a 36px square button on the headline's own line: **★** to look, **↺**
to come back. Same control, same place, both states. The label each state had
is now its `aria-label`, so nothing is lost to a screen reader.

## 6. One window across History

Three windows were on that screen at once: 90 days of panel steps, 30 days of
Full Day density, and a per-habit strip that was 30 cells for a daily habit
and 12 periods for anything else. Every habit row had to carry a label saying
which, because a filled cell meant a different span on every row.

One window fixes the labels by making them redundant. `app/history.ts` holds
`HISTORY_DAYS = 28` and `cellsForPeriod()`; every track on the screen reads
it, Home's Full Day strip included:

| Cadence | Cells |
|---|---|
| daily | 28 |
| weekly | 4 |
| monthly | 1 |

`history.habit.daily` and `history.habit.periods` are gone, and
`history.fullDay` no longer names a span.

## 7. Settings has no title and no rules

Four sections, each a heading over a button or two, each separated by a
1px rule and `--space-6`. The title said "Settings" above a tab already
labelled Settings.

- The `<h1>` goes, and `settings.title` with it.
- The rules go. The whitespace already separates the sections.
- "Figure" and "What you work on" lose their headings: the buttons under them
  read "Redo the figure" and "Redo what you work on", so the heading was the
  same words twice. Both buttons now sit in one heading-less section.
- The reminder note is one line instead of three. The test-push note and the
  reset note go entirely.

## 8. One font

**This reverses `docs/plan/phase-3.md`'s type decision**, which self-hosted
Instrument Serif for `.headline` and `.onboarding h2`.

Removed: the `@font-face` block in `base.css`, the `--serif` token,
`public/fonts/` (the woff2 and its OFL), and `fonts/*.woff2` from the PWA
precache glob. `--sans` is now the only family token, and the headline keeps
its 28px size and gains `--leading-tight`.

The reason is not that the serif was wrong. It is that a second voice for
three headlines was paying a webfont, a precache entry and a block of
metric-override descriptors for a distinction nothing else in the app rested
on.

## Acceptance checks

- A domain's +, a catalogue row's +, a habit row's ✎ and its ✕ are all 22px
  square.
- Every habit row's menu has both Edit and Remove, whether or not the habit
  came from the catalogue.
- Editing a catalogue habit opens the form with the catalogue's own note in
  the second field; saving a different one shows the new one when the row is
  expanded; clearing it shows no line.
- The habit's domain is not in the form.
- No line on Home reads "Today's ticks moved …".
- With the day picker on a past day, the "Filling in …" line is above the
  first habit row, and the day is named in English on a non-English device.
- The landing headline reads "This is you in fifteen years." and carries no
  line under it, on any landing. No screen counts boxes.
- See your best version is a square glyph button beside the headline, ★ and ↺,
  each with the old label as its accessible name.
- History's subhead says 28 days, no habit row states its own span, and a
  daily / weekly / monthly habit shows 28 / 4 / 1 cells.
- Settings has no `<h1>`, no rule between sections, and two headings in total.
- No `@font-face` and no `--serif` anywhere; `.headline` computes to `--sans`.
