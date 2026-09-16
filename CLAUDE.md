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
3. **`docs/plan/PLAN.md`** — the v2 roadmap and which phase is next; each
   phase has its own `docs/plan/phase-N.md` with the decisions that phase
   locked in. Check it before assuming a v1 concept (a fixed domain, a
   `CustomTask`) is still how something works — phase 1 already replaced it.

## Where the build is

All eight §9 steps shipped, then the visual system was replaced: the parametric
SVG figure gave way to three panels of drawn artwork at five states each, and
the EWMA scoring engine gave way to the step model. README explains both.

**Phase 1 of the v2 rebuild has since shipped** (`docs/plan/phase-1.md`):
a catalogue (`docs/habits.csv` → `src/content/catalog.json`), one unified
`UserHabit` shape replacing the fixed domains and `CustomTask`, 10 domains
feeding 5 panels, and a weighted panel engine. README's "v2 model" section
explains it; `docs/plan/PLAN.md` tracks what phase comes next (the renderer,
the design system, onboarding, gamification) — read it before starting a
new phase.

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

History shows step tracks per panel plus a per-period strip for every habit
on a periodic cadence. It still does not show *which* day a panel was missed.

## Commands

```bash
npm run dev            # app at :5173
npm run preview        # production build, served — the only way to see the PWA/SW for real
npm test
npm run typecheck
npm run build
npm run import-catalog  # regenerate src/content/catalog.json from docs/habits.csv
npm run icons           # regenerate public/icons/*.png
npm run placeholders    # throwaway artwork, so the layer pipeline runs without real art
npm run slice           # cut public/avatar/<layer>.png sheets into <layer>1..5.png
npm run compress        # losslessly shrink the artwork PNGs
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
  catalog.ts      the habit catalogue (123 items), read from src/content/catalog.json
  domains.ts      the 10 domains as data: colour, which panel(s) they feed
  habits.ts       UserHabit helpers: cadence/streak arithmetic, colour, CRUD
  steps.ts        the weighted panel engine: 0–4 per panel, recomputed from the log
  periods.ts      period arithmetic, anchored per habit at its own startDate
  due.ts          due today, rest day, edit window, dailyTasksDone
  atRisk.ts       the lapse warning + the id-only digest sent to the server
  projection.ts   what the screen shows now; scoring.ts: Full Day, log trimming
  types.ts        AppState, DayLog, UserHabit, Profile, Projection
src/store/      Store interface (types.ts), indexeddb.ts, memory.ts, serialize.ts,
                migrate.ts (v1 -> v2, run on first load of an old record)
src/visual/     layers.ts (temporary panel -> 3-PNG-set adapter), Avatar.tsx
                (the only file naming PNGs)
src/app/        App (onboarding gate), Shell (tabs), Main/History/Settings screens,
                useLifeOS (the only bridge to Store + clock — habit CRUD lives here
                as thin wiring around core/habits.ts), push.ts, Celebration
src/content/    catalog.json, generated by scripts/import-catalog.mjs
src/i18n/en.ts  every fixed user-facing string; habit titles are data, not i18n
src/styles.css  all styling
api/            subscribe.ts, cron.ts, test-push.ts — push only
public/         push-sw.js, icons/, avatar/
scripts/        catalogue import, artwork slicing, compression, icons, placeholders
docs/plan/      the v2 roadmap (PLAN.md) and per-phase plans (phase-N.md)
vercel.json     the cron schedule;  vite.config.ts  PWA + test config
```

Tests sit next to the code they cover (`*.test.ts`).

## Where the data lives

| Data | Location |
|---|---|
| **The user's state** — log, habits (catalogue + self-written), reminder flag | On the device, IndexedDB database `life-os`, object store `state`, key `current`. One record, written whole. Never leaves the phone. |
| Its shape | `AppState` in `src/core/types.ts`; log capped at 400 days (`MAX_LOG_DAYS`, `core/scoring.ts`); `schemaVersion: 2`, migrated from an older record by `src/store/migrate.ts`. |
| Backups | Settings → Export writes `life-os-export-<date>.json` (envelope with `schemaVersion`, currently 2, in `src/store/types.ts`); Import validates it in `src/store/serialize.ts`, migrating a v1 export on the way in. The only defence against a cleared browser. |
| **Push subscription** + digest (ids, each habit's own period anchor, last hit, period length — no titles, no log) | Vercel Blob, **private** store, `push/subscription.json` (`SUBSCRIPTION_PATH`, `api/subscribe.ts`). |
| Secrets and keys | Vercel env vars: `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`. Locally only `VITE_VAPID_PUBLIC_KEY` in `.env.local` (gitignored via `*.local`). The private key never goes in the repo. |
| Catalogue content | `docs/habits.csv` (source) → `src/content/catalog.json` (what ships), via `scripts/import-catalog.mjs` |
| Domain/panel definitions | `src/core/domains.ts` |
| Panel -> artwork mapping | `src/visual/layers.ts` (temporary — see README's "v2 model") |
| Artwork | `public/avatar/<layer><1-5>.png` — layers `achtergrond`, `user`, `lief`. A new `<layer>.png` contact sheet dropped there is cut by `npm run slice`. |
| Copy | `src/i18n/en.ts` |
| Icons | `public/icons/` (generated) |

## The contract that must not break

`habits -> panelSteps() -> layerSteps() -> <Avatar>`. The renderer sees layer
steps and nothing else. That is what keeps model and artwork independently
replaceable: swap the PNGs and no code changes; change the panel rules and no
artwork does.

Many habits can feed one panel; each contributes its `importance` to a
weighted score, and the panel steps by whether that score clears the 70%
threshold — there is no single domain step anymore. "Lowest wins" now lives
one level up, in the temporary panel -> layer adapter (`visual/layers.ts`): a
layer takes the **minimum** of the panels standing in for it, so a strong
panel cannot hide a neglected one sharing its drawing. `layers.test.ts` pins
that; `steps.test.ts` pins the weighting.

A habit with no domain moves no panel at all — no artwork, no step pips,
because a tick that changes nothing on screen breaks the causal link the app
rests on. This used to be a separate `CustomTask` type kept outside
`DomainTicks`; it is now just `UserHabit.domain` being unset, the same shape
as every other habit. Do not let a domain-less habit grow a panel of its own
in code — if something deserves to move the picture, it needs a domain, a
panel, and (eventually) five drawings.

A habit may carry its own colour, which is filing only: nothing maps a
colour back to a domain, and a coloured domain-less habit still gets no
panel. Keep it that way — a colour must never become a link.

## House style

Match the existing code.

Domains are data (`core/domains.ts`) and layers are data (`visual/layers.ts`).
Nothing may branch on a domain key.

Artwork is never referenced by filename outside `visual/Avatar.tsx`. Adding a
state or a layer should mean editing a table, not chasing string literals.
