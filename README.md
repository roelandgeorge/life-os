# Life OS

A habit tracker whose only output is a picture of your future self. Binary
daily checks in, a scene at age +15 out.

`life-os-spec.md` was the original source of truth. Four of its decisions have
since been deliberately reversed — listed under "Departures from the spec"
below, with the reasoning. Read those before "fixing" anything back.

```
npm run dev            # app at :5173
npm run preview        # production build, served — the real PWA/service worker
npm test
npm run typecheck
npm run import-catalog  # regenerate src/content/catalog.json from docs/habits.csv
npm run icons           # regenerate public/icons/*.png
npm run placeholders    # throwaway placeholder artwork sheets
npm run slice           # cut any contact sheet into its five numbered states
npm run compress        # losslessly shrink the artwork PNGs
npm run manifest        # regenerate src/content/artwork.json from public/avatar/
```

## The model

Every domain holds an integer **step**, 0 to 4, one per drawn artwork state.
A period with a hit is +1, a period without one is -1, clamped at both ends.

Everything **starts at step 2** — level 3 of 5, the middle. Both directions are
then live from day one: the picture can get worse, not only better, and neither
extreme is more than two periods away.

The period is the domain's own cadence (`expectedGapDays`), not the calendar
day. SLEEP and FOOD step daily; SPORT every two days; RELATIONSHIP and INCOME
weekly. Charging a weekly domain -1 per calendar day would pin it at zero no
matter how well the user actually did.

**SPORT is not `daily`, and that flag does two jobs.** It decides Full Day
membership and the "not due today, collapse" rule. Strength training runs
every other day, so a rest day is correct behaviour — it must neither cost a
step nor block a Full Day. Leaving SPORT marked daily made a Full Day
unreachable on exactly the days the plan calls for rest.

A day with no log entry — the app was never opened — is a day with nothing
ticked, and costs its step like any other. There is no amnesty. That is what
makes the three-day edit window below matter rather than being a nicety.

Steps are **recomputed from the log on every read**, never accumulated, so a
retroactive edit is absorbed and opening the app twice in a day cannot
double-count.

## v2 model

Phase 1 of `docs/plan/phase-1.md` replaced the fixed five-domain model above
with one the user builds themselves, out of a curated catalogue. The step
model — 0 to 4, start at 2, one period a step — is unchanged; what moves is
what feeds it.

**A catalogue, not a fixed list.** `docs/habits.csv` — 123 Dutch items —
was translated and tagged once (`scripts/import-catalog.mjs`) into
`src/content/catalog.json`, read through `core/catalog.ts`. Each item
carries a domain, cadence, importance (1–5), effort, evidence and — for
partner/family content — an `audience`/`requires` filter. The CSV is now
archive; the JSON is what ships.

**One habit shape, not two.** `UserHabit` (`core/types.ts`) replaces both
the old fixed `DomainTicks` and the separate `CustomTask`. Every habit —
catalogue or self-written — has a title, a cadence, an importance and its
own `startDate`; whether it moves the picture is just whether `domain` is
set. `DayLog.ticks` is keyed by habit id, not a fixed set of domain keys.

**Ten domains, five panels, not seven domains and three layers.** `body`,
`head`, `network`, `partner`, `wealth` (`core/domains.ts`) replace the old
one-domain-one-layer wiring; a domain can feed more than one panel (sleep
and nutrition both feed `body` and `head`). Phase 1 shipped this behind a
temporary adapter onto the 3 PNG sets it inherited from v1. Phase 2
(`docs/plan/phase-2.md`) replaced that adapter with `scene()`, giving each
panel its own drawing directly, see "The artwork" below.

**A weighted panel, not one tick equals one step.** `core/steps.ts`'s
`panelSteps` replaces the old one-domain-one-step engine. On the day a
habit's own period closes (anchored at its own `startDate`, not a shared
`logs[0].date`), it contributes `importance` to the panel's weighted score;
the panel steps up at ≥70%, down otherwise, and a day nothing closes on
leaves it untouched. A panel fed by no habits never moves — the old "empty
domain stays put" rule, generalised. Only `daily`, `weekly` and
`{everyDays}` cadences drive a panel; `monthly` exists for streaks only,
and `situational`/`once` are reminders and milestones, not a recurring
commitment.

**Migration, not a fresh start.** `store/migrate.ts` turns an existing v1
record into v2 on first load: each of the five domains v1 ever showed
(SLEEP, FOOD, SPORT, RELATIONSHIP, INCOME — ORDER and MIND were never
visible) becomes a domain habit, and each old custom task becomes a
domain-less one, both anchored at the old `logs[0].date`. The migrated
record is written straight back, so this runs once per install.

