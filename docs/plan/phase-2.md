# Phase 2 — the renderer

Panels, overlays, a variant manifest, placeholders, and the artwork guide the
user draws from. This is the executable plan for phase 2 of
[`PLAN.md`](PLAN.md). The decisions in [`phase-1.md`](phase-1.md) under
"Genomen beslissingen" still bind.

Written in English to match README, CLAUDE.md and the code that reference it.

## Context

Phase 1 replaced the fixed five domains with a catalogue, ten domains and five
panels, but the picture stayed the picture v1 drew. `src/visual/layers.ts` is a
declared stopgap: it folds the five panels back onto the three PNG sets that
already existed (`user`, `lief`, `achtergrond`), each taking the minimum of the
panels standing in for it. Its own header says phase 2 removes it.

Phase 2 makes the five panels real on screen. Each panel gets its own drawing,
the head and the partner become alpha overlays on the body and network boxes,
and which file a slot loads is decided by the user's appearance through a
manifest with a fallback chain. Roughly 60 drawings result. The user produces
them in parallel over the following weeks, so the pipeline has to accept them
one file at a time, without a code change, and without the deployed app
regressing to placeholders in the meantime.

### Decided in the planning session

- **Overlays with alpha**, as `phase-1.md` decided. Body drawn neck-down, head
  drawn on transparency into a fixed rect on top of it. Partner drawn on
  transparency standing in the network box. The alternative, five abutting
  boxes with no alpha anywhere, was on the table and was turned down: it reads
  as a panel grid rather than as one person.
- **Split caching.** Network and wealth have no variants and stay precached.
  The variant art is fetched on use, kept by a CacheFirst runtime rule, and the
  active set is warmed in the background after first render. Precaching all 60
  would be an 18 MB install on a phone, three quarters of it drawings this user
  will never see.
- **A bare Appearance section in Settings**, so gender, hair and partner are
  settable now rather than in phase 4. Phase 4's onboarding writes the same
  `Profile` fields and replaces it.

## The shape of the change

Today: `habits -> panelSteps() -> layerSteps() -> <Avatar>`, and `Avatar`
builds the filenames.

After: `habits -> panelSteps() -> scene(steps, profile) -> <Avatar>`.

`scene()` is pure and resolves everything: which slots are drawn, in what
order, at what rect, from which file. `Avatar` takes a resolved `Scene` and
paints it, still knowing nothing about steps, panels, weights or the profile.
The renderer's ignorance is preserved, one function further down.

**"Lowest wins" leaves the codebase, and that is correct.** It existed because
two panels shared one drawing. With five slots against five panels there is
nothing left to take a minimum of, and the property it protected, that a strong
panel must not hide a neglected one, now holds structurally: body and head are
two separate drawings on screen at the same time. The min assertions in
`layers.test.ts` are replaced, not ported.

**Filenames move out of `Avatar.tsx`.** CLAUDE.md's rule becomes: artwork is
named by the scene table and the generated inventory, never by a string literal
in a component. Same intent, one level up.

## The scene

`src/content/scene.json`, hand-written, typed and read by `src/visual/scene.ts`
the way `catalog.json` is read by `core/catalog.ts`. The placeholder and slice
scripts read the same file, which kills the geometry currently duplicated
between `layers.ts` and the `REGION` constant in
`scripts/make-placeholder-sheets.mjs`.

The frame stays `682 x 1033`, so `.avatar` and `.avatar-layer` in
`src/styles.css` need no change.

```
+-----------------------------------+
|        wealth  (band, box)        |
+------------------+----------------+
| body   (box)     | network (box)  |
|   [head]         |   [partner]    |
|   overlay        |   overlay      |
+------------------+----------------+
```

| Slot | Kind | Panel | Appearance | Rect (x, y, w, h) | Order |
|---|---|---|---|---|---|
| `wealth` | box | wealth | none | 0, 0, 682, 401 | 0 |
| `body` | box | body | user | 0, 401, 409, 632 | 1 |
| `network` | box | network | none | 409, 401, 273, 632 | 2 |
| `head` | overlay | head | user | 123, 439, 164, 164 | 3 |
| `partner` | overlay | partner | partner | 491, 515, 169, 518 | 4 |
| `accessory-body` | overlay | none | none | 0, 401, 409, 632 | 5 |
| `accessory-wealth` | overlay | none | none | 0, 0, 682, 401 | 6 |

The box rects are today's artwork dimensions, unchanged. The two overlay rects
are provisional starting numbers. `docs/artwork-guide.md` states them as the
frame the drawings must be made against, so they are fixed by agreement rather
than measured back out of whatever the generator returns.

The accessory slots are the transparent placeholders `phase-1.md` asked for.
They take the full rect of the box they sit on, so a future drawing decides its
own placement inside a transparent PNG rather than inheriting a number invented
now. Nothing drives them until phase 6.

