# Phase 5 - Home as one day, in order

The executable plan for phase 5 of [`PLAN.md`](PLAN.md). Written in English to
match README, CLAUDE.md and the code that reference it. Every decision below
was taken with the user in the planning session. Where it reverses an
earlier rule, the rule is named so it can be updated in the same build.

## What this phase changes, in one list

| # | Change | Reverses |
|---|---|---|
| 5.1 | Home is one list in order of the day, not groups by domain | MainScreen's domain groups, `groupHabits` |
| 5.2 | Every habit carries its own `order`, seeded from a catalogue `dayPosition` | nothing (new field) |
| 5.3 | The in-row editor moves a habit up or down | nothing |
| 5.4 | A `+` row at the bottom of Home opens a domain picker, then that domain's catalogue | CLAUDE.md house style and `04-revisions.md` §6: "reachable only from that domain's own group" |
| 5.5 | The catalogue lists the most important habits first, and says in words what the bars mean | nothing |
| 5.6 | "Never miss twice" on the row itself | nothing |
| 5.7 | Pruning suggestions for habits that have gone silent | nothing |
| 5.8 | CSV export of the log, flat, for Power BI | nothing |
| 5.9 | Docs | |

Out of scope, written down here so it is not lost: milestones as drawings
(see "Phase 6 design note" at the end). Nothing in that section is to be built
in this phase.

## Where the build stands

Phases 1 to 4 and the onboarding rebuild (`docs/onboarding/`, `07-revisions.md`
the last word) are built and merged. Home (`src/app/MainScreen.tsx`) groups
active habits by domain via `groupHabits()`, ordered by
`Profile.domainOrder` through `orderedDomains()`. Each group heading carries
a `+` that opens `DomainCatalog` for that domain, which is the only route
into the catalogue. Habits without a domain sit in a last group, "Your own
habits". The array order of `AppState.habits` is creation order and nothing
else reads it.

`CatalogItem` already has `importance` (1-5) and `effort`
(`low`/`medium`/`high`). `DomainCatalog` shows `effort` as one to three bars
(`EffortMarker`) with the meaning only in a `title` attribute, which a phone
never shows. The catalogue is listed in id order.

## 5.1 Home is one list

`groupHabits()` and the domain heading rows go. Home renders every habit
active today in one `.checkins` block, sorted by `UserHabit.order` (5.2).

- No headings between morning, day and evening. The user asked for
  "allemaal onder elkaar".
- A row that is not due today stays in its place (it already renders as
  `.checkin.collapsed`). Moving it to the bottom would break the order of the
  day, which is the point of this phase.
- A domain-less habit (only possible for a record migrated from v1) sits in
  the list by its `order` like any other. The "Your own habits" heading goes
  from Home. History keeps its own grouping, untouched.
- The title keeps its domain colour, which is now the only place the domain
  shows on Home. That is enough: the colour was always filing, never a link.
- `Profile.domainOrder` is no longer read by Home. It is still written by
  onboarding and by "Add life domains", and 5.4's picker reads it, so it is
  not dead.
- i18n: `main.domain.browse` and `habits.own` lose their Home callers.
  `habits.own` is still used by History, keep it. Delete
  `main.domain.browse` if nothing else reads it. `settings.habits.empty`
  becomes "No habits yet. Tap + below to add one."

## 5.2 `order` and `dayPosition`

### The two numbers

- **`CatalogItem.dayPosition: number`**, an integer 0 to 100, in
  `src/content/catalog.json`. 0 is the first thing on waking, 100 the last
  thing before sleep, 50 means "any time" and is the value for everything
  that has no natural moment. It is the catalogue's suggestion, not the
  user's order. Ties are fine.
- **`UserHabit.order: number`**, required, an integer. The user's own
  position for this habit. Unique among the habits in `AppState.habits` and
  dense (0..n-1) after every write that touches it. Removed habits keep
  their last value and are ignored by every sort that only looks at active
  habits.

