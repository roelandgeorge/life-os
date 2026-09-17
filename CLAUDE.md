# Life OS

A habit tracker whose only output is a picture of the user's future self.
Binary daily checks in, a scene at age +15 out.

## Read these first, in this order

1. **`README.md`** — how the app actually works now, plus five deliberate
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

**Phase 1 of the v2 rebuild shipped** (`docs/plan/phase-1.md`): a catalogue
(`docs/habits.csv` → `src/content/catalog.json`), one unified `UserHabit`
shape replacing the fixed domains and `CustomTask`, 10 domains feeding 5
panels, and a weighted panel engine. README's "v2 model" section explains it.

**Phase 2 has since shipped too** (`docs/plan/phase-2.md`): five panels now
each get their own drawing. `src/visual/scene.ts` resolves a `PanelSteps` and
a `Profile` into a `Scene` through a variant fallback chain (gender, then
gender+hair for `head` and `partner`), reading the geometry from
`src/content/scene.json` and the file inventory from
`src/content/artwork.json`. `docs/plan/PLAN.md` tracks what phase comes next
(the design system, onboarding, gamification). Read it before starting a
new phase.

**Phase 3 has since shipped too** (`docs/plan/phase-3.md`): the dark
editorial design system. `src/styles/tokens.css` is now the only file with a
colour literal — `src/ui/tokens.ts` parses it and measures contrast,
`tokens.test.ts` pins every value against it — and `src/ui/` holds the base
components (`Button`, `Chip`/`ChipRow`, `Checkbox`, `Card`, `Field`,
`Select`, `SectionHeading`, `Note`, `FullDayStrip`) every screen now goes
through. README's "The look" section explains the palette, the self-hosted
serif and the grain. Onboarding, Home and the gamification layer are still
ahead — `docs/plan/PLAN.md` tracks what phase comes next.

**Phase 4 has since shipped too** (`docs/plan/phase-4.md`): a real
onboarding decision tree replaces the single explainer screen —
`core/onboarding.ts`'s `steps()`/`profileFrom()`/`buildInitialState()`,
rendered by `app/Onboarding.tsx`. `Profile.domainOrder` is the domains the
user turned on during onboarding, in the order they chose; `core/domains.ts`'s
`orderedDomains()` reads it to order Home's groups (`MainScreen.groupHabits`)
and feeds Settings' own domain-order control (`app/ProfileFields.tsx`'s
`DomainOrderField`) — nothing is ever hidden by it, a habit added later from
an off domain still shows, only its group's position on screen changes.
`app/DiscoverScreen.tsx` replaces the inline catalogue `<select>` with a
full-screen, searchable browser opened from Settings, sharing
`app/HabitPicker.tsx` with onboarding's starter step. `monthly` now drives a
panel like any other cadence (`core/habits.drivesPanel`), reversing phase 1's
rule — see README's "Departures from the spec" for why. `core/personas.ts`
reads `src/content/personas.json`; the persona step files a choice with no
effect yet, phase 6 gives it one. Home itself (§4.8's one-line
`groupHabits` edit aside) and the gamification layer are still ahead.

Live on the user's Vercel deployment, which builds from `main` on GitHub.

The fifteen real drawings from phase 1 are in as the fallback rung for
`wealth`, `body` and `network`. `head` and `partner` have no art yet and
render as nothing until the user produces it against
`docs/artwork-guide.md`. Web push works end to end on the user's phone: the
private Blob store and the VAPID/CRON env vars are configured in Vercel. If
it breaks, Settings → "Send a test notification" names the failing step,
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
npm run placeholders    # throwaway artwork sheets, generated from scene.json
npm run slice           # cut any contact sheet into its five numbered states
npm run compress        # losslessly shrink the artwork PNGs
npm run manifest        # regenerate src/content/artwork.json from public/avatar/
```

## Tech stack, and why

| Choice | Why |
|---|---|
| **React 18 + TypeScript**, Vite 6 | Small single-page app; Vite gives the dev server, the build and the PWA plugin in one. |
| TS `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | The model is date and index arithmetic; these catch the off-by-one and "absent vs undefined" bugs that matter in an append-only log. Helpers return concrete values rather than `T \| undefined` to satisfy them. |
| **No UI library, no router, no state library** | Three screens switched by a tab bar (`app/Shell.tsx`); one hook (`useLifeOS`) owns state. Plain CSS under `src/styles/`, base components in `src/ui/`. |
| **IndexedDB**, behind a `Store` interface | Local-first: no account, no server database, works offline. The interface keeps storage swappable and lets tests use `MemoryStore`. |
| **PWA** via `vite-plugin-pwa` (generateSW) | Installable to the home screen, which iOS requires before it allows push. Push handlers are imported into the generated worker from `public/push-sw.js`. |
| **Vercel** hosting + serverless functions in `api/` | Deploys from `main`. The only server code, and only for push. |
| **Web Push** (`web-push`, VAPID) + **Vercel Cron** + **Vercel Blob** (private) | Hobby plan: one cron a day, UTC, ±59 min — hence a reminder toggle, not a time picker. |
| **Vitest** | Pure model tests; `environment: node`, only `src/**/*.test.ts`. |
| Drawn **PNG artwork**, 5 slots, up to 5 states each, 3 with a variant fallback chain | Replaced a parametric SVG figure, then a 3-panel collage. See README for why. `sharp` (dev only) slices, compresses and makes icons. |

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
  onboarding.ts   the decision tree: steps()/profileFrom()/buildInitialState()
  personas.ts     the persona catalogue (id/name/blurb), from content/personas.json