### Slot fields

- `kind`: `box` or `overlay`. A box tiles the frame and always resolves to
  something. An overlay may resolve to nothing and is then simply not drawn.
- `panel`: which `PanelKey` supplies the step. Absent means a fixed image with
  no state, which is what the two accessory slots are.
- `appearance`: `user`, `partner` or `none`. Which half of the profile picks the
  variant. This one field is what makes head and partner differ.
- `requires`: reuses `Requirement` from `core/catalog.ts`. The partner slot
  carries `partner`, so it disappears when `profile.partner.wanted` is false and
  is drawn when the profile has not said, matching the "omitted means unknown,
  filter permissively" rule `catalogFor` already uses.
- `variants`: which axes the filename carries. `[]`, `['gender']` or
  `['gender', 'hair']`.

## Files and the fallback chain

`public/avatar/` holds the variant-free art, `public/avatar/you/` the variant
art. The split exists so the service worker glob can tell the two apart without
pattern-matching on dashes.

```
public/avatar/wealth1.png .. wealth5.png                          5
public/avatar/network1.png .. network5.png                        5
public/avatar/you/body-male1.png .. body-female5.png             10
public/avatar/you/head-male-blond1.png .. head-female-dark5.png  20
public/avatar/you/partner-male-blond1.png .. -female-dark5.png   20
```

Sixty, which is the count `phase-1.md` estimated.

`scripts/build-artwork-manifest.mjs` scans both folders and writes
`src/content/artwork.json`, a plain list of the files that exist. `scene()`
resolves a slot by walking from most specific to least:

```
head-male-blond3  ->  head-male3  ->  head3  ->  box: placeholder / overlay: nothing
```

Three things follow, and they are the point of the design.

1. **No regression when phase 2 ships.** Rename today's fifteen files (`user`
   to `body`, `lief` to `network`, `achtergrond` to `wealth`) into the least
   specific rung. The deployed app keeps exactly today's picture. Head and
   partner overlays resolve to nothing and are not drawn until they exist. The
   body art still has a head on it during this window. That is expected, and
   the guide says so.
2. **Art arrives one file at a time.** Drop `body-male1.png` in, run
   `npm run manifest`, and that one drawing takes over for that one case.
   Everything else keeps falling back.
3. **Placeholders may point at one file**, as `phase-1.md` asked, because the
   fallback chain does it for them rather than by duplicating bytes.

Missing appearance fields resolve at the less specific rung rather than
guessing, so a user with no profile at all gets the shared drawings. A single
scene-level `defaultAppearance` in `scene.json` covers the one case the chain
cannot: a slot for which only variant files exist.

## Sub-steps

Commit per sub-step.

### 2.1 The scene as data

`src/content/scene.json` and `src/visual/scene.ts` holding the types, the frame,
the slot table and the rect helpers. Rename the fifteen existing PNGs into the
least specific rung. No resolver yet.

### 2.2 The inventory

`scripts/build-artwork-manifest.mjs`, `src/content/artwork.json`, `"manifest"`
in `package.json`, and `slice` and `placeholders` chained to regenerate it.
A test asserts the JSON matches the directory listing, so a file dropped in
without regenerating fails `npm test` instead of failing silently in the
browser.

### 2.3 The resolver

`scene(steps, profile)` in `src/visual/scene.ts` with the fallback chain, the
`requires` filter and the paint order. `Avatar` reduced to painting a `Scene`.
`src/visual/layers.ts` and `layers.test.ts` deleted. `MainScreen.tsx` rewired
(`BEST` becomes `PanelSteps` at `MAX_STEP`, and both `showBest` and
`projection.preview` feed `scene()`), and `Onboarding.tsx` likewise at
`START_STEP`.

### 2.4 Placeholders and slicing

`scripts/make-placeholder-sheets.mjs` rewritten to read `scene.json` and emit
one contact sheet per variant combination, twelve sheets holding sixty panels,
with a real alpha channel and the slot rect drawn to scale for overlay slots.
Its private `REGION` constant goes away. `scripts/slice-sheets.mjs` stops
hardcoding three layer names and slices any sheet in either folder whose
basename does not end in a digit, preserving alpha.
`scripts/compress-artwork.mjs` walks both folders and skips palette
quantisation on overlay slots, which would otherwise chew up soft alpha edges.

### 2.5 Profile

`Hair` closed to `'blond' | 'dark'` in `core/types.ts`, with
`serialize.parseProfile` validating against the union instead of
`typeof === 'string'`. `updateProfile(patch)` added to `useLifeOS` alongside the
existing `updateHabit` wiring. An Appearance section in `SettingsScreen`: you
(male or female), hair, partner yes or no, partner gender and hair.
`HistoryScreen` hides the partner row when the profile says no partner, so the
picture and the history agree.

