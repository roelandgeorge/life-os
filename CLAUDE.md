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

The real artwork is in, and web push works end to end on the user's phone:
the private Blob store and the VAPID/CRON env vars are configured in Vercel.
If it breaks, Settings → "Send a test notification" names the failing step —
README has the table.

**Push is single-user.** `api/subscribe.ts` writes the one subscription to a
fixed path, so a second person switching the reminder on silently replaces
the first. Everything else is per-device and already works for any number of
users. Fix this before the app is shared: one blob per subscription, and a
cron that walks them all.

History shows step tracks per domain plus a per-period strip for each custom
task. It still does not show *which* day a domain was missed.

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

## Tech stack, and why

| Choice | Why |
|---|---|
| **React 18 + TypeScript**, Vite 6 | Small single-page app; Vite gives the dev server, the build and the PWA plugin in one. |
| TS `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | The model is date and index arithmetic; these catch the off-by-one and "absent vs undefined" bugs that matter in an append-only log. Helpers return concrete values rather than `T \| undefined` to satisfy them. |
| **No UI library, no router, no state library** | Three screens switched by a tab bar (`app/Shell.tsx`); one hook (`useLifeOS`) owns state. Plain CSS in `src/styles.css`. |
| **IndexedDB**, behind a `Store` interface | Local-first: no account, no server database, works offline. The interface keeps storage swappable and lets tests use `MemoryStore`. |
| **PWA** via `vite-plugin-pwa` (generateSW) | Installable to the home screen, which iOS requires before it allows push. Push handlers are imported into the generated worker from `public/push-sw.js`. |
| **Vercel** hosting + serverless functions in `api/` | Deploys from `main`. The only server code, and only for push. |
| **Web Push** (`web-push`, VAPID) + **Vercel Cron** + **Vercel Blob** (private) | Hobby plan: one cron a day, UTC, ±59 min — hence a reminder toggle, not a time picker. |
| **Vitest** | Pure model tests; `environment: node`, only `src/**/*.test.ts`. |
| Drawn **PNG artwork**, 3 panels × 5 states | Replaced a parametric SVG figure; see README for why. `sharp` (dev only) slices, compresses and makes icons. |

## Project structure

```
index.html, src/main.tsx   entry
src/core/       the model — pure: no DOM, no clock, no storage
  domains.ts      the building blocks as data: cadence, colour, daily, visible
  steps.ts        the step model: 0–4 per domain, recomputed from the log
  periods.ts      period arithmetic anchored at logs[0].date, shared by all
  due.ts          due today, rest day, edit window, dailyTasksDone
  atRisk.ts       the weekly lapse warning + the id-only digest sent to the server
  customTasks.ts  user-added tasks: cadence, colour, streaks
  projection.ts   what the screen shows now; scoring.ts: Full Day, log trimming
  types.ts        AppState, DayLog, CustomTask, Projection
src/store/      Store interface (types.ts), indexeddb.ts, memory.ts, serialize.ts
src/visual/     layers.ts (domain -> panel table), Avatar.tsx (the only file naming PNGs)
src/app/        App (onboarding gate), Shell (tabs), Main/History/Settings screens,
                useLifeOS (the only bridge to Store + clock), push.ts, Celebration
src/i18n/en.ts  every user-facing string
src/styles.css  all styling
api/            subscribe.ts, cron.ts, test-push.ts — push only
public/         push-sw.js, icons/, avatar/
scripts/        artwork slicing, compression, icons, placeholders — not app code
vercel.json     the cron schedule;  vite.config.ts  PWA + test config
```

Tests sit next to the code they cover (`*.test.ts`).

## Where the data lives

| Data | Location |
|---|---|
| **The user's state** — log, check-in names, own tasks, reminder flag | On the device, IndexedDB database `life-os`, object store `state`, key `current`. One record, written whole. Never leaves the phone. |
| Its shape | `AppState` in `src/core/types.ts`; log capped at 400 days (`MAX_LOG_DAYS`, `core/scoring.ts`). |
| Backups | Settings → Export writes `life-os-export-<date>.json` (envelope with `schemaVersion`, currently 1, in `src/store/types.ts`); Import validates it in `src/store/serialize.ts`. The only defence against a cleared browser. |
| **Push subscription** + weekly digest (ids, dates, period lengths — no names, no log) | Vercel Blob, **private** store, `push/subscription.json` (`SUBSCRIPTION_PATH`, `api/subscribe.ts`). |
| Secrets and keys | Vercel env vars: `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`. Locally only `VITE_VAPID_PUBLIC_KEY` in `.env.local` (gitignored via `*.local`). The private key never goes in the repo. |
| Building-block definitions | `src/core/domains.ts` |
| Panel mapping | `src/visual/layers.ts` |
| Artwork | `public/avatar/<layer><1-5>.png` — layers `achtergrond`, `user`, `lief`. A new `<layer>.png` contact sheet dropped there is cut by `npm run slice`. |
| Copy | `src/i18n/en.ts` |
| Icons | `public/icons/` (generated) |

## The contract that must not break

`domain steps -> layerSteps() -> <Avatar>`. The renderer sees layer steps and
nothing else. That is what keeps model and artwork independently replaceable:
swap the PNGs and no code changes; change the step rules and no artwork does.

A panel takes the **lowest** step among its domains, and a domain with no panel
is not in the app at all — no artwork, no checkbox, because a tick that changes
nothing on screen breaks the causal link the app rests on. `layers.test.ts`
pins both.

The one sanctioned exception is `customTasks`: user-added tasks that move no
panel. They are kept outside `DomainTicks` and styled as a separate, plainer
list precisely so they cannot be mistaken for building blocks. Do not let them
grow into the domain system — if something deserves to move the picture, it
needs a panel and five drawings.

They may now carry a building block's colour, which is filing only: nothing
maps a colour back to a domain, and a coloured task still gets no pips and
moves no panel. Keep it that way — a colour must never become a link.

## House style

Match the existing code.

Domains are data (`core/domains.ts`) and layers are data (`visual/layers.ts`).
Nothing may branch on a domain key.

Artwork is never referenced by filename outside `visual/Avatar.tsx`. Adding a
state or a layer should mean editing a table, not chasing string literals.