See `docs/plan/PLAN.md` for what is still ahead — the renderer, the design
system, onboarding, gamification — and `docs/plan/phase-1.md` for the
decisions this phase locked in.

## The artwork

Five slots, resolved by `scene()` (`src/visual/scene.ts`) from
`src/content/scene.json`, replacing phase 1's collage of three shared PNG
sets. See `docs/plan/phase-2.md` for the full design.

| Slot | Kind | Panel | Variants |
|---|---|---|---|
| `wealth` | box | wealth | none |
| `body` | box | body | gender |
| `network` | box | network | none |
| `head` | overlay on `body` | head | gender, hair |
| `partner` | overlay on `network` | partner | gender, hair |

`wealth` sits as a band across the top, `body` and `network` side by side
beneath it, same layout as phase 1. `head` and `partner` are drawn on
transparency and composited over their box at a fixed rect rather than baked
into the same drawing, so a strong body and a tired face (or the reverse)
can sit on screen at once, instead of one panel's step hiding the other's.

Filenames carry whichever variant axes the profile knows: `head-male-blond3`
falls back to `head-male3`, then to `head3`, then the overlay is simply not
drawn. A profile with nothing set at all gets the shared, variant-free
drawings for every slot. `public/avatar/` holds the variant-free art,
`public/avatar/you/` the variant art, fetched on first use and cached after
rather than installed upfront, see "Decisions the spec left open" below.

**A domain with no panel is not in the app at all**, no artwork, no
checkbox. A tick that changed nothing on screen would break the causal link
the whole app rests on.

To add or replace art, follow `docs/artwork-guide.md`: the exact rects, the
twelve contact sheets to produce, the style preamble to keep byte-identical
across prompts, and the checklist of all sixty filenames. `npm run slice`
cuts a wide sheet into its five states, `npm run manifest` regenerates the
inventory `scene()` reads against, and `artwork.test.ts` fails loudly if the
two drift apart.

## The look

Phase 3 (`docs/plan/phase-3.md`) replaced the flat, six-variable
`src/styles.css` with a small token system. `src/styles.css` is now four
`@import` lines; the palette, the spacing/type scales and the grain live in
`src/styles/tokens.css`, the only file allowed a raw colour literal.
`src/ui/tokens.ts` parses that file and measures WCAG contrast;
`tokens.test.ts` pins every value against it, so a retuned colour that fails
4.5:1 against the surface it is painted on fails the suite, not a review.

**Dark editorial, and dark only, permanently.** Near-black ground (`--ground`),
a warmed off-white for text (`--paper`), a bronze accent (`--bronze`). No
light mode: the artwork is drawn on a dark ground, so a light theme would be
sixty more drawings, not a token swap.

**Instrument Serif, self-hosted, headings only.** One woff2, Latin subset,
in `public/fonts/` (SIL OFL 1.1, `OFL.txt` beside it) and in the precache —
not Google Fonts by URL, which would be a third-party request on every cold
load in an app whose premise is that it works offline. Applied by role
through `--serif` on `.headline` and `.onboarding h2`; the section eyebrows
(`h2`, `.domain-heading`, `.custom-heading`) stay sans on purpose, so a
serif small-caps eyebrow never sits under a serif headline.

**Grain, one `feTurbulence` SVG, tiled as a background image.** On `body`
and on the `.checkin` card, never on `.portrait` or `.avatar` — the drawings
are already grainy editorial illustration, and a second layer over them
reads as compression noise, not texture.

`src/ui/` holds the base components (`Button`, `Chip`/`ChipRow`, `Checkbox`,
`Card`, `Field`, `Select`, `SectionHeading`, `Note`, `FullDayStrip`) that
`src/styles/components.css` styles. Thin presentational wrappers over
props, no context, no variants object; a component earns a file only once
two different screens use it.

## Departures from the spec

This section documents what v1 changed from `life-os-spec.md`. Where a
passage below names a file that v2 has since replaced — `core/customTasks.ts`
is now `core/habits.ts`, `DomainTicks`/`DayLog.customTicks` are now one
`DayLog.ticks` keyed by habit id, `VISIBLE_DOMAINS`/`TASK_PALETTE` are now
`DOMAINS`/`HABIT_COLOR_PALETTE` — the underlying mechanism moved in the "v2
model" section above, but the departure itself is unchanged: a domain-less
habit still moves no panel, still gets a streak, still may carry a filing
colour that nothing reads back.

