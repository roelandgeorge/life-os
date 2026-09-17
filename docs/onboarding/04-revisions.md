# Revisions

Ten remarks after reading the spec, before any of it was built. This document
**overrides** `01-onboarding-spec.md` and `03-decisions.md` wherever they
disagree. Read it last, and treat the spec's "copy is final" rule as applying
to the strings here rather than the ones it replaces.

Nothing in this document changes the engine, the panel step logic or the
drawing system.

## 1. The opening question asks what you want to work on

The spec opens with "Which one is furthest from where you want it?". That is a
diagnosis question dressed as a choice, and it asks the user to rank their own
life before they have done anything.

| Node | Spec | Use instead |
|---|---|---|
| Q1 | Which one is furthest from where you want it? | What do you most want to work on? |

"Most" is load-bearing: the answer is the first thing the user names, and
section 11 turns that order into the order their habits sit in on Home.

The five panel cards, their labels and their sub-lines are unchanged. The sixth
row is unchanged.

## 2. The partner and children questions are asked plainly

| Node | Spec | Use instead |
|---|---|---|
| Q2N | Is there someone? | Do you have a partner? |
| Q3Ny | Children? | Do you have children? |
| SIT_partner | Is there someone? | removed, see section 3 |
| SIT_children | Children? | removed, see section 3 |

## 3. The Situation block goes

The spec asks partner and children a second time, at the end, for everyone who
did not go down the Partner branch. That block is removed entirely, along with
its "Two things the drawing needs." header.

The reasoning, in the user's words: a partner panel appears when you choose to
work on a partner or a relationship, and not otherwise. There is no need to ask
a second time whether there is someone in your life.

What follows from that:

- `partner` and `children` are asked **only inside the Partner branch**, where
  the answer picks the landing. Nowhere else.
- Every item in the catalogue carrying `requires: children` is in the `family`
  domain, which only the Partner branch reaches, so nothing else needs the
  answer.
- Choosing the Partner card sets `profile.partner.wanted = true`, which is what
  `scene.json`'s partner slot already keys off. Do not choose it and the panel
  is not drawn, which is the behaviour the requirement already gives.
- The tree therefore ends at the figure questions. Path lengths change and
  `03-decisions.md`'s counts no longer hold. The validation test must be
  rewritten against the new tree rather than against section 8 of the spec.

## 4. The partner's appearance is never asked

No question, no Settings control. `scene.json`'s partner slot keeps its variant
axes and falls back a rung, so one partner drawing is used regardless. The
twenty partner drawings in `docs/artwork-guide.md` stay in the guide, and only
five of them are reachable until something asks for the rest. Write that down
in the guide rather than leaving it to be rediscovered.

## 5. The onboarding is two parts, separately repeatable

There are two things it collects and they are independent:

- **The figure.** Gender and hair.
- **What you work on.** Q1 through the landings.

Either can be run on its own. Settings gets two buttons and nothing else that
touches the profile:

- Redo the figure
- Redo what you work on

Running "what you work on" again reaches the domains you did not choose the
first time, which is the only way to reach them, see section 6.

A first run is both parts, in the spec's order: what you work on first, the
figure last.

## 6. The catalogue is reached from Home, per domain, and nowhere else

`app/DiscoverScreen.tsx` as a full-screen browser opened from Settings is
replaced. Settings' "Browse the catalogue" button goes.

Each domain group on Home gets a control that opens **that domain's catalogue
and only that domain's**. A domain you did not choose has no group on Home and
therefore no way in. That is deliberate: a domain you are not working on does
not exist on your screen, and the way to start working on it is to redo the
"what you work on" part.

## 7. The catalogue row shows the task and nothing else

Today's row carries cadence, importance, effort and evidence as a metadata
line. Remove all of it.

- **Collapsed:** the task title, plus the effort marker from section 8.
- **Tapped:** the row expands and shows the catalogue `note`, for example
  "Foundational, affects every other domain." for H001. The note is empty for
  most items, and an expanded row with no note shows nothing extra rather than
  an empty gap.
- Adding stays one tap and does not require expanding first.

## 8. Effort is shown visually, in three levels

Use the existing `effort` field. `low`, `medium` and `high` on all 137 items,
so no content work and nothing to re-tag. Cost is not in the data and is not
being added.

One mark per row, three states, readable without colour alone since the app is
dark-only and `tokens.test.ts` already enforces contrast. Pick the form during
the build and keep it to one glyph or bar, not a badge with a word in it.

## 9. Nothing from the catalogue can be edited

A habit added from the catalogue is fixed: its title, weight, cadence and
domain come from the catalogue and are not the user's to change. Showing those
controls exposes the machinery, which is the same reason partner and children
moved out of Settings and into questions.

The habit editor in Settings is removed.