`order` is required in the type, so every path that produces a `UserHabit`
must set it, and every path that reads an old record must fill it in before
the rest of the app sees it (below). Do not make it optional to avoid that
work: an optional sort key means a fallback in every sort.

### Pure helpers in `core/habits.ts`

- `dayPositionOf(habit): number | undefined`, from `catalogById(habit.catalogId)`.
  `undefined` for a written habit.
- `activeInOrder(habits, today): UserHabit[]`, active today, sorted by
  `order`, then array index. Home and the CSV export both use it.
- `placeHabit(habits, habit): UserHabit[]`, adds `habit` and gives it an
  `order`:
  - With a `dayPosition`: it goes directly before the first active habit
    (in current `order`) whose `dayPosition` is greater. Habits without a
    `dayPosition` are skipped while searching, they never stop it. If none
    is greater, it goes at the end.
  - Without one (a written habit): at the end. That is the one place the
    user will look for something they just wrote, and they can move it.
  - Then every active habit is renumbered 0..n-1 in its new sequence.
- `withOrder(habits): UserHabit[]`, the load-time fill. If every habit has a
  finite `order`, return the array unchanged (same reference, so nothing
  re-renders). Otherwise keep the habits that have one in that order, then
  `placeHabit` each one that lacks it, in array order. For a record where
  none has an order, which is every existing record, this sorts the list by
  `dayPosition` with written habits at the end. That is the "every task gets
  a default moment" the user asked for.
- `moveHabit(habits, id, direction: -1 | 1, today): UserHabit[]`, swaps the
  habit with its neighbour among `activeInOrder(habits, today)` and
  renumbers. At the top (moving up) or the bottom (moving down) it returns
  the same array.

### Every path that writes or reads habits

| Path | What it does with `order` |
|---|---|
| `newHabitFromCatalog`, `newCustomHabit` | Take an `order` parameter or leave it to the caller. Simplest: they build the habit with `order: 0` and the caller passes the result through `placeHabit`. |
| `useLifeOS.addHabit` | `placeHabit(habits, newHabit)` instead of `[...habits, newHabit]`. |
| `useLifeOS.completeWorkOnRedo` | `placeHabit` each addition in turn. |
| `onboarding.buildInitialState` | Sort the seeds by `dayPosition` (then catalogue id) and number them 0..n-1. |
| `store/indexeddb.ts` `load()` | Run `withOrder` on `habits` in both branches (v2 and freshly migrated). If it changed anything, `save` the result once so the fill happens a single time per install. |
| `store/memory.ts` | Same as above if it has its own load path. Check. |
| `store/serialize.ts` `parseHabit` | Accept `order` when it is a finite number. `parseV2` then runs `withOrder` on the parsed list. |
| `store/migrate.ts` | Its output goes through the same `withOrder`, either inside it or at the two call sites. Pick one and do not do both. |

No `schemaVersion` bump. The field is additive and every reader fills it in.
An export taken after this build and imported into an older build simply
loses `order`, which an older build never read.

### The `dayPosition` values

Add `dayPosition` to all 137 items in `catalog.json`. Values below. They are
a judgement about when a habit is naturally done or ticked, made once here so
the build does not have to guess. Anything not listed is 50.

**Morning, 0-30**

| id | title | dayPosition | why |
|---|---|---|---|
| H001 | Sleep 7–9 hours | 1 | Ticked on waking, about the night just gone |
| H044 | Olive oil before your first coffee | 5 | The title names the moment |
| H041 | Take a cold shower | 8 | |
| H125 | Groom | 9 | |
| H036 | Basic skincare | 10 | |
| H037 | Vitamin C serum | 10 | Morning step of skincare |
| H047 | SPF every day | 11 | Last skincare step, before going out |
| H011 | Take your base supplements | 12 | With breakfast |
| H035 | Wear a signature scent | 12 | |
| H010 | Get your protein in at breakfast | 15 | |
| H058 | Protect your morning | 18 | |
| H059 | Three non-negotiables before nine | 20 | |
| H021 | Put training first in your calendar | 22 | Planning |
| H063 | Block hours for others and for yourself | 25 | Planning |
| H085 | Block a no-meeting slot | 25 | Planning |
| H084 | CEO hour | 30 | |
| H126 | Ten minutes outside. Nothing in your ears. | 30 | Morning light |