**Discrete artwork states replace the continuous parameter system** (§4).
The spec ruled out sprite sets and required every parameter to render at any
value between its extremes, with ±8-point crossfades at tier boundaries. That
bought genuine continuity, and cost a figure that had to be generated
procedurally — which looked procedural. Five drawn states per layer trades the
continuity for art someone actually drew. What it costs: the crossfade is gone
(the step *is* the state, so there is no boundary to flicker across either),
and with five steps most days would change nothing on screen — which is why the
step is fast enough to move daily, and why the main screen names what today's
ticks bought.

**The step model replaces the adherence window and asymmetric EWMA** (§2).
Gone with it: amnesty for unopened days (§2.2), the 14-day warmup (§2.4) — you
start mid-scale, which needs no explaining — the BODY composite (§2.5), and the
§8 test vectors, which described an engine that no longer exists. Recovery and
decay are now symmetric at one step each; the old asymmetry existed to keep a
bad week from feeling unrecoverable, and two good days back to the ceiling does
that job more plainly.

**A day's work gets a payoff** (`core/due.dailyTasksDone`, `app/Celebration.tsx`).
Confetti and a medal, once, on the transition into "everything today is
ticked" — not a banner that sits there afterwards, and not on opening a day
that was already complete. Weekly things are deliberately excluded: one is
available on six days out of seven, so letting it count would mean a Tuesday
could never be finished. Training counts on the days it is due and not on rest
days, which `isDueToday` already decides. Wider than §2.6's Full Day, which
only tracks the always-daily domains — this is the checklist's own idea of
done, and both exist because they answer different questions.

**A rest day is named, not just dimmed** (`core/due.isRestDay`). A
short-cadence domain in a period it has already satisfied showed as a faded
row with a last-hit date, which reads as a gap. For strength training the gap
*is* the plan, so that day now says "Rest day". The box stays tickable: it
writes to whichever day the picker is on, so disabling it would also block
filling in a session you forgot to log — and a second tick inside one period
changes nothing anyway. Derived from period length (< 7 days), the same
threshold the weekly warning uses, rather than a flag on the domain.

**The "see your best version" toggle** reverses §3's "do not render an
idealised self for comparison. There is one figure on screen." The stated
reason was that a second, ideal figure blurs the link between today's tick and
today's image. Requested anyway, for motivation, with the conflict on the
table. Scoped to keep what it can: opt-in, off by default, and it hides the
check-in list while active so the idealised scene never sits next to a checkbox
you could tick.

**Onboarding asks nothing at all now** (§7). The twelve appearance questions
went with the parametric figure — the artwork is a drawing of one specific
person, so there was nothing left for them to drive. The age went when the
headline stopped naming a number: it drove one line of copy and nothing else,
and §3's horizon is fixed at +15 regardless. `Profile` is gone from
`AppState` entirely. What remains is a single explanation screen, kept
because the rules are unusual enough that meeting them cold would confuse.

**User-added tasks move no panel** (`core/customTasks.ts`). The artwork is
three fixed panels; a task the user invents has nothing to drive, so ticking
it changes nothing on screen — exactly what the rule below forbids. Added
anyway, because people want somewhere to put "no alcohol" without it being a
building block. The compromise is that they are visibly a *different kind of
thing*: their own section, plainer styling, no step pips, and a streak as the
one thing they give back. They live in `DayLog.customTicks`, outside
`DomainTicks`, so the step engine never meets a key it does not recognise.
Each is daily or weekly; weekly ones use the same period anchor as the weekly
domains (`core/periods.ts`), so "this week" means one thing everywhere.

They can also carry one of the building blocks' **colours** — asked for so
that "no alcohol" can be filed with food and read as belonging there, and the
history pane sorts by it. This is the one place the "visibly a different kind
of thing" line has been softened deliberately, so it is worth being exact
about what did not change: the colour is a label the user applies and nothing
reads it back. No code maps a colour to a domain, a coloured task still has
no step pips and still moves no panel, and the dashed border and separate
section stay. `core/customTasks.ts` holds the palette (`TASK_PALETTE`, built
from `VISIBLE_DOMAINS`) and the sort (`byColor`); the stored value is
validated as `#rrggbb` rather than as palette membership, so a later change
to the palette cannot strip everyone's colours on the next import.

## The weekly warning