src/store/      Store interface (types.ts), indexeddb.ts, memory.ts, serialize.ts,
                migrate.ts (v1 -> v2, run on first load of an old record)
src/visual/     scene.ts (the slot table + the fallback-chain resolver, the
                only file naming PNGs), Avatar.tsx (paints a resolved Scene)
src/app/        App (onboarding gate), Onboarding (the decision tree renderer),
                Shell (tabs), Main/History/Settings screens, DiscoverScreen
                (full-screen catalogue browser, from Settings), ProfileFields
                (Gender/Hair/Partner/Children/DomainOrder fields, shared by
                Onboarding and Settings), HabitPicker (shared by Onboarding's
                starters step and Discover), useLifeOS (the only bridge to
                Store + clock — habit CRUD lives here as thin wiring around
                core/habits.ts), push.ts, warmArtwork.ts, Celebration
src/ui/         Button, Chip/ChipRow, Checkbox, Card, Field, Select,
                SectionHeading, Note, FullDayStrip — thin components over
                components.css; tokens.ts (parser + contrast helper),
                tokens.test.ts, chrome.test.ts
src/content/    catalog.json (scripts/import-catalog.mjs), scene.json
                (hand-written scene geometry), artwork.json (scripts/build-
                artwork-manifest.mjs, the file inventory scene.ts resolves against),
                personas.json (hand-written, id/name/blurb)
src/i18n/en.ts  every fixed user-facing string; habit titles are data, not i18n
src/styles/     tokens.css (the only file with a colour literal), base.css,
                components.css, screens.css; src/styles.css just @imports them
api/            subscribe.ts, cron.ts, test-push.ts — push only
public/         push-sw.js, icons/, avatar/ (variant-free art) + avatar/you/
                (variant art)
scripts/        catalogue import, artwork manifest, slicing, compression, icons,
                placeholders
docs/plan/      the v2 roadmap (PLAN.md) and per-phase plans (phase-N.md)
docs/artwork-guide.md   what to draw, at what size, saved as what filename
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
| Persona content | `src/content/personas.json`, hand-written, read by `src/core/personas.ts` |
| Domain/panel definitions | `src/core/domains.ts` |
| Scene geometry (slots, rects, variants) | `src/content/scene.json`, typed and resolved by `src/visual/scene.ts` |
| Artwork inventory | `src/content/artwork.json`, generated from `public/avatar/` by `scripts/build-artwork-manifest.mjs` (`npm run manifest`) |
| Artwork | `public/avatar/<slot><1-5>.png` (variant-free) and `public/avatar/you/<slot>-<variant>1-5.png` (variant). A contact sheet dropped in per `docs/artwork-guide.md` is cut by `npm run slice`. |
| Copy | `src/i18n/en.ts` |
| Icons | `public/icons/` (generated) |

## The contract that must not break

`habits -> panelSteps() -> scene() -> <Avatar>`. The renderer paints a
resolved `Scene` and nothing else: not scores, not weights, not a profile,
not why a slot resolved to the file it did. That is what keeps model and
artwork independently replaceable: swap the PNGs and no code changes; change
the panel rules and no artwork does.

Many habits can feed one panel; each contributes its `importance` to a
weighted score, and the panel steps by whether that score clears the 70%
threshold — there is no single domain step anymore. `steps.test.ts` pins the
weighting.

**"Lowest wins" is gone, and that is correct, not a regression.** It existed
in phase 1 because two panels shared one drawing. With five slots against
five panels there is nothing left to take a minimum of: body and head are
two separate drawings on screen at the same time, so a strong one cannot
hide a neglected one sharing its space. Do not reintroduce a minimum across
panels. If a slot ever again stands in for more than one panel, that is a
new design decision, not a restoration of the old one.

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

Domains are data (`core/domains.ts`) and the scene is data
(`src/content/scene.json`). Nothing may branch on a domain key or a slot name.

Artwork is never referenced by filename outside `visual/scene.ts`'s resolver.
Adding a state, a slot or a variant axis should mean editing `scene.json`,
not chasing string literals.

Colour literals live in `src/styles/tokens.css` and nowhere else —
`tokens.test.ts` fails the build if one turns up in `base.css`,
`components.css` or `screens.css`. A component earns a file under
`src/ui/` only once two different screens use it; everything else stays as
markup where it is.