**Day, 31-69**

| id | title | dayPosition |
|---|---|---|
| H061 | Clear your inbox | 35 |
| H087 | Check cash flow | 35 |
| H134 | Five-minute money look | 35 |
| H017 | Weigh your food | 40 |
| H053 | Check on your long project | 40 |
| H086 | Review your client base | 40 |
| H135 | One hour on what raises your rate | 40 |
| H019, H022, H023, H025, H026, H027, H028, H029, H124 | Training sessions | 45 |
| H024 | Log your training | 47 |
| H012 | Drink 2–4 litres of water | 55 |
| H128 | Message one person you have lost touch with | 55 |
| H131 | Make one plan with someone this week | 55 |
| H073 | Call your parents | 60 |
| H020 | Hit 8,000–10,000 steps | 65 |

**Evening, 70-100**

| id | title | dayPosition | why |
|---|---|---|---|
| H072 | Spend time with people worth it | 70 | |
| H074 | Play with your kids on the floor | 70 | |
| H130 | Go to it | 70 | |
| H132 | Be in one room with people you do not know yet | 70 | |
| H009 | Hit 1.6–2g protein per kg bodyweight | 72 | Only knowable after dinner |
| H014 | Eat mostly single-ingredient food | 72 | Same |
| H018 | Cut sugar when your skin says so | 72 | Same |
| H079 | Host something informal | 72 | |
| H080 | Let guests help | 72 | |
| H034 | Clean your shoes | 75 | |
| H075 | Monthly couple check-in | 78 | |
| H133 | One hour, just the two of you | 78 | |
| H016 | Cap alcohol | 80 | |
| H051 | Keep the promises you made yourself | 80 | A reflection on the day |
| H056 | Did you respond, or react? | 82 | Same |
| H066 | Did you avoid the doomscroll? | 82 | Same |
| H004 | Stop eating before bed | 84 | |
| H015 | Review the week's eating | 85 | |
| H049 | Weekly journal review | 85 | |
| H060 | Weekly life audit | 85 | |
| H062 | Monthly goals review | 85 | |
| H057 | Plan tomorrow tonight | 86 | |
| H003 | Charge your phone outside the bedroom | 88 | "From a fixed hour each evening" |
| H046 | Red light in the evening | 88 | |
| H048 | Read ten pages | 90 | |
| H006 | Evening journal | 90 | |
| H050 | Short daily journal | 90 | |
| H039 | Exfoliate | 92 | Evening skincare |
| H038 | Retinol | 93 | Evening skincare, after exfoliating |
| H007 | Take your sleep stack | 94 | |
| H005 | Stretch before sleep | 95 | |
| H002 | Keep a fixed bedtime | 97 | |
| H040 | Breathe through your nose at night | 98 | |

Everything else (milestones, challenges, reminders, and the habits with no
natural moment such as H032 posture, H013 meal prep, H064 a social-media-free
day, H082 automate saving) is 50.

`catalog.test.ts` gains: every item has an integer `dayPosition` in [0, 100].

## 5.3 Moving a habit in the editor

`HabitEditor` (in `DomainCatalog.tsx`) takes two optional callbacks,
`onMoveUp?` and `onMoveDown?`. When either is passed it renders a
`.habit-move` row with two icon buttons, up and down.

- Placement: its own line at the bottom of the editing card, under the
  cadence chips, left edge on the title's x. Not in `.habit-menu`: four
  icons on the title's first line squeeze the title at 390px, and the title
  is the one thing editing must not move (`07-revisions.md` §3).
- A button whose move is impossible (up on the first habit, down on the
  last) is rendered `disabled`, not hidden, so the row does not jump.