**The menu on a habit row on Home**, opened by a long press or a three-dot
control:

| Habit | Menu |
|---|---|
| From the catalogue | Remove |
| Written by the user | Edit, Remove |

Remove stays available for both. Removing is not adjusting: without it a list
only ever grows, and the soft delete through `removedDate` already exists and
keeps history correct.

**Writing your own habit** is offered at the bottom of a domain's catalogue
screen, so it arrives with that domain already filled in. The form collects:

- the title
- how much it matters, three choices
- how often, the cadence
- the domain, pre-filled from where the form was opened
- an emoji of the user's own

The three choices and what they store:

| On screen | `importance` |
|---|---|
| Important | 5 |
| Medium | 3 |
| Not important | 1 |

`UserHabit` gains `emoji?: string`. It is filing only, exactly like `color`,
and nothing may ever map it back to a domain or a panel. No colour picker is
offered, and `color` stays in the type for habits migrated from v1 and for the
domain default.

## 10. Settings keeps four things

After sections 5, 6 and 9, Settings holds:

- Redo the figure
- Redo what you work on
- Daily reminder
- Data: export, import, reset

Gone: the Profile section (gender, hair, partner, children, domain order), the
habit editor, and the catalogue button.

`Profile.domainOrder` is written by the onboarding, see section 11.

## 11. Ask until they stop, and that order is the order

The spec caps it at two panels: "Two panels is the cap. After the second
landing, the 'One more?' screen is not shown." That cap is removed. Take as
many as they want.

The loop:

| Node | Spec | Use instead |
|---|---|---|
| Q1, first visit | Which one is furthest from where you want it? | What do you most want to work on? |
| Q-More | One more, or is that it? | Is there anything else you want to work on? |
| Q-More options | One more. / That's it. | Yes. / No, that's it. |

Q-More is shown after **every** landing, not once, and it is not shown when all
five panels have been chosen or when Q1 was answered "None of them". Q1 on a
repeat visit hides **every** panel already chosen, not only the first, and never
shows the "None of them" row.

**The order they are named in is `Profile.domainOrder`.** Do not derive it from
the panels, because a domain can feed more than one panel and the mapping is
not one to one. Derive it from the seeds: walk the seeded habits in the order
they were seeded, take each one's `domain`, drop repeats. That is exactly "the
order I picked things in", it needs no new field, and `orderedDomains` and
`MainScreen` stay as they are.

Changing the order means running the "what you work on" part again, which is
what section 5 already provides.

Two consequences worth stating rather than discovering:

- **The path has no fixed length any more.** The spec's "longest path is 11"
  check cannot survive. Replace it with a bound per panel: one Q1 tap, one or
  two branch taps, one Q-More tap, so five panels plus the two figure questions
  is the ceiling.
- **Home can get long.** Five panels at up to two seeds each is ten habits on
  day one, against the spec's "seed few" intent. That is the user's choice to
  make each time they answer Q-More, and the count line on the landing screen
  is what makes the size of it visible. Do not add a cap.

## What this changes in the earlier documents

| Document | Still binding | Overridden |
|---|---|---|
| `00-brief.md` | the constraints, the order of work, the rule about asking | step 6's list of removals, extended by sections 6, 9 and 10 |
| `01-onboarding-spec.md` | sections 1, 2, 4, 5, 7, the landings table | §3.4's two-panel cap, §6's Q1, Q-More and Situation block copy, §8's path counts, §9's checks that rest on them |
| `02-catalog-changes.md` | all of it | nothing |
| `03-decisions.md` | the engine decision, the habit-id rule, the starter decision | the partner-appearance and `domainOrder` decisions, both of which kept Settings controls that are now gone |

## Acceptance checks that replace the affected ones

- Q1 reads "What do you most want to work on?".
- Q-More is shown after every landing, and not after the fifth panel or after
  "None of them".
- Q1 on a repeat visit shows only panels not yet chosen, and never the "None of
  them" row.
- `Profile.domainOrder` matches the order the seeded habits' domains first
  appear, with repeats dropped.
- A user-written habit's three importance choices store 5, 3 and 1.
- Partner and children are each asked at most once, only inside the Partner
  branch, in the words in section 2.
- No Situation block exists, and no screen carries "Two things the drawing
  needs.".
- A domain not chosen has no group on Home and no route to its catalogue.
- A catalogue row shows the title and the effort marker and nothing else until
  it is tapped.
- A catalogue habit's menu offers Remove only. A user-written habit's offers
  Edit and Remove.
- Settings contains exactly the four things in section 10.
- The figure part and the "what you work on" part each run on their own from
  Settings and write only their own fields.
- Every remaining check in `01-onboarding-spec.md` §9 that does not depend on
  the Situation block or the path counts still passes.