### 2.6 Caching

`vite.config.ts`: `globPatterns` narrowed to `avatar/*.png`, plus a
`runtimeCaching` CacheFirst rule for `avatar/you/`. A `warmArtwork(scene)`
helper fetches all five states of each active variant slot once, scheduled off
the main path after first render, so the second launch is offline-capable
without the install paying for thirty-five drawings the user will never see.

### 2.7 The artwork guide

`docs/artwork-guide.md`, the document the user works from:

- the scene diagram with the exact rects
- the twelve sheets and the filename each must be saved as
- one shared style preamble, "grainy editorial illustration", that must be
  byte-identical across every prompt
- the per-slot prompt skeletons
- the registration rules: body neck-down in a fixed frame, head filling a fixed
  square with the chin at a fixed height, partner a full-height cut-out on a
  fixed baseline
- overlay sheets must carry a real alpha channel, not a white matte
- the `slice -> compress -> manifest` workflow
- a checklist of all sixty files

### 2.8 Docs

README's "The artwork" section replaced with the five slots, the variants and
the fallback. "The contract" updated to name `scene()`. The precache note under
"Decisions the spec left open" updated to the split. CLAUDE.md: the contract
line, the filename rule, the project structure, the new command, and the
artwork rows in "Where the data lives". `PLAN.md` status set to Built.

## Critical files

| File | What happens |
|---|---|
| `src/visual/layers.ts`, `src/visual/layers.test.ts` | deleted |
| `src/visual/scene.ts`, `src/visual/scene.test.ts` | new, the slot table and the resolver |
| `src/visual/Avatar.tsx` | reduced to painting a resolved `Scene` |
| `src/content/scene.json`, `src/content/artwork.json` | new, the geometry and the inventory |
| `src/core/types.ts`, `src/store/serialize.ts` | `Hair` union, validated on parse |
| `src/app/useLifeOS.ts`, `SettingsScreen.tsx`, `MainScreen.tsx`, `Onboarding.tsx`, `HistoryScreen.tsx` | profile wiring and the scene swap |
| `scripts/make-placeholder-sheets.mjs`, `slice-sheets.mjs`, `compress-artwork.mjs`, `build-artwork-manifest.mjs` | slots and variants instead of three layer names |
| `vite.config.ts`, `package.json` | the caching split, the `manifest` script |
| `docs/artwork-guide.md`, `README.md`, `CLAUDE.md`, `docs/plan/PLAN.md` | docs |

Reused rather than rebuilt: `PanelKey`, `PanelSteps` and `PANEL_KEYS` from
`core/domains.ts`, `Requirement` from `core/catalog.ts`, `MAX_STEP` and
`START_STEP` from `core/steps.ts`, the JSON-into-a-typed-module pattern of
`core/catalog.ts`, the `.avatar` and `.avatar-layer` CSS, and the
`import.meta.env.BASE_URL` path building already in `Avatar.tsx`.

## Tests

`src/visual/scene.test.ts`, in `environment: node` with filesystem reads:

- every slot, variant combination and state resolves to a file that exists
- `artwork.json` matches the directory listing
- with only the least specific rung present, every profile still resolves
- an overlay with no artwork is omitted, a box with none falls back
- the partner slot is dropped when `partner.wanted` is false, and drawn when
  the profile is silent
- box rects tile the frame with no gap and no overlap, overlay rects lie inside
  their box, and the paint order is ascending

`serialize.test.ts` gains the `Hair` union validation and a profile round trip.

## Verification

`npm test`, `npm run typecheck` and `npm run build` green.

Browser, mobile viewport:

1. `npm run placeholders && npm run slice`, then `npm run dev`. Every one of the
   sixty placeholders is labelled with its slot, variant and state, so the
   wiring is readable straight off the screen.
2. Settings, Appearance: switch gender, hair and partner. The picture changes on
   each, and switching partner off removes the overlay and the History row.
3. Delete a variant file and reload. The slot falls back a rung rather than
   breaking. Delete every rung of `head` and the overlay disappears with the
   rest of the scene intact.
4. Tick habits until a panel steps. Only that panel's drawing changes.
5. `npm run preview`, install to the home screen, then go offline. The scene
   still renders, variant art included, from the warm-up.
6. Export, reset, import. The profile survives the round trip.

Before deploying: rename the fifteen real files rather than shipping
placeholders, so the live app on the phone keeps its current picture.

## Working between sessions

This plan was written on Opus in plan mode. Build it in a fresh Sonnet session:
"Read CLAUDE.md and docs/plan/phase-2.md and build phase 2. Commit per
sub-step." Come back to Opus only for a real architectural knot.

The artwork production runs in parallel from here, against
`docs/artwork-guide.md`, and does not block phase 3.
