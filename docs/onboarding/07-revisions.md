# Revisions, fourth round

Remarks from using the built app. This document **overrides** every earlier
document in this folder wherever they disagree, and it is now the last word
here.

Nothing touches the panel step logic, the tree's questions or its landings.
One catalogue row changes, because its cadence and its own title disagreed.

## 1. A cadence the model always had, and the screen never offered

"Train full body 3–4x a week" was filed as `weekly`. A weekly habit closes
one period a week, so one tick satisfied the whole week and the title was a
promise the row could not keep.

`{ everyDays: n }` has been in `Cadence` since phase 1, and
`cadencePeriodDays`, `drivesPanel`, `store/serialize.ts` and
`store/migrate.ts` all handle it. Only the editor never offered it. It does
now, as `core/habits.ts`'s `CADENCE_CHOICES`:

| On screen | Stored | Period |
|---|---|---|
| Daily | `'daily'` | 1 |
| Every other day | `{ everyDays: 2 }` | 2 |
| Weekly | `'weekly'` | 7 |
| Every 2 weeks | `{ everyDays: 14 }` | 14 |
| Monthly | `'monthly'` | 30 |

Data, not a branch, and compared with `sameCadence()` rather than `===`,
since two of them are objects.

**H019 moves to `{ everyDays: 2 }`.** Every other day is three or four times
a week, which is what its title says. It is the only catalogue item whose
title states a frequency, so nothing else needs re-filing.

`habits.test.ts` pins the list, pins that every choice drives a panel (so no
option quietly disconnects a habit from the picture), and pins H019.

## 2. Importance is not the user's to set

The editor's three-choice importance picker is removed, and with it
`CUSTOM_IMPORTANCE` and its three strings. A habit the user writes takes
`DEFAULT_IMPORTANCE` (3); a catalogue habit keeps the catalogue's own value,
and editing no longer touches it.

`importance` is the weight the panel engine reads. It is machinery, which is
the same argument `04-revisions.md` §9 made for hiding cadence and
importance from a catalogue row, and the one thing in that argument that
still holds after `06-revisions.md` §2 opened the rest of the row to
editing.

## 3. Editing happens in the row

`06-revisions.md` §2 gave every habit an Edit action but kept the form it
opened: a dark panel below the row, with its own background, its own
stacked inputs and its own layout. Tapping edit changed everything about
the row except the thing being edited.

**The row becomes editable in place.** It keeps its surface, its border,
its position and its typography. The title and the line under it turn into
carets where that text already was, and the only thing that appears is the
cadence.

Some patterns considered and why not:

| Pattern | Why not |
|---|---|
| Bottom sheet | Right when there are many fields. Three fields do not earn a new surface sliding over the list. |
| Long press | A hidden gesture with no affordance, and it collides with the tap-to-expand the row already uses. |
| Swipe to reveal | Good for one destructive action, not for editing text. |
| A detail screen | Heaviest of all, and it loses sight of the list the habit lives in. |

What makes it read as the same row rather than as something new:

- The title field carries the row's own colour, weight and leading, and
  **wraps** rather than scrolling. That is why it is a `<textarea>` that
  grows to its content and not an `<input>`: a one-line input scrolls a long
  title out of view, which the read-mode row never does.
- The emoji field sits exactly where the tick box sits, carrying the same
  margin the browser puts on a checkbox, so the title starts at the same x
  in both states. Measured: `x=90 w=191` reading and editing alike.
- The caret lands at the end of the existing text rather than selecting all
  of it. This is an edit of something, not a replacement of it.
- Enter commits, Escape cancels.
- A dashed underline is what says a field is a field, since an empty one is
  otherwise invisible.

`WriteHabitForm` becomes `HabitEditor`, and `.write-habit-form` goes. The
catalogue's "Write your own" is the same component with empty fields, so
writing a habit and editing one look the same because they are.

## 4. The row's two actions sit on the row

They were on a line of their own under the title, the remove action in
`--danger` red.

They now sit on the row's first line, in the space the streak and the
last-hit date vacate when the row expands. Putting them beside the streak
instead would squeeze the title, which is the one thing expanding must not
move.

Both take `--paper-dim`, the row's own quiet voice. A red remove was a
louder promise than removing a row deserves.

**And they are drawn, not typed.** `✎`, `✕` and `🗑` are whatever the
device's symbol or emoji font makes of them, at whatever weight and in
whatever colour. `src/ui/Glyph.tsx` holds five paths on one stroke width
taking `currentColor`: pencil, trash, plus, check, cross. Remove is a
**trash can** now, not a cross, because a cross on a row already means
"close this".

Every control on an expanded or editing row centres on the **title's first
line**, not on the whole row. Once a row can be three lines tall, centring
on the row drops the tick box and the actions half a line below the title
they belong to.

One CSS trap worth writing down: the rule must be `button.icon-action`, not
`.icon-action`. `button.small` in `components.css` is a class on an element
and outranks a bare class, so `padding: 0` silently lost and squeezed the
drawn glyph to 4px wide. A text glyph had overflowed visibly and hidden the
bug.

## 5. History states its window once, in the tab, not in a subhead

`history.subhead` ("Last 28 days.") goes. `06-revisions.md` §6 made every
track on the screen share one window precisely so no row has to say which,
and a line at the top saying it for all of them is the same redundancy one
level up.

## 6. Settings gets its title back, and one row for data

`06-revisions.md` §7 removed the `<h1>`. Put it back: with no heading over
the first section, the screen opened on a bare button.

The rules between sections stay gone, and so does the heading over the two
redo buttons.

**Export, Import and Reset sit on one row.** All three act on the same
thing. Reset alone below them read as a separate warning rather than as the
third of three data actions.

## 7. One sentence for the reminder, with the checkbox beside it

"One a day, in the evening, within the hour." above "Remind me each
evening" said the same thing twice, once as a note and once as a label.

One line now, and it is the checkbox's own label: **"Remind me each
evening, give or take an hour"**.

## Acceptance checks

- The editor offers Daily, Every other day, Weekly, Every 2 weeks, Monthly,
  and every one of them drives a panel.
- H019's cadence has a period of 2 days.
- No importance control exists anywhere.
- Editing a habit changes nothing about the row but the appearance of
  carets: same card, same colour, same title position and width.
- A long title wraps in the editor exactly as it wraps when read.
- The pencil and the trash sit on the title's first line, at the tick box's
  own height, both in `--paper-dim`, both drawn.
- Remove is a trash can.
- `.write-habit-form` does not exist, and "Write your own" renders a
  `.checkin` row.
- History has no subhead.
- Settings has an `<h1>`, and Export, Import and Reset share one row.
- The reminder is one sentence, and it is the checkbox's label.