- A move applies at once and is saved at once through `useLifeOS.moveHabit`
  (thin wiring around `core/habits.moveHabit`). It is independent of the
  text fields: Cancel does not undo a move, Save does not need one. The
  editor stays open, and because `MainScreen` keys rows by `habit.id` React
  keeps the editor's unsaved text across the re-sort.
- After a move, `scrollIntoView({ block: 'nearest' })` on the editing card,
  so a habit moved off-screen follows the finger.
- `DomainCatalog`'s "Write your own" passes neither callback, so a new habit
  shows no move row. It is placed by 5.2's rule and can be moved once it
  exists.
- Two new glyphs in `src/ui/Glyph.tsx`, `ChevronUpGlyph` and
  `ChevronDownGlyph`, drawn like the existing five (same `Glyph` wrapper,
  stroke, size). `aria-label`s from i18n: `habits.edit.moveUp` "Move up",
  `habits.edit.moveDown` "Move down".

## 5.4 Adding a habit from the bottom of Home

### The route

Home, below the last habit row: one row shaped like a `.checkin` card, a
`PlusGlyph` where the checkbox sits and the label "Add a habit"
(`main.add`). It opens `DomainPicker`, a new screen. Picking a domain opens
the existing `DomainCatalog` for it. Back from the catalogue returns to the
picker, back from the picker returns to Home.

`MainScreen` holds this as one state value,
`adding: null | 'picker' | DomainKey`, replacing `catalogDomain`.

### The picker

- Header: Back button and the headline "Add a habit", the same
  `discover-header` markup `DomainCatalog` uses.
- One row per domain, all ten. First the domains the user has at least one
  active habit in, in `orderedDomains(profile.domainOrder)` order. Then the
  rest, in the same order.
- A row: the domain name in its colour, and on the right, only when it is
  non-zero, "{count} on your list" (`addHabit.count`). The whole row is the
  tap target.
- Small enough to live in `DomainCatalog.tsx` beside the catalogue, or its
  own `app/DomainPicker.tsx`. It is used by one screen, so it does not earn a
  file under `src/ui/`.

### The rule this reverses

CLAUDE.md's house style and `docs/onboarding/04-revisions.md` §6 say a
domain's catalogue is reachable only from that domain's own group on Home,
and that a domain the user is not working on has no way in. With the groups
gone (5.1) there is no group to hang the route on, and the user asked for a
picker over every domain. Write the reversal down in README's "Departures"
section and replace the CLAUDE.md paragraph: the catalogue is now reached
from Home's `+` through a picker of all ten domains, the user's own first.
"Add life domains" in Settings stays as the guided route.

## 5.5 Catalogue order and the bars

### Order

`core/catalog.ts` gains `byImportance(items): CatalogItem[]`, a stable sort:

1. `importance`, high first.
2. `evidence`: `strong`, then `moderate`, then `anecdotal`.
3. `effort`: `low` first. Of two equally important, equally proven habits,
   the easier one is the better first pick.
4. `id`, so the order is fully determined.

`DomainCatalog` applies it after its own filtering. Do not put it inside
`catalogFor()`: onboarding calls `catalogFor` too and its order there is not
this phase's business.

Nutrition then opens with H009 "Hit 1.6–2g protein" (5), ahead of H011
"Take your base supplements" (4), which is the user's own example.
`catalog.test.ts` pins the first three ids of nutrition and of sleep.

### The bars

The bars are effort: one bar low, two medium, three high. More bars means
harder to keep up, not more important. The meaning lives only in a `title`
tooltip today, which a phone never shows. When a catalogue row is expanded,
show the effort label in words under the note (`catalog.effort.*`, the
strings already exist). Keep the bars on the collapsed row.

## 5.6 Never miss twice

### The rule

For a habit on a short cadence (period under `WEEKLY_PERIOD_DAYS`: daily and
every other day), show a marker when all three hold:

1. The previous period closed without a hit.
2. The period before that was hit, or does not exist (the habit is younger
   than two periods).
3. The current period has no hit yet.

