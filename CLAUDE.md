# Life OS

A habit tracker whose only output is a rendered projection of the user's future
self. Binary daily checks in, a portrait at age +15 out.

## Read these first, in this order

1. **`life-os-spec.md`** — the source of truth. The user treats it as such.
   Do not redesign what it already decides.
2. **`README.md`** — eight decisions the spec left open, each with its reason.
   These are load-bearing and easy to undo by accident if you read only the
   spec. Check it before "fixing" anything to match the spec's literal wording.

## Where the build is

§9 build order: all eight steps are done.

| | | |
|---|---|---|
| 1 | Scoring engine, pure module | done — all §8 test vectors pass |
| 2 | Storage with export/import | done |
| 3 | Parametric SVG + debug harness | done — 26 parameters, working avatar |
| 4 | Wire scores to parameters | done — `core/projection.ts` |
| 5 | Main screen and check-in flow | done — `app/MainScreen.tsx`, `app/useLifeOS.ts` |
| 6 | Onboarding | done — `app/Onboarding.tsx` |
| 7 | History, settings | done — `app/HistoryScreen.tsx`, `app/SettingsScreen.tsx` |
| 8 | PWA manifest, service worker, icon | done — `vite-plugin-pwa`, `public/icons/` |

Steps 1–3 were built deliberately in a stronger model because they hold the
expensive-to-reverse decisions. Steps 4–8 are assembly on top of a settled base.

What's left is polish, not structure: the avatar's nose/hair/cheek pass README
already flags, real push scheduling behind the notification-time setting (the
setting exists and persists; nothing fires it yet), and de-jankifying the
onboarding/settings chip UI. None of that touches the two contracts below.

## Commands

```bash
npm run dev         # app at :5173 (?debug for the step-3 parameter harness)
npm run preview     # production build, served — the only way to see the PWA/SW for real
npm test            # unit tests
npm run typecheck
npm run build
npm run icons        # regenerate public/icons/*.png from scripts/generate-icons.mjs
RENDER_OUT=./out npx vitest run src/visual/_render.test.ts   # avatar contact sheet
```

## Layout

```
src/core/      scoring engine — no DOM, no clock, no storage
src/store/     Store interface + IndexedDB and in-memory impls (§5.1)
src/visual/    the §4 parameter system, identity resolution, the avatar
src/app/       the app shell: useLifeOS (Store+clock bridge), Onboarding,
               Shell (tab nav), MainScreen, HistoryScreen, SettingsScreen
src/i18n/      §5.3 — every user-facing string, as a flat key map
src/debug/     the step-3 harness: scores / parameters / identity modes
scripts/       generate-icons.mjs — the PWA icon source, not part of the app bundle
```

## Two contracts that must not break

**`deriveParams(scores, body, { fullDay }) → AvatarParams → renderer`.**
The renderer never sees a score. That split is what makes §9's "every parameter
independently drivable" structural rather than a promise, and
`src/visual/avatar.test.ts` asserts it: every declared parameter must visibly
change the output on its own.

**`resolveIdentity(profile)` takes a Profile and nothing else.**
That is the mechanism behind §7's "the person in the picture must stay the same
person across every state". If it ever needs a score argument, the projection
has stopped being a projection of the same person. A test pins its arity.

## House style

Match the existing code. Notably: outlines are point lists run through the
splines in `visual/path.ts`, never hand-authored `d` attributes — a literal path
cannot interpolate, and §4 rules out sprite sets and discrete states.

Domains are data (`core/domains.ts`). Nothing may branch on a domain key.

The avatar is a working parametric base, not finished art. Nose, hair styling
and cheek modelling want another pass — but that is slider work, not structural
change. Do not restructure it to make art changes.
