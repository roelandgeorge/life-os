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
npm run slice        # cut public/avatar/<layer>.png into <layer>-1..5.png
```

## The model

Every domain holds an integer **step**, 0 to 4, one per drawn artwork state.
A period with a hit is +1, a period without one is -1, clamped at both ends.
Five ticked days take a daily domain from the floor to the ceiling; one missed
period costs exactly one image.

The period is the domain's own cadence (`expectedGapDays`), not the calendar
day. SLEEP and FOOD step daily, RELATIONSHIP weekly, INCOME monthly — charging
a weekly domain -1 per calendar day would pin it at zero no matter how well the
user actually did.

Steps are **recomputed from the log on every read**, never accumulated, so a
retroactive edit is absorbed and opening the app twice in a day cannot
double-count.

## The artwork

Four layers, drawn back to front, five states each — 20 images in
`public/avatar/`. Each layer shows the **lowest** step among the domains
feeding it; you cannot out-train a bad diet, and averaging would let a strong
domain hide a neglected one.

| Layer | Driven by |
|---|---|
| `achtergrond` | INCOME |
| `lief` | RELATIONSHIP |
| `lichaam` | SLEEP + SPORT + FOOD |
| `hoofd` | SLEEP |

**A domain with no layer is not in the app at all** — no artwork, no checkbox.
ORDER and MIND are currently in that state (`visible: false` in `domains.ts`).
A tick that changed nothing on screen would break the causal link the whole app
rests on. `layers.test.ts` asserts the two tables agree.

To replace the art: drop one contact sheet per layer in `public/avatar/`, named
`hoofd.png`, `lichaam.png`, `lief.png`, `achtergrond.png` — five states side by
side, worst on the left — then run `npm run slice`. Generating five states in
one image keeps them far more consistent than five separate prompts. All four
sheets must share the same crop and scale, and the three figure layers need
transparency.

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
now start at the floor and climb, which needs no explaining — the BODY
composite (§2.5), and the §8 test vectors, which described an engine that no
longer exists. Recovery and decay are now symmetric at one step each; the old
asymmetry existed to keep a bad week from feeling unrecoverable, and five days
back to the ceiling does that job more plainly.

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

## Decisions the spec left open

**A domain "not due today" is a cadence gap, not a schedule** (`core/due.ts`).
§1 gives no day-of-week for the non-daily domains — they are "sometime this
window", not "Tuesdays". Due-ness comes from `expectedGapDays`, the same number
that drives the step period. Never hit at all is always due.

**`Store` grew a fourth method, `clear()`** (`store/types.ts`). §5.1 specifies
load/save/export/import; Settings' reset needs "no state", which import cannot
express and save cannot either.

**`notificationTime` lives on `AppState`, not `Profile`** (`core/types.ts`).
It is a device setting, not identity. It persists; nothing schedules a real
notification from it yet — that needs a push subscription and a server, out of
scope for a local-only v1.

**Import and reset resync by reloading the page** (`app/SettingsScreen.tsx`).
Both replace the whole `AppState` underneath the hook. Threading a reload path
through every consumer for two rare, deliberate actions is not worth it; ticks
and profile edits update in place.

**The avatar layers are precached explicitly** (`vite.config.ts`). Workbox's
default glob leaves them out, and a cached shell with an empty frame is worse
offline than no cache at all.

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
scripts/       icon generation, artwork slicing, placeholder sheets
```

## The contract

`domain steps -> layerSteps() -> <Avatar>`. The renderer sees layer steps and
nothing else — not scores, not a profile, not why a layer sits where it does.
That is what keeps the model and the artwork independently replaceable: swap
the PNGs and no code changes; change the step rules and no artwork changes.