`core/atRisk.ts` is the app's one nag, and it exists for a specific gap: a
weekly thing changes nothing on screen for six days and then drops a step.
That is the only case where the picture alone is not feedback in time to act
on. Daily things get no warning — missing one is its own, immediate signal.

It fires when a period is down to its last two days with nothing logged in
it, and it covers the fixed weekly domains and weekly custom tasks under one
rule, because from the user's side they are the same problem.

The filter is the **period length**, not the `daily` flag: anything shorter
than a week is excluded. SPORT is not daily — a rest day is fine — but its
period is two days, and a warning every other evening is nagging rather than
help.

### How the evening reminder knows

The cron cannot read the log — it lives in IndexedDB and never leaves the
phone. So the app sends a **digest**: opaque ids, the day each weekly thing
was last satisfied, and its period length. No names, no ticks, no log.

The server recomputes urgency on the day it fires, which is what keeps the
reminder right after days without an open — precisely when it is needed. A
digest that never arrived just means the generic wording; the reminder still
goes out.

## Decisions the spec left open

**Retroactive editing is built, not just allowed** (`core/due.ts`,
`app/MainScreen.tsx`). §5.2 permits editing 3 days back. Under the old engine
that was a nicety; under this one a day the app was not opened is a hard -1,
so a day you did the thing but did not log it has to be correctable or the app
punishes forgetting to log rather than forgetting to live. The main screen has
a four-day picker; beyond the window the log is fixed, because a record you can
rewrite at will records nothing.

**A domain "not due today" is a cadence gap, not a schedule** (`core/due.ts`).
§1 gives no day-of-week for the non-daily domains — they are "sometime this
window", not "Tuesdays". Due-ness comes from `expectedGapDays`, the same number
that drives the step period. Never hit at all is always due.

**`Store` grew a fourth method, `clear()`** (`store/types.ts`). §5.1 specifies
load/save/export/import; Settings' reset needs "no state", which import cannot
express and save cannot either.

**The daily reminder is a toggle, not a time** (`app/SettingsScreen.tsx`).
§6 asks for a configurable notification time. Vercel's free plan runs a cron
**once a day, within an hour of the scheduled time, in UTC only** — so a
per-minute setting would be a promise the schedule cannot keep. The UI is an
on/off switch and says the reminder lands "in the evening"; the schedule
itself is one line in `vercel.json`. `notificationTime` survives on `AppState`
as the record of whether reminders are on.

**Import and reset resync by reloading the page** (`app/SettingsScreen.tsx`).
Both replace the whole `AppState` underneath the hook. Threading a reload path
through every consumer for two rare, deliberate actions is not worth it; ticks
and profile edits update in place.

**Storage failure is a screen, not a hang** (`store/indexeddb.ts`, `app/App.tsx`).
An `indexedDB.open` queued behind a pending delete can fire none of its three
handlers, leaving the promise unsettled and the app on its loading screen
permanently. The open times out, the failure is not cached, and `App` renders
the reason with a retry. The app also asks for `navigator.storage.persist()` on
boot: without it IndexedDB is best-effort and a browser short on disk may clear
400 days of history with no warning.

**The avatar art is split between precache and runtime cache**
(`vite.config.ts`). Workbox's default glob leaves it out entirely, and a
cached shell with an empty frame is worse offline than no cache at all, so
the variant-free slots (`avatar/*.png`) are precached explicitly. The ~60
variant drawings under `avatar/you/` would triple the install for
appearances most devices will never show, so those are fetched on first use
through a CacheFirst runtime rule instead, warmed in the background right
after first render by `app/warmArtwork.ts`.

## Push notifications

The app is otherwise entirely local — this is the one part with a server.

```
public/push-sw.js   push + notificationclick, imported into the generated SW
src/app/push.ts     permission, subscribe, and every way it can fail
api/subscribe.ts    stores the one subscription in a private Blob
api/cron.ts         the daily send, guarded by CRON_SECRET
api/test-push.ts    the same send on demand, reporting where it stops
vercel.json         the schedule
```

The Blob store **must be private**. A push subscription on a public URL lets
anyone who finds it send notifications to the phone, and Blob access mode
cannot be changed after the store is created.

The cron cannot know whether the boxes were ticked — the log never leaves the
phone — so the reminder asks rather than tells.

### Environment variables

