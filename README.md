# Life OS

A habit tracker whose only output is a picture of your future self. Binary
daily checks in, a scene at age +15 out.

`life-os-spec.md` was the original source of truth. Four of its decisions have
since been deliberately reversed — listed under "Departures from the spec"
below, with the reasoning. Read those before "fixing" anything back.

```
npm run dev          # app at :5173
npm run preview      # production build, served — the real PWA/service worker
npm test
npm run typecheck
npm run icons        # regenerate public/icons/*.png
npm run placeholders # throwaway placeholder artwork sheets
npm run slice        # cut public/avatar/<layer>.png into <layer>1..5.png
npm run compress     # losslessly shrink the artwork PNGs
```

## The model

Every domain holds an integer **step**, 0 to 4, one per drawn artwork state.
A period with a hit is +1, a period without one is -1, clamped at both ends.

Everything **starts at step 2** — level 3 of 5, the middle. Both directions are
then live from day one: the picture can get worse, not only better, and neither
extreme is more than two periods away.

The period is the domain's own cadence (`expectedGapDays`), not the calendar
day. SLEEP, FOOD and SPORT step daily; RELATIONSHIP and INCOME weekly, so one
tick a week is all either needs. Charging a weekly domain -1 per calendar day
would pin it at zero no matter how well the user actually did.

A day with no log entry — the app was never opened — is a day with nothing
ticked, and costs its step like any other. There is no amnesty. That is what
makes the three-day edit window below matter rather than being a nicety.

Steps are **recomputed from the log on every read**, never accumulated, so a
retroactive edit is absorbed and opening the app twice in a day cannot
double-count.

## The artwork

Three panels, five states each — 15 images in `public/avatar/`, named
`<layer><1..5>.png`. Each panel shows the **lowest** step among the domains
feeding it; you cannot out-train a bad diet, and averaging would let a strong
domain hide a neglected one.

| Panel | Driven by |
|---|---|
| `achtergrond` | INCOME |
| `user` | SLEEP + SPORT + FOOD |
| `lief` | RELATIONSHIP |

The scene is a **collage of abutting panels**, not a stack of cut-outs: the
background is a band across the top, the two figures sit side by side beneath
it. Each panel is a complete picture in its own right, so there is no alpha to
get right, no perspective to match between panels, and no seam to hide.
`layers.ts` holds the tiling in the artwork's own pixel dimensions.

**A domain with no panel is not in the app at all** — no artwork, no checkbox.
ORDER and MIND are currently in that state (`visible: false` in `domains.ts`).
A tick that changed nothing on screen would break the causal link the whole app
rests on. `layers.test.ts` asserts the two tables agree.

To replace the art, drop the files in named as above. If a generator hands you
all five states in one wide sheet, save it as `<layer>.png` and run
`npm run slice` — generating five states in one image keeps them far more
consistent than five separate prompts. Every state of a panel must share its
dimensions, or the panels stop tiling.

## Departures from the spec

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

**The "see your best version" toggle** reverses §3's "do not render an
idealised self for comparison. There is one figure on screen." The stated
reason was that a second, ideal figure blurs the link between today's tick and
today's image. Requested anyway, for motivation, with the conflict on the
table. Scoped to keep what it can: opt-in, off by default, and it hides the
check-in list while active so the idealised scene never sits next to a checkbox
you could tick.

**The twelve appearance questions are gone from onboarding** (§7). They existed
to parameterise a generated figure. The artwork is now a drawing of one
specific person, so there is nothing left for them to drive, and `Profile` is
just `currentAge` — which §3 still needs for the +15 projection.

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

## The weekly warning

`core/atRisk.ts` is the app's one nag, and it exists for a specific gap: a
weekly thing changes nothing on screen for six days and then drops a step.
That is the only case where the picture alone is not feedback in time to act
on. Daily things get no warning — missing one is its own, immediate signal.

It fires when a period is down to its last two days with nothing logged in
it, and it covers the fixed weekly domains and weekly custom tasks under one
rule, because from the user's side they are the same problem. `daily` domains
are excluded even when their cadence spans more than a day: SPORT is 4x a
week, so its period is two days, and warning every other evening is noise.

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

**The avatar layers are precached explicitly** (`vite.config.ts`). Workbox's
default glob leaves them out, and a cached shell with an empty frame is worse
offline than no cache at all.

## Push notifications

The app is otherwise entirely local — this is the one part with a server.

```
public/push-sw.js   push + notificationclick, imported into the generated SW
src/app/push.ts     permission, subscribe, and every way it can fail
api/subscribe.ts    stores the one subscription in a private Blob
api/cron.ts         the daily send, guarded by CRON_SECRET
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
| `VITE_VAPID_PUBLIC_KEY` | Vercel + `.env.local` | Public half of the VAPID pair. Shipped to the browser by design. |
| `VAPID_PRIVATE_KEY` | Vercel only | Secret. Never commit it. |
| `VAPID_SUBJECT` | Vercel | `mailto:` address, required by the push spec. |
| `CRON_SECRET` | Vercel | Vercel sends it as a bearer token; `api/cron.ts` refuses to run without it. |
| `BLOB_READ_WRITE_TOKEN` | automatic | Added by Vercel when the Blob store is connected. |

Regenerate the VAPID pair with
`node -e "console.log(require('web-push').generateVAPIDKeys())"`. Changing it
invalidates the existing subscription — the toggle has to be switched off and
on again.

### Testing it without waiting for evening

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/cron
```

`{"sent":true}` means the push left Vercel. `{"sent":false,"reason":"no
subscription"}` means the toggle was never switched on, on that device.

## Layout

```
src/core/      the model — no DOM, no clock, no storage
  dates.ts     bare "YYYY-MM-DD" arithmetic, 04:00 boundary (§5.2)
  domains.ts   the domains as data (§1), including what is visible
  steps.ts     the step model
  due.ts       "is this domain due today"
  projection.ts  AppState + a date -> what the screen needs
  scoring.ts   what survives of §2: log bookkeeping and the Full Day rule
src/store/     Store interface + IndexedDB and in-memory impls (§5.1)
src/visual/    layers.ts (the domain -> artwork map) and the compositing Avatar
src/app/       the shell: useLifeOS is the one place touching Store and clock;
               every screen takes state as props
src/i18n/      §5.3 — every user-facing string, flat key map, English only
api/           the only server-side code: push subscription + the daily send
scripts/       icon generation, artwork slicing, placeholder sheets
```

## The contract

`domain steps -> layerSteps() -> <Avatar>`. The renderer sees layer steps and
nothing else — not scores, not a profile, not why a layer sits where it does.
That is what keeps the model and the artwork independently replaceable: swap
the PNGs and no code changes; change the step rules and no artwork changes.
