# Life OS

A habit tracker whose only output is a picture of the user's future self.
Binary daily checks in, a scene at age +15 out.

## Read these first, in this order

1. **`README.md`** — how the app actually works now, plus four deliberate
   reversals of the spec and the reasoning behind each. Read it first: the
   spec no longer describes the built system.
2. **`life-os-spec.md`** — the original design. Still worth reading for the
   *why* behind the domains, the cadences and the screens, and still binding
   wherever README does not contradict it. Do not "fix" code back toward its
   literal wording without checking README first.

## Where the build is

All eight §9 steps shipped, then the visual system was replaced: the parametric
SVG figure gave way to three panels of drawn artwork at five states each, and
the EWMA scoring engine gave way to the step model. README explains both.

Live on the user's Vercel deployment, which builds from `main` on GitHub.

The real artwork is in, and web push is built (`api/`, `public/push-sw.js`) —
but it only works once the Vercel side is configured: a **private** Blob store
plus the VAPID/CRON env vars listed in README. Until then the toggle in
Settings reports the failure rather than pretending.

Next up is the history screen: it shows step tracks, but not *which* day was
missed.

## Commands

```bash
npm run dev          # app at :5173
npm run preview      # production build, served — the only way to see the PWA/SW for real
npm test
npm run typecheck
npm run build
npm run icons        # regenerate public/icons/*.png
npm run placeholders # throwaway artwork, so the layer pipeline runs without real art
npm run slice        # cut public/avatar/<layer>.png sheets into <layer>1..5.png
npm run compress     # losslessly shrink the artwork PNGs
```

## Layout

```
src/core/      the model — no DOM, no clock, no storage
src/store/     Store interface + IndexedDB and in-memory impls (§5.1)
src/visual/    layers.ts (domain -> artwork map) and the compositing Avatar
src/app/       the shell: useLifeOS bridges Store+clock, every screen takes props
src/i18n/      §5.3 — every user-facing string, as a flat key map
api/           the only server-side code: push subscription + the daily send
scripts/       icons, artwork slicing, placeholder sheets — not app code
public/avatar/ the artwork: <layer>.png contact sheets and their sliced states
```

## The contract that must not break

`domain steps -> layerSteps() -> <Avatar>`. The renderer sees layer steps and
nothing else. That is what keeps model and artwork independently replaceable:
swap the PNGs and no code changes; change the step rules and no artwork does.

A panel takes the **lowest** step among its domains, and a domain with no panel
is not in the app at all — no artwork, no checkbox, because a tick that changes
nothing on screen breaks the causal link the app rests on. `layers.test.ts`
pins both.

## House style

Match the existing code.

Domains are data (`core/domains.ts`) and layers are data (`visual/layers.ts`).
Nothing may branch on a domain key.

Artwork is never referenced by filename outside `visual/Avatar.tsx`. Adding a
state or a layer should mean editing a table, not chasing string literals.