| Variable | Where | What |
|---|---|---|
| `VITE_VAPID_PUBLIC_KEY` | Vercel + `.env.local` | Public half of the VAPID pair. Shipped to the browser by design, and read by `api/` too — the `VITE_` prefix only decides what Vite bundles, not what a function can see. |
| `VAPID_PRIVATE_KEY` | Vercel only | Secret. Never commit it. |
| `VAPID_SUBJECT` | Vercel | `mailto:` address, required by the push spec. |
| `CRON_SECRET` | Vercel | Vercel sends it as a bearer token; `api/cron.ts` refuses to run without it. |
| `BLOB_READ_WRITE_TOKEN` | automatic | Added by Vercel when the Blob store is connected. |

There is deliberately **one** public key variable. `api/` accepts
`VAPID_PUBLIC_KEY` if it is set, but falls back to `VITE_VAPID_PUBLIC_KEY`:
the browser subscribes with that one, and a push signed against a different
pair is rejected. Two names for the same value is a standing invitation to
set one, or to let them drift apart — either way reminders silently never
arrive.

Regenerate the VAPID pair with
`node -e "console.log(require('web-push').generateVAPIDKeys())"`. Changing it
invalidates the existing subscription — the toggle has to be switched off and
on again.

### Testing it without waiting for evening

**From the phone**: Settings → "Send a test notification", visible once the
reminder is on. It walks the same chain the cron does and names the step that
failed, because from the phone's side every failure looks identical — no
notification, ever, with nothing to act on.

| What it says | What is actually wrong |
|---|---|
| This browser has no subscription | The app's setting says on, but the browser dropped the subscription. Toggle off and on. |
| No push endpoint is deployed | `api/` is not running — the deployment is the static site only. |
| Could not read the subscription store | No Blob store, or `BLOB_READ_WRITE_TOKEN` missing, or the store was created public. |
| The server has no subscription stored | The toggle was never switched on from this deployment. |
| VAPID keys are missing on the server | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` not set in Vercel. |
| The push service refused it | The endpoint or keys are stale — regenerate and re-subscribe. |
| Sent — but `CRON_SECRET` is not set | Push works; the *daily job* refuses to run, so no evening reminder will ever fire. This is the one failure a working test push would otherwise hide. |

Authorisation is the caller's own subscription endpoint, which is itself the
capability that lets anything push to that device — so knowing it is proof of
being it, and nothing is disclosed until it matches.

**From anywhere**:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/cron
```

`{"sent":true}` means the push left Vercel. `{"sent":false,"reason":"no
subscription"}` means the toggle was never switched on, on that device. Without
the header it must answer **401** — if it does not, `CRON_SECRET` is unset and
the endpoint is refusing to run at all.

## Layout

```
src/core/      the model — no DOM, no clock, no storage
  dates.ts       bare "YYYY-MM-DD" arithmetic, 04:00 boundary (§5.2)
  catalog.ts     the habit catalogue (§1.1), read from src/content/catalog.json
  domains.ts     the 10 domains and the 5 panels they feed (§1.2)
  habits.ts      cadence/streak/CRUD helpers for UserHabit (§1.5, §1.6)
  steps.ts       the weighted panel engine (§1.5)
  due.ts         "is this habit due today"
  atRisk.ts      the lapse warning + the digest sent to the server
  projection.ts  AppState + a date -> what the screen needs
  scoring.ts     Full Day + log bookkeeping (§5)
src/store/     Store interface, IndexedDB/in-memory impls, migrate.ts (v1 -> v2)
src/visual/    scene.ts (the slot table + fallback-chain resolver) and the compositing Avatar
src/ui/        the base components (Button, Chip, Checkbox, Card, Field,
               Select, SectionHeading, Note, FullDayStrip) and tokens.ts,
               the parser tokens.test.ts and chrome.test.ts read against
src/styles/    tokens.css (the only file with a colour literal), base.css,
               components.css, screens.css — src/styles.css just @imports them
src/app/       the shell: useLifeOS is the one place touching Store and clock;
               every screen takes state as props
src/i18n/      every fixed user-facing string, flat key map, English only —
               habit titles are data now, not i18n
src/content/   catalog.json, generated by scripts/import-catalog.mjs
api/           the only server-side code: push subscription + the daily send
scripts/       catalogue import, icon generation, artwork slicing, placeholder sheets
docs/plan/     the v2 roadmap and per-phase plans
```

## The contract

`habits -> panelSteps() -> scene() -> <Avatar>`. The renderer paints a
resolved `Scene` and nothing else, not scores, not weights, not a profile,
not why a slot resolved to the file it did. That is what keeps the model and
the artwork independently replaceable: swap the PNGs and no code changes,
change the panel rules and no artwork changes.