Rule 2 is what makes it "never miss *twice*". After two misses in a row the
marker stops: it is a nudge at the one moment it can still keep a streak
alive, not a standing reproach. A habit that keeps missing is 5.7's to
raise. Weekly and longer are out because `atRisk.ts` already warns about
them before the period closes, which is earlier and more useful.

Periods are the anchored ones `steps.ts` uses (`periodAt`,
`completedPeriods`, anchored at `habit.startDate`), not `isDueToday`'s
rolling gap since the last hit. The marker has to agree with what the
picture does.

### Code

- `core/due.ts`: `missedOnce(logs, habit, today): boolean`, pure, tested in
  `due.test.ts`: daily missed yesterday and not today, daily missed two days
  running (false), every-other-day with a missed previous period, a habit
  one day old (false), ticked today (false), weekly (false).
- `MainScreen`'s `HabitRow`: when the picker is on today, the row is not
  ticked and `missedOnce` holds, the collapsed row shows "Missed yesterday.
  Not twice." (`main.recover.daily`) for a daily habit, or "Missed last
  time. Not twice." (`main.recover.other`) otherwise, in the slot where
  the streak and "last hit" sit, coloured `--bronze`. It replaces them,
  which costs nothing: a missed previous period means the streak is 0.

## 5.7 Pruning suggestions

### Why

A habit that is never ticked still adds its `importance` to its panel's
denominator every time its period closes (`steps.ts`). An abandoned
importance-5 habit can hold a panel under the 70% threshold on its own,
however well everything else goes. The suggestion is about the picture, not
about tidiness.

### The rule

`core/prune.ts`, `staleHabits(logs, habits, today): StaleItem[]` where
`StaleItem = { id, silentDays }`. A habit is stale when:

- it is active today and has a periodic cadence (`cadencePeriodDays` not
  `null`),
- the window is `max(PRUNE_MIN_DAYS, 2 × period)` with `PRUNE_MIN_DAYS = 28`,
  so 28 days for daily up to every 2 weeks, 60 for monthly,
- `startDate` is at least one window ago,
- there is no hit in the last window days, today included,
- it has not been kept recently: `UserHabit.pruneKeptOn` is absent, or at
  least one window ago.

`silentDays` is days since the last hit, or since `startDate` if never hit.
Sorted most silent first, then by `order`. Tests in `prune.test.ts`: daily
silent 28 days (stale), 27 (not), young habit (not), monthly at 59 and 60
days, kept 10 days ago (not), kept a window ago (stale again), removed
(not), situational (not).

### The new field

`UserHabit.pruneKeptOn?: DateKey`, set by "Keep". Parsed in
`serialize.parseHabit` when it is a valid date key. `HabitPatch` gains it.
Like `note` and `emoji`, nothing reads it but this feature.

### Home

A `PruneSuggestion` card below `RiskWarning`, above the day picker, showing
only the first stale habit:

- Text: "{title}: not ticked in {weeks} weeks." For a habit that moves a
  panel (has a domain and `drivesPanel`), a second line: "It still counts
  against the picture."
- Three small buttons: **Remove** (`onRemoveHabit`), **Rewrite** (opens the
  in-row editor on that habit via `setEditingId` and scrolls to it),
  **Keep** (`onUpdateHabit(id, { pruneKeptOn: today })`).
- A stale habit is left out of `RiskWarning` on Home: warning that this
  week of an abandoned habit is about to lapse is noise next to the card
  asking whether to keep it at all. The push digest is not touched.

i18n: `main.prune.text`, `main.prune.weighs`, `main.prune.remove`,
`main.prune.rewrite`, `main.prune.keep`.

## 5.8 CSV export

For the user's own analysis in Power BI Desktop or Power Query. JSON export
stays the backup, CSV is a read-only view and is never imported.

### Shape

One long table, one row per calendar day per habit active that day. That is
the fact table grain Power BI wants, with the habit attributes denormalised
onto it so it loads without a second file.

