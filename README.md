# Life OS

Implementation of `life-os-spec.md` v1. The spec is the source of truth; this
file only records decisions the spec left open and where they live in the code.

```
npm run dev         # app at :5173 (?debug for the step-3 parameter harness)
npm run preview     # production build, served — the real PWA/service worker
npm test
npm run typecheck
npm run icons        # regenerate public/icons/*.png
```

## Status against §9

All eight steps are built.

| Step | | |
|---|---|---|
| 1 | Scoring engine, pure module | done — `src/core/`, all §8 vectors pass |
| 2 | Storage with export/import | done — `src/store/` |
| 3 | Parametric SVG + debug screen | done — 26 parameters, three-mode harness, parametric avatar |
| 4 | Wire scores to parameters | done — `core/projection.ts` builds a `Projection` from real `AppState` |
| 5 | Main screen and check-in flow | done — `app/MainScreen.tsx`, `app/useLifeOS.ts` |
| 6 | Onboarding | done — `app/Onboarding.tsx`, data-driven from `app/onboardingSteps.ts` |
| 7 | History, settings | done — `app/HistoryScreen.tsx`, `app/SettingsScreen.tsx` |
| 8 | PWA manifest, service worker, icon | done — `vite-plugin-pwa`, `public/icons/`, `scripts/generate-icons.mjs` |

What's genuinely unfinished: real push notifications (the settings toggle and
time persist; nothing schedules a notification from them yet — that needs a
push subscription and a server, out of scope for a local-only v1), and the
avatar art pass README already called out under step 3.

The avatar is a working parametric base, not finished art. Nose, hair styling
and cheek modelling are the obvious next passes — but they are slider work on a
system that holds, not structural changes. Render a contact sheet with:

```bash
RENDER_OUT=./out npx vitest run src/visual/_render.test.ts
```

## Layout

```
src/core/      scoring engine — no DOM, no clock, no storage
  dates.ts     bare "YYYY-MM-DD" arithmetic, 04:00 boundary (§5.2)
  domains.ts   the seven domains as data (§1)
  scoring.ts   adherence + asymmetric EWMA (§2)
  fixtures.ts  synthetic histories
src/store/     Store interface + IndexedDB and in-memory impls (§5.1)
src/visual/    the §4 parameter system — the renderer's only input
src/app/       the app shell (steps 5–7): useLifeOS is the one place that
               touches the Store and the clock; everything else here is
               presentational — MainScreen/HistoryScreen/SettingsScreen take
               state as props rather than reading the store themselves.
src/i18n/      §5.3 — every user-facing string, flat key map, English only
src/debug/     step 3's harness. AvatarSchematic is a stand-in, not the artwork.
```

## Decisions the spec left open

Each is load-bearing and documented at length at the top of the file that owns
it. Summarised here so they are not undone by accident.

**The rolling window is clamped to the start of history** (`core/scoring.ts`).
§2.2's `effectiveW = W - excluded` taken literally gives a day-1 user a 14-day
window of which 13 predate the install, so A = 1/14 and the avatar collapses
during the exact period §2.4 asks us to handle gently. Days before the app
existed are not misses.

**Scores are recomputed from the log, never accumulated** (`core/scoring.ts`).
§5.2 allows retroactive edits 3 days back, which an incrementally accumulated
EWMA cannot absorb. Replaying the chain makes the score a pure function of the
log — which is what makes §8 vector 10 true by construction. `lastEvaluatedDate`
survives but only reports *whether* a rollover happened.

**Target rates are rationals, not decimals** (`core/domains.ts`). §1 gives both;
the fractions are normative. `0.143` rounds 1/7 up, capping a perfectly adherent
weekly domain at A = 0.999. Keeping `{n, per}` separate also makes `adherence`
integer arithmetic, so exact cadence yields exactly 1.0 rather than
0.9999999999999999.

**Tiers are continuous positions, not indices** (`visual/params.ts`). §4.6 wants
a ±8-point crossfade around every boundary, which a discrete tier cannot
express. `backgroundTier` is a real number in [0,3]; `blendWeights` turns it
into opacity weights at render time. One slider still drives it.

