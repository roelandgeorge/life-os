# Life OS

A habit tracker whose only output is a picture of the user's future self.
Binary daily checks in, a scene at age +15 out.

## Read these first, in this order

1. **`README.md`** — how the app actually works now, plus its deliberate
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
components (`Button`, `Chip`/`ChipRow`, `Checkbox`, `Card`, `SectionHeading`,
`Note`, `FullDayStrip`) every screen now goes
through. README's "The look" section explains the palette, the self-hosted
serif and the grain. Onboarding, Home and the gamification layer are still
ahead — `docs/plan/PLAN.md` tracks what phase comes next.

**Phase 4 shipped a real onboarding decision tree** (`docs/plan/phase-4.md`)
in place of the single explainer screen: a domain picker (ten domains, pick
some, order them), one starters step per domain turned on, `app/DiscoverScreen.tsx`
and `app/ProfileFields.tsx`. `monthly` started driving a panel like any other
cadence (`core/habits.drivesPanel`), reversing phase 1's rule — see README's
"Departures from the spec" for why, unaffected by anything below.
`core/personas.ts` reads `src/content/personas.json`, but nothing writes
`Profile.personaId`: the persona is phase 6's to ask for, once it has quotes
behind it, and it must never steer which habits get picked.

**The onboarding rebuild has since replaced that tree entirely**
(`docs/onboarding/`, `04-revisions.md` the final word). The domain picker
asked which of ten *domains* to work on — a means, not something anyone
arrives wanting — where the new tree points at the picture's own five panels
and asks what's in the way of each. `src/content/onboarding-tree.json` and
`landings.json` hold it as data, character-for-character pinned by
`core/onboarding.test.ts`; `core/onboarding.ts`'s `step()`/`choose()`/
`chooseDrawing()` walk it and `buildInitialState()`/`seededCatalogItems()`/
`offeredCatalogItems()` resolve a finished run into catalogue ids, deferred
until the whole profile is known so a requirement like H033's `hair` still
gates correctly even though hair is asked last. `app/Onboarding.tsx` is now a
plain `(nodeId, Answers)` renderer with no back/next chrome — every option
both answers and advances in one tap — run three ways: the full S0-to-LAND
path (`App.tsx`, before the store holds any state) and Settings' two
independent redos, "Redo the figure" and "Redo what you work on"
(`docs/onboarding/04-revisions.md` §5), each between a different
`(start, terminal)` node pair, merging into the live state instead of
replacing it.

`Profile.domainOrder` is no longer written by a domain-picker step or read
back by a Settings reorder control — both are gone. It now comes from
`core/onboarding.domainOrderFromSeeds()`: the order a "what you work on" run's
seeded habits' domains first appear, repeats dropped. `core/domains.ts`'s
`orderedDomains()` still reads it the same way to order Home's groups
(`MainScreen.groupHabits`); changing the order means running "what you work
on" again, which is the only reorder control there is now.

`app/DiscoverScreen.tsx`, `app/ProfileFields.tsx`, `app/HabitPicker.tsx` and
`src/ui/Field.tsx`/`Select.tsx` are gone — each had zero remaining callers
once the rebuild landed. `app/DomainCatalog.tsx` replaces Discover: opened
from a domain's own group on Home, the only route into the catalogue now (a
domain never chosen has no group and so no way in), a row collapsed to its
title and an effort marker, its own "Write your own" form shared with
`MainScreen`'s habit-row Edit. Settings holds exactly four things now — the
two redo buttons, the daily reminder, data — the old habit editor and
catalogue button gone with it, since a habit is edited from its own row on
Home and profile fields are onboarding's alone. Home itself (§4.8's one-line
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
  catalog.ts      the habit catalogue (137 items), read from src/content/catalog.json
  domains.ts      the 10 domains as data: colour, which panel(s) they feed
  habits.ts       UserHabit helpers: cadence/streak arithmetic, colour, CRUD
  steps.ts        the weighted panel engine: 0–4 per panel, recomputed from the log
  periods.ts      period arithmetic, anchored per habit at its own startDate
  due.ts          due today, rest day, edit window, dailyTasksDone
  atRisk.ts       the lapse warning + the id-only digest sent to the server
  projection.ts   what the screen shows now; scoring.ts: Full Day, log trimming
  types.ts        AppState, DayLog, UserHabit, Profile, Projection
  onboarding.ts   the tree (docs/onboarding/): step()/choose()/chooseDrawing()
                  walk it, buildInitialState()/seededCatalogItems()/
                  offeredCatalogItems() resolve a finished run
  personas.ts     the persona catalogue (id/name/blurb), from content/personas.json
src/store/      Store interface (types.ts), indexeddb.ts, memory.ts, serialize.ts,
                migrate.ts (v1 -> v2, run on first load of an old record)
src/visual/     scene.ts (the slot table + the fallback-chain resolver, the
                only file naming PNGs), Avatar.tsx (paints a resolved Scene)
src/app/        App (onboarding gate), Onboarding (a plain (nodeId, Answers)
                renderer over the tree, run for the full first pass and for
                Settings' two redos), Shell (tabs), Main/History/Settings
                screens, DomainCatalog (one domain's own catalogue, opened
                from its group on Home — the only route in — sharing its
                WriteHabitForm with MainScreen's habit-row edit), useLifeOS
                (the only bridge to Store + clock — habit CRUD lives here as
                thin wiring around core/habits.ts), push.ts, warmArtwork.ts,
                Celebration
src/ui/         Button, Chip/ChipRow, Checkbox, Card, SectionHeading, Note,
                FullDayStrip — thin components over components.css; tokens.ts
                (parser + contrast helper), tokens.test.ts, chrome.test.ts
src/content/    catalog.json (137 items, docs/onboarding/02-catalog-changes.md),
                onboarding-tree.json + landings.json (docs/onboarding/,
                04-revisions.md the final word), scene.json (hand-written
                scene geometry), artwork.json (scripts/build-artwork-manifest.mjs,
                the file inventory scene.ts resolves against), personas.json
                (hand-written, id/name/blurb)
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
| Catalogue content | `docs/habits.csv` (source) → `src/content/catalog.json` (what ships), via `scripts/import-catalog.mjs`; the onboarding rebuild replaced that JSON wholesale (137 items, `docs/onboarding/02-catalog-changes.md`) and the 14 items added since aren't in the CSV |
| Onboarding tree + landings | `src/content/onboarding-tree.json` + `landings.json`, adapted from `docs/onboarding/` per `04-revisions.md`, read only by `src/core/onboarding.ts` |
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
panel. Keep it that way — a colour must never become a link. `UserHabit.emoji`
(docs/onboarding/04-revisions.md §9, the write-a-habit form's filing mark
instead of a colour picker) is the same promise: nothing may ever map it
back to a domain or a panel either.

`CatalogItem.starter` is unused metadata since the onboarding rebuild — the
tree in `docs/onboarding/` seeds by landing, not by this flag. It survives
in `catalog.json` only because that file is taken as a full replacement and
re-deriving the flag for 137 items would be churn; `catalog.test.ts`'s only
remaining check on it is that a `starter: true` item is a real catalogue
entry. Do not build new logic on it without checking who else reads it first.

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

A domain's catalogue is reachable only from that domain's own group on
Home (docs/onboarding/04-revisions.md §6) — a domain the user isn't
currently working on has no group and so no way in, on purpose. Do not add
a second, cross-domain way to browse the catalogue; the way back to an
off domain is running "what you work on" again from Settings.