| column | content |
|---|---|
| `date` | `YYYY-MM-DD` |
| `habit_id` | `UserHabit.id` |
| `catalog_id` | empty for a written habit |
| `title` | `habitTitle()` |
| `domain` | domain key, empty if none |
| `panels` | the domain's panels joined with `\|`, e.g. `body\|head`. Split in Power Query when needed. |
| `cadence` | `daily`, `weekly`, `monthly`, `every_N_days`, `situational`, `once` |
| `importance` | 1-5 |
| `order` | the habit's current `order` |
| `ticked` | 1 or 0 |
| `opened` | 1 if the app was opened that day, 0 if there is no log for it |

- Every calendar day from the first log date to the last, not only days with
  a log. A day the app was never opened is a real miss to the step model, so
  it has to exist as rows with `ticked = 0` and `opened = 0`. Without them a
  measure like adherence silently overstates.
- A habit appears only on days `isActiveOn` it, so a removed habit stops
  producing rows on its `removedDate`.
- RFC 4180: comma separator, a field containing a comma, a quote or a line
  break is quoted with inner quotes doubled, `\r\n` line endings, UTF-8 with
  a BOM so Excel reads emoji and accents right if it is opened there too.
  Power BI detects the comma on its own.

### Code

- `core/exportCsv.ts`, `logCsv(state: AppState): string`, pure. Tests in
  `exportCsv.test.ts`: header, BOM, quoting of a title with a comma and a
  quote, a gap day producing `opened = 0` rows, a removed habit, a written
  habit's empty `catalog_id`, the `panels` join.
- Settings: an "Export CSV" button (`settings.exportCsv`) in the data row
  beside Export, downloading `life-os-log-<last log date>.csv` with type
  `text/csv`, the same Blob and anchor pattern `handleExport` uses. Check at
  390px that four buttons in that row still fit on one line. If not, let the
  row wrap rather than shrinking the labels.

## 5.9 Docs

- `README.md`: Home as one ordered list, `order` and `dayPosition`, the
  picker route, the catalogue order, never miss twice, pruning, CSV. Under
  "Departures from the spec", the reversal in 5.4.
- `CLAUDE.md`: replace the house-style paragraph on catalogue access (5.4),
  update "Where the build is" with this phase, the project structure for
  `prune.ts` and `exportCsv.ts`, "Where the data lives" for the CSV and the
  two new fields, and "the five drawn row actions" becomes seven.
- `PLAN.md`: phase 5 to **Built**.

## Critical files

| File | Change |
|---|---|
| `src/core/types.ts` | `UserHabit.order`, `UserHabit.pruneKeptOn` |
| `src/core/catalog.ts` | `CatalogItem.dayPosition`, `byImportance` |
| `src/content/catalog.json` | `dayPosition` on all 137 items |
| `src/core/habits.ts` | `dayPositionOf`, `activeInOrder`, `placeHabit`, `withOrder`, `moveHabit`, `HabitPatch.pruneKeptOn` |
| `src/core/due.ts` | `missedOnce` |
| `src/core/prune.ts` | new |
| `src/core/exportCsv.ts` | new |
| `src/core/onboarding.ts` | `buildInitialState` numbers seeds by `dayPosition` |
| `src/store/indexeddb.ts`, `memory.ts`, `serialize.ts`, `migrate.ts` | fill `order` on the way in |
| `src/app/useLifeOS.ts` | `placeHabit` on add and redo, `moveHabit` |
| `src/app/MainScreen.tsx` | one list, `+` row, picker state, recovery marker, `PruneSuggestion` |
| `src/app/DomainCatalog.tsx` | move row in `HabitEditor`, `byImportance`, effort label, picker (or a new `DomainPicker.tsx`) |
| `src/app/SettingsScreen.tsx` | Export CSV |
| `src/ui/Glyph.tsx` | two chevrons |
| `src/i18n/en.ts` | the keys named above |
| `src/styles/screens.css` | `.habit-move`, the `+` row, picker rows, prune card. No colour literal outside `tokens.css`. |

## Build order

Commit per step, each green on `npm test` and `npm run typecheck`.