**`acneCount` stays fractional** (`visual/params.ts`). §4.2 writes `round(...)`,
but rounding at derive time makes a lesion pop in when a score crosses .5. The
count is carried continuously and the renderer fades the partial one. Rounding
is a drawing concern.

**Full Day is its own parameter, not a modifier on `ambientLight`**
(`visual/params.ts`). §4.7 calls it additive and independent; folding it in
would give one parameter two meanings and break slider isolation.

**Identity and state are separate inputs that meet only in the renderer**
(`visual/identity.ts`). `resolveIdentity` takes a `Profile` and nothing else;
`deriveParams` takes scores and nothing else. That is the mechanism behind §7's
"the person in the picture must stay the same person". The dividing rule: if a
stranger could tell it from a photograph on your best day, it is identity.
Whether you have a beard is identity; whether it is trimmed is ORDER.

**Every outline is a point list run through a spline** (`visual/path.ts`), never
a hand-authored `d` attribute — a literal path cannot interpolate, and §4 rules
out sprite sets and discrete states. Move any input and the outline deforms
because there is nothing else it could do.

**The darkest state stops short of black** (`visual/Avatar.tsx`). §4.1's ambient
floor is 0.25, but a projection the user cannot make out is not a warning, it is
an empty frame — and the degraded state is the one the app exists to show.

**History's sparklines include today, not just settled days** (`core/scoring.ts`
`scoreHistory`). §2.7 makes the main screen show a live preview rather than
wait for rollover; showing History's last point frozen at yesterday while the
main screen visibly moves today would read as two different apps disagreeing.
`scoreHistory` is one EWMA pass that keeps every intermediate value, so it
can't drift from `replay`/`previewScores` by construction.

**A domain "not due today" (§6) is a cadence gap, not a schedule.** §1 gives no
day-of-week for RELATIONSHIP/MIND/INCOME — they're "sometime this window", not
"Tuesdays". `core/due.ts` derives "due" from `expectedGapDays` (already used
for the same cadence in `domains.ts`): a domain collapses once it's been hit
inside its own gap, and is due again the moment that gap has passed. Never hit
at all is always due — there's nothing to collapse on.

**`Store` grew a fourth method, `clear()`** (`store/types.ts`). §5.1 specifies
load/save/export/import; Settings' reset (§6) needs to get back to "no state,"
which import can't express and save can't either (there's no state to save).
Additive to the interface, implemented in both the IndexedDB and in-memory
stores.

**`AppState.notificationTime` is optional** (`core/types.ts`). §6 asks for a
configurable notification time; §5's `AppState` doesn't list one, and the spec
doesn't give it a home. It lives on `AppState` rather than `Profile` because
it's a device setting, not identity. Optional so every `AppState` literal
written before step 7 — most of the test suite — keeps type-checking; app code
always reads it as `?? null`. Step 7 only makes the value persist; nothing
schedules an actual notification from it yet, that's a push subscription and a
server, out of scope for a local-only v1.

**Import and reset resync by reloading the page** (`app/SettingsScreen.tsx`).
Both replace the entire `AppState` out from under `useLifeOS`'s in-memory copy
and, for reset, the `App`-level onboarding gate too. Threading a "reload from
store" path through every hook consumer for two rare, deliberate actions
buys correctness the cheap way; profile edits and daily ticks — the common
path — update in place with no reload.

**Onboarding's live preview always renders at score 50** (`app/Onboarding.tsx`).
The portrait during onboarding only exists to build identity (§7); rendering it
at any other score would let an appearance answer read as good or bad
performance, which is exactly what §2.5's "no global life score" is there to
prevent.

## The contract these steps must not break

`deriveParams(scores, body, { fullDay })` is the *only* path from scores to
pixels. The renderer takes `AvatarParams` and never sees a score. That split is
what makes §9's "every parameter independently drivable" structural rather than
a promise, and `src/visual/avatar.test.ts` asserts it: every declared
parameter must visibly change the output on its own. `core/projection.ts` and
`app/useLifeOS.ts` are the only things standing between the `Store` and this
function; neither one skips it.