1. `dayPosition` in the catalogue, `byImportance`, their tests.
2. `order`: type, helpers, every write and read path in the table, tests
   (including a v2 record without `order` loading sorted by `dayPosition`).
3. Home as one list, the move row in the editor, the chevrons.
4. The `+` row and the picker. Catalogue order and the effort label.
5. `missedOnce` and the row marker.
6. `prune.ts`, `pruneKeptOn`, the card.
7. `exportCsv.ts` and the Settings button.
8. Docs.

## Verification

`npm test`, `npm run typecheck`, `npm run build`, then a browser at 390x844
(`npm run preview`), per CLAUDE.md, before merging:

- An existing record without `order` loads with morning habits first and
  evening last, and reloading does not reshuffle it.
- Adding "Retinol" lands it near the end of the list, adding "Take your base
  supplements" near the top. A written habit lands at the bottom.
- In the editor: up and down move the row, the first row's up and the last
  row's down are disabled, unsaved text survives a move, Cancel keeps the
  move, the order survives a reload.
- `+` row, picker with the user's domains first and counts, a domain the
  user has no habits in opens its catalogue too, Back walks back one screen
  at a time.
- Nutrition's catalogue opens on the protein habit. Expanding a row shows
  "Low effort" (or medium, high) in words.
- With the clock or the log arranged for it: the recovery marker on a daily
  habit missed yesterday, gone after ticking, absent after two misses.
- A habit with 28 silent days shows the prune card, Keep hides it, Rewrite
  opens the editor on that row.
- Export CSV downloads a file that loads in Power BI or a spreadsheet with
  one row per day per habit, gap days included.

## Risks

- **Re-sorting under the user's finger.** Moving a habit re-sorts the list
  while the editor is open. The keyed rows and `scrollIntoView` cover it.
  Check it on the phone-sized viewport, not only in tests.
- **Every write path must set `order`.** Missing one gives a habit
  `undefined` at runtime despite the type. `withOrder` on load repairs it on
  the next open, but the tests in step 2 should cover every creator named in
  the table.
- **The `dayPosition` values are a judgement.** They only seed the order,
  the user can move anything. Revising a value later changes where *new*
  additions land, never an existing user's order.

## Phase 6 design note: milestones as drawings

Not built in this phase. Recorded so phase 6 starts from it instead of from
XP and badges.

**The principle.** A reward is something that appears in the picture, never a
number beside it. The picture is the app's only output, and a second
currency (XP, levels, badges) would compete with it.

**What already exists.** `scene.json` has two overlay slots nothing drives
yet, `accessory-body` and `accessory-wealth`, with rects inside their
boxes. `scene.test.ts` pins that they are omitted until phase 6.

**Two kinds of detail.**

- *Held details* belong to a sustained state, and leave with it: for
  example a watch on the wrist once the body panel has held step 3 or higher
  for 28 days, gone again once body drops below 3. They keep the causal link
  the app rests on, because they can be lost.
- *Earned details* belong to a one-off catalogue milestone and stay: ticking
  "List every debt on one page" (H136) once puts an ordered desk in the
  wealth scene, "Get bloodwork done" (H042) or "Hit a physical milestone"
  (H031) something on the body. They mark that something happened, which
  is what a milestone is.

**Data, not code.** A `details` list in `scene.json`, each with an id, a
slot, and an unlock rule, either
`{ "held": { "panel": "body", "minStep": 3, "days": 28 } }` or
`{ "completed": "H136" }`. A pure `core/details.ts` computes the unlocked ids
from the log. `scene()` takes that list next to `PanelSteps` and resolves
each id to its PNG like any other slot. The renderer still paints only a
resolved `Scene`, so the contract `habits -> panelSteps() -> scene() ->
<Avatar>` is unchanged apart from one more input to `scene()`.

**Artwork.** One transparent PNG per detail at its slot's rect size, drawn by
the user and added to `docs/artwork-guide.md`. Start with three or four, not
a catalogue of them.
