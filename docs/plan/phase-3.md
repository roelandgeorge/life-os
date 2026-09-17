# Phase 3 - the dark editorial design system

Tokens, typography, grain, base components, and every existing screen moved
onto them. This is the executable plan for phase 3 of [`PLAN.md`](PLAN.md).
The decisions in [`phase-1.md`](phase-1.md) under "Genomen beslissingen"
still bind, in particular the one line that defines this phase:

> **Design**: dark editorial. Bijna-zwart, gebroken wit, serif-koppen, fijne
> korrel, bronzen accent.

Written in English to match README, CLAUDE.md and the code that reference it.

## Where the build stands

Checked against the repository rather than against the roadmap. Phases 1 and 2
are both built and merged, `main` sits at the phase 2 merge, and the suite is
green there: 127 tests across 10 files, `tsc --noEmit` clean for both the app
and `api/`.

Phase 2 shipped what its plan described. `src/visual/layers.ts` and its test
are gone, `scene.ts` resolves seven slots through the fallback chain,
`scene.json` and the generated `artwork.json` hold the geometry and the
inventory, `Avatar` paints a resolved `Scene` and nothing else, Settings has a
bare Appearance section, and `warmArtwork.ts` plus a CacheFirst rule handle the
variant art. `public/avatar/` holds `wealth`, `body` and `network` at five
states, and `public/avatar/you/` exists and is empty, so the app currently
renders entirely off the least specific rung. That is the intended state until
the sixty drawings arrive, and it is why the deployed picture did not change.

Two things phase 2 deliberately did not touch, and together they are why this
phase is next: `src/styles.css` is **byte-identical** to what it was before
phase 2, all 997 lines of it, and `index.html` is unchanged. The visual system
has been wired, not designed.

## Context

`src/styles.css` is 997 lines, one flat file, and it is the last place in the
codebase still shaped like v1. Six colour variables with no scale, no type
scale, no spacing scale, no focus styles at all, and roughly a quarter of the
file is dead: `.debug`, `.stage`, `.controls`, `.modes`, `.slider*`,
`.readout*`, `.bar*`, `.extremes`, `.derived`, `.check`, `.disclaimer`,
`.pips`, `.pip`, `.swatch*`, `.swatches`, `.task-labels`, `.custom-tasks`,
`.checkin.custom*`, `.custom-row`, `.warmup`, `.add-custom`, `.start`,
`.ageValue`, `.onboarding .progress`, `.onboarding input[type='range']` and
`.notification-row input[type='time']`. They are the parametric-figure debug
harness and the pre-phase-1 custom-task section, kept alive only by never
having been deleted.

The palette also lives in four places that can drift: `src/styles.css`,
`index.html`'s `theme-color`, the PWA manifest in `vite.config.ts`, and
`scripts/generate-icons.mjs`, which hardcodes `#14161a` and `#c9a227` with a
comment telling the reader they come from `styles.css`.

### Decided in this planning session

- **Dark only, permanently.** No light mode, not now and not later. The
  artwork is drawn on a dark ground, so a light theme is not a token swap, it
  is sixty more drawings. `color-scheme: dark` stays and the plan stops
  pretending a second theme is a future option.
- **Plain CSS, one token file, no new dependency.** No Tailwind, no CSS
  Modules, no CSS-in-JS, no theme provider. CLAUDE.md's "no UI library" is
  not an accident of v1, it is what keeps this app a single small bundle, and
  a design system is exactly the moment someone reaches for one.
- **The token file is the source of truth and a test reads it.** Tokens live
  in `src/styles/tokens.css`, hand written. `tokens.test.ts` parses that file
  from disk in the existing `environment: node` setup, the same way phase 2's
  `scene.test.ts` reads the artwork directory. No JSON source, no generator,
  no second copy for JavaScript to import.
- **Contrast is a test, not a review note.** Every text token and every
  domain colour must clear 4.5:1 against the surface it is actually painted
  on. Five of the ten current domain colours fail that today, `finance` at
  3.06:1 on `--panel`, and nothing catches it.
- **No component tests.** Vitest runs `environment: node` over
  `src/**/*.test.ts`. Adding jsdom and a testing library to assert that a
  button renders a button is a stack change that buys very little. Components
  are verified in the browser checklist, tokens and chrome are verified by
  pure tests.
- **Instrument Serif, self-hosted, headings only.** SIL OFL 1.1, one weight,
  Latin subset, in `public/fonts/` and in the precache. Not Google Fonts by
  URL, which would be a third-party request on every cold load in an app whose
  premise is that it works offline. Body text stays on the system sans stack.
- **No new copy.** Phase 3 adds zero keys to `src/i18n/en.ts`. If a
  conversion seems to need a new string, the conversion has drifted into
  redesign.

## Scope: the line phase 3 does not cross

**Phase 3 changes how the app looks, not what is on the screen or where.**

Phase 4 rebuilds onboarding, phase 5 rebuilds the check-in screen, and phase 6
adds the guide, the side quests and the recap. Every layout decision on Home
and Onboarding belongs to those phases. If phase 3 re-lays-out Home, phase 5
throws that work away and the two phases argue about the same file twice.

So the conversion is: same elements, same order, same information, new
tokens, new type, new components. Concretely, these stay exactly as they are
in phase 3:

- the tab bar's three tabs and their order
- the portrait at 64% of the viewport above a scrolling body
- the day picker's four buttons, the risk warning's position, the
  best-version toggle, the grouping of habits by domain
- Settings' six sections and their order, Appearance first
- History's five panel tracks, the Full Day strip and the per-habit strips
- the outright PNG swap when a panel steps. README documents why there is no
  cross-fade, and a design phase is exactly where someone would helpfully add
  one

What phase 3 *does* get to change: every colour, every font, every border,
every radius, every spacing value, the grain, the focus behaviour, the tap
target sizes, and which file a rule lives in.

## The tokens

`src/styles/tokens.css`, the only file in the project allowed to contain a
raw colour literal.

### Ground and paper

Near-black, warmed very slightly so it sits with bronze rather than fighting
it. Off-white rather than pure white, for the same reason.

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--ground` | `#0E0F12` | the page | n/a |
| `--surface` | `#16181C` | raised: cards, check-in rows, tab bar | n/a |
| `--well` | `#08090B` | recessed: the artwork ground, inputs | n/a |
| `--rule` | `#23262C` | hairline | n/a |
| `--rule-strong` | `#343841` | hairline that has to be seen | n/a |
| `--paper` | `#ECE7DF` | primary text | 14.4:1 on `--surface` |
| `--paper-dim` | `#A7A29A` | secondary text, the current `.note` | 7.0:1 |
| `--paper-faint` | `#858079` | tertiary, disabled | 4.5:1 |
| `--bronze` | `#C08A4A` | the accent | 5.9:1 |
| `--bronze-dim` | `#8A6334` | bronze borders and hover | 3.3:1, borders only |
| `--on-bronze` | `#14100A` | text on a bronze fill | 6.3:1 on `--bronze` |
| `--danger` | `#D8756A` | destructive text and borders | 5.7:1 |
| `--focus` | `#C08A4A` | the focus ring | 5.9:1 |

Every ratio above is measured, not asserted, and `tokens.test.ts` re-measures
them on every run.

The six v1 names (`--bg`, `--panel`, `--line`, `--text`, `--muted`,
`--accent`) are **renamed in one sweep and deleted**, not aliased. An alias
layer would be two vocabularies for one palette, and half the codebase would
sit on the old one forever.

### Scales

```css
--space-0: 2px;  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px;

--text-xs: 11px; --text-sm: 12px; --text-base: 14px;
--text-lg: 17px; --text-xl: 20px; --text-2xl: 28px;

--leading-tight: 1.2; --leading-base: 1.5; --leading-loose: 1.65;

--radius-sm: 4px; --radius-md: 8px; --radius-lg: 14px;
--hairline: 1px;

--dur-fast: 120ms; --dur-base: 220ms;
--ease: cubic-bezier(0.2, 0, 0.2, 1);

--tap: 44px;
--z-tabbar: 10; --z-celebration: 50;
```

`--space-*` rather than `--step-*`, deliberately. "Step" already means the
0 to 4 panel value everywhere else in this codebase and a second meaning for
it in the stylesheet would be a trap.

### Domain colours stay in `core/domains.ts`

They are data attached to a domain, not chrome, and they are read from
TypeScript by `Celebration.tsx` and by the two `.label` style props. They stay
where they are. What changes is that all ten are retuned once for the new
ground and pinned by the contrast test. Candidate values, all measured on
`--surface`, the darker of the two surfaces they are painted on:

| Domain | Was | Becomes | Ratio |
|---|---|---|---|
| sleep | `#6C8EBF` | `#7FA3D4` | 6.9:1 |
| nutrition | `#B85C38` | `#D4785A` | 5.6:1 |
| training | `#C08A2E` | `#D2A04A` | 7.5:1 |
| appearance | `#8A7A66` | `#A39280` | 5.9:1 |
| mindset | `#7A6BA8` | `#9A8AC8` | 5.8:1 |
| productivity | `#5C8A72` | `#72A88C` | 6.5:1 |
| social | `#A8557F` | `#C97AA2` | 5.8:1 |
| hospitality | `#C97B63` | `#DE9179` | 7.1:1 |
| family | `#B5793F` | `#CF9257` | 6.7:1 |
| finance | `#4F6F7A` | `#6F95A3` | 5.5:1 |

Hue is preserved in every case, only lightness moves. These are starting
values chosen to clear the gate. The build may re-pick them by eye as long as
the test stays green and the ten stay distinguishable from each other.

## Typography

Serif headings, sans body.

**Headings: one self-hosted serif, subset, precached.** A system serif stack
(`ui-serif, Georgia, serif`) renders as New York on iOS and something quite
different on Android, which is the opposite of an editorial identity. Google
Fonts by URL is worse: a third-party request on every cold load, in an app
whose whole premise is that it works offline and stores nothing anywhere else.

Chosen: **Instrument Serif**, regular, SIL OFL 1.1, Latin subset, one woff2 of
roughly 25 KB in `public/fonts/`, with `OFL.txt` committed beside it. High
contrast, tight, unmistakably editorial, and one weight is genuinely enough for
four heading sizes. Fraunces variable on the `wght` axis was the alternative
and was turned down: roughly double the bytes for weight range this app has
nowhere to spend, since headings appear one at a time on a screen whose point
is the picture.

```css
--serif: 'Instrument Serif', ui-serif, Georgia, serif;
--sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
--tabular: 'tabular-nums';
```

Body text stays on the system sans stack already in `body`. A dense checklist
is not where a display face earns anything, and a second font file would
double the type budget for no gain.

Mechanics that have to be right:

- `@font-face` with `font-display: swap` and a `size-adjust` tuned against the
  fallback, so the swap does not shift the headline.
- `fonts/*.woff2` added to `workbox.globPatterns` in `vite.config.ts`. Phase 2
  left that array alone and excluded the variant art by glob shape instead,
  `avatar/*.png` not matching `avatar/you/*.png`, so this is a clean addition
  beside phase 2's CacheFirst rule rather than an edit fighting it.
- Serif is applied by role, through `--serif` on `h1`, `h2` and the headline
  classes, never by reaching for the family name in a rule.

Where the scale lands: `.headline` at `--text-2xl` in serif, `h2` section
eyebrows staying uppercase and letterspaced but in sans at `--text-xs`,
`.subhead` and `.note` in sans at `--text-sm`, check-in labels at
`--text-base`. The eyebrow stays sans on purpose: a serif small-caps eyebrow
above a serif headline is two display voices stacked.

## Grain and surfaces

**One `feTurbulence` SVG as a data-URI background image, tiled.** No PNG
texture, so nothing to precache and nothing to slice, and it scales to any
device pixel ratio for about 300 bytes.

```css
--grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
--grain-size: 180px;
```

Two things the build will get wrong if they are not written down. `#` must be
percent-encoded as `%23` inside a data URI or the whole declaration is
dropped silently. And `%` inside the SVG must be written `%25`.

Three rules about where grain goes:

1. **Never over the artwork.** The drawings are "grainy editorial
   illustration" and already carry their own grain. A second layer over them
   does not read as texture, it reads as compression noise. `.portrait` and
   `.avatar` are grain-free, and that is the point of applying grain as a
   background on specific surfaces rather than as one overlay.
2. **A background image, not a blend overlay.** A full-viewport element with
   `mix-blend-mode` forces everything beneath it into a composited layer, and
   on mobile Safari that shows up as scroll jank on exactly the screen the
   user scrolls most. Rejected for that reason.
3. **Not `background-attachment: fixed`**, same reason.

Grain goes on `body` and on `--surface` cards. Elevation is otherwise
expressed by the ground/surface/well ramp and a hairline, not by shadows.
Shadows on near-black are invisible and every attempt to make them visible
ends in a grey halo.

## Base components

`src/ui/`, with their CSS in `src/styles/components.css`. Thin presentational
functions over props. No context, no variants object, no polymorphic `as`.

**The rule that keeps this from becoming a library: a component earns a file
only if two different screens use it.** Everything else stays as markup where
it is.

| Component | Replaces | Used by |
|---|---|---|
| `Button` | every raw `<button>` plus `.primary`, `.danger`, `.small`, `.on` | Settings, Onboarding, Main, History, App |
| `Chip` / `ChipRow` | `.chips`, `.chips.cadence`, `.day-picker` | Settings, Main |
| `Checkbox` | the raw `<input type="checkbox">` in `.checkin` and `.notification-row` | Main, Settings |
| `Card` | `.checkin`, `.habit-row`, `.risk-warning` | Main, Settings |
| `Field` | label plus input plus note, currently rebuilt four times | Settings |
| `Select` | four bare `<select>` elements, three of them entirely unstyled | Settings |
| `SectionHeading` | `h2`, `.domain-heading`, `.custom-heading` | all four |
| `Note` | `.note`, `.note.error`, `.subhead` | all four |

`Field` and `Select` are the two that appear in a single screen. They stay
anyway. Settings builds a field four times by hand today and phase 4's Discover
screen will build it again. `Select` is worse than unbuilt: there are four
`<select>` elements in Settings and exactly one CSS rule for them,
`.habit-row-controls select`, so the catalogue picker and both Appearance
dropdowns render as raw browser controls in the middle of a styled screen.
That is visible today on the deployed app.

`FullDayStrip` already exists and is already shared. It moves to `src/ui/`
with the rest.

### Three real bugs the component layer fixes

These are not polish. They are things the app does wrong today on a phone,
and a design phase is the right place for them because each one is a single
fix in a shared component rather than five fixes in five screens.

1. **There is no `:focus-visible` style anywhere in 997 lines.** Tab through
   the app and nothing indicates where you are. One global rule using
   `--focus`, on `:focus-visible` only so a pointer tap does not leave a ring
   behind.
2. **Tap targets under the 44px minimum.** `.day-picker button` computes to
   about 29px tall, `button.small` to about 24px. Both are things you hit with
   a thumb. `--tap` becomes the floor for every interactive element, enforced
   with `min-height` rather than by inflating padding.
3. **`viewport-fit=cover` is set in `index.html` and nothing uses
   `env(safe-area-inset-*)`.** On an iPhone the tab bar sits under the home
   indicator. `.shell` also uses `100vh`, which on iOS Safari is taller than
   the visible viewport. Both are shell-level fixes: `100dvh` and a
   `padding-bottom: env(safe-area-inset-bottom)` on `.tabbar`.

Motion stays restrained. The only transitions are on interactive state
(`--dur-fast`, `--ease`) and they respect the existing
`prefers-reduced-motion` block, which extends to cover them.

## File organisation

```
src/styles.css              the entry, @imports the four below and nothing else
src/styles/tokens.css       :root. The only file with a colour literal.
src/styles/base.css         reset, @font-face, body, headings, focus, grain
src/styles/components.css   the classes the src/ui components render
src/styles/screens.css      what is genuinely screen-specific and nothing more
```

Four files, not one per component. CSS `@import` at the top of `styles.css`
is bundled by Vite at build time, so this costs no extra request. CLAUDE.md's
"all styling in `src/styles.css`" becomes "all styling under `src/styles/`".

## Sub-steps

Commit per sub-step.

### 3.1 Delete the dead CSS

Pure deletion, roughly 240 lines, no visual change whatsoever. The selectors
are listed under "Context". Doing this first means every later sub-step works
on live rules only, and the diff of 3.2 stays readable instead of being a
thousand-line rewrite with a deletion hidden inside it.

Verify by diffing screenshots of all four screens before and after. Nothing
should move by a pixel.

### 3.2 Tokens

`src/styles/tokens.css` with the full table above. `src/styles.css` split
into the four files. Every rule swept onto the new names, the six old names
deleted, every raw hex and the one `rgba()` in `.celebration-badge` replaced.
The ten domain colours retuned in `core/domains.ts`.

`src/ui/tokens.ts`: a pure parser (`parseTokens(css): Record<string,string>`)
and a `contrastRatio(a, b)` helper, both consumed by the test. No token values
live in this file, it only reads them.

`src/ui/tokens.test.ts`:
- every token named in the table exists and parses
- each text token clears 4.5:1 on the surfaces it is used on
- each of the ten domain colours clears 4.5:1 on `--surface`
- no file under `src/styles/` other than `tokens.css` contains a hex or
  `rgb()`/`hsl()` literal

### 3.3 Typography

Instrument Serif regular, Latin subset only, as one woff2 in `public/fonts/`
with `OFL.txt` beside it. `@font-face` in `base.css`, the type scale applied,
`fonts/*.woff2` added to `globPatterns`. Subset before committing and check the
built `sw.js` precache manifest rather than the file size on disk.

### 3.4 Grain and surfaces

`--grain` in `tokens.css`, applied on `body` and on the card surface in
`base.css` and `components.css`. `.portrait` and `.avatar` explicitly excluded.
The ground/surface/well ramp applied to every existing surface.

### 3.5 Base components

`src/ui/` with the eight components plus the moved `FullDayStrip`, and
`components.css` behind them. Focus-visible, `--tap` and the safe-area and
`100dvh` shell fixes land here, because they are properties of the shared
controls and the shell rather than of any one screen.

### 3.6 Convert the screens

In this order, smallest first, so the components are exercised before they
reach the screen that matters most:

1. `App.tsx` (the storage-error screen) and `Celebration.tsx`
2. `Shell.tsx` and the tab bar
3. `HistoryScreen.tsx`
4. `SettingsScreen.tsx`, Appearance section included
5. `Onboarding.tsx`
6. `MainScreen.tsx`

`screens.css` shrinks as this proceeds. A rule that survives to the end of
3.6 without a component claiming it is genuinely screen-specific, which is the
answer this ordering is designed to produce.

### 3.7 Chrome

The palette's fourth and fifth homes, closed:

- `vite.config.ts` reads `src/styles/tokens.css` at config time for the
  manifest's `background_color` and `theme_color`. It is already a node
  module, so this is a `readFileSync` and the existing parser regex.
- `scripts/generate-icons.mjs` reads the same file for `BG` and `FIGURE`
  instead of hardcoding `#14161a` and `#c9a227`. Icons regenerated.
- `index.html`'s `theme-color` keeps its literal, because a static HTML file
  has nowhere to read from, and `chrome.test.ts` pins it equal to `--ground`.

### 3.8 Docs

- README: a new "The look" section covering the token ramp, the serif, the
  grain and the dark-only decision. The `Layout` block gains `src/ui/` and
  `src/styles/`.
- CLAUDE.md: `src/styles.css` becomes `src/styles/` in the project structure,
  `src/ui/` added, the house-style section gains "colour literals live in
  `tokens.css` and nowhere else" and "a component earns a file at two
  consumers".
- `PLAN.md`: phase 3 set to Built.

## Critical files

| File | What happens |
|---|---|
| `src/styles.css` | reduced to four `@import` lines |
| `src/styles/tokens.css`, `base.css`, `components.css`, `screens.css` | new |
| `src/ui/*.tsx` | new: the eight components plus `FullDayStrip` moved |
| `src/ui/tokens.ts`, `tokens.test.ts`, `chrome.test.ts` | new: the parser and the two gates |
| `src/core/domains.ts` | ten colours retuned, structure untouched |
| `src/app/*.tsx` | converted, not re-laid-out |
| `src/app/FullDayStrip.tsx` | moved to `src/ui/` |
| `vite.config.ts` | manifest colours read from tokens, `fonts/*.woff2` precached |
| `scripts/generate-icons.mjs` | reads tokens instead of hardcoding two hexes |
| `index.html` | `theme-color` updated, pinned by a test |
| `public/fonts/` | new: one woff2 and its licence |
| `README.md`, `CLAUDE.md`, `docs/plan/PLAN.md` | docs |

Untouched on purpose: everything phase 2 built. `scene.ts`, `scene.json`,
`artwork.json`, `Avatar.tsx`, `warmArtwork.ts` and the artwork scripts see no
edit in this phase, and neither does any model file under `src/core/` except
`domains.ts`, which changes ten string values and nothing else.

Reused rather than rebuilt: the existing `prefers-reduced-motion` block, the
`.avatar` and `.avatar-layer` geometry (phase 2 left it unchanged and so does
this phase), `DOMAINS` as the shape that carries colour, `FullDayStrip`, the
confetti animation, and the flat i18n map, which gains nothing.

## Tests

Both pure, both in the existing `environment: node` setup, both reading files
from disk the way phase 2's `scene.test.ts` does.

`src/ui/tokens.test.ts`
- every token in the table is present and parses
- text tokens clear 4.5:1 against the surfaces they are painted on
- all ten domain colours clear 4.5:1 against `--surface`
- `tokens.css` is the only file under `src/styles/` containing a colour
  literal
- the `--space-*` and `--text-*` scales are strictly ascending, which catches
  a fat-fingered value that would otherwise only show up as a slightly odd
  screen

`src/ui/chrome.test.ts`
- `index.html`'s `theme-color` equals `--ground`
- the manifest's `background_color` and `theme_color` equal `--ground`
- `scripts/generate-icons.mjs` contains no hex literal

Existing tests are untouched. Phase 3 changes no model code, so a green suite
before and after with no test edits is itself evidence the scope line held.

## Verification

`npm test`, `npm run typecheck` and `npm run build` green.

Browser, mobile viewport:

1. `npm run placeholders && npm run slice` first. `public/avatar/you/` is
   empty, so without it the whole scene resolves to the least specific rung
   and the head and partner overlays are not drawn at all, which hides two of
   the seven slots from every screenshot below.
2. All four screens against the pre-3.1 screenshots. Every element still
   present, in the same order, saying the same thing. Then delete the
   placeholders again and confirm the fallback picture is unchanged too.
3. Keyboard only, no mouse. Tab through Home and Settings. Every control shows
   a visible ring, nothing is reachable but invisible, and no ring is left
   behind after a click.
4. Tick a habit, clear the day. Confetti, the medal, and the panel step still
   work. Then with `prefers-reduced-motion` on: the badge appears, the
   confetti does not, and nothing else animates.
5. Headline and body at a 200% browser zoom and at the OS's largest text
   setting. Nothing clips, nothing overlaps the tab bar.
6. Throttle to Slow 3G and hard reload. The headline renders in the fallback
   and swaps to the serif without the line jumping.
7. `npm run preview`, install to the home screen on the real iPhone. The tab
   bar clears the home indicator, the shell fills the viewport with no gap
   under it, and the status bar matches the page rather than the old
   `#14161a`.
8. Offline after that install. The serif still renders, so the font really is
   in the precache.
9. Export, reset, import. Unchanged, and it should be: no model code moved.

## Risks

**The Appearance section is temporary.** Phase 2 built it bare on purpose and
phase 2's own plan says phase 4's onboarding writes the same `Profile` fields
and replaces it. Convert it, give it the `Select` component and the tokens,
and invest nothing further in it.

**Conversion creeping into redesign.** The likeliest way this phase overruns,
and the reason the scope line is stated as a list of things that do not move.
Home is the specific danger: it is the screen with the most obvious room for
improvement and the one phase 5 is going to rebuild anyway.

**Grain on grain.** If the artwork has arrived by the time this is built, look
at a real drawing with the grain layer on before deciding it is subtle enough.
Placeholders will not show the problem.

**Font bytes.** Phase 2 deliberately cut the precache from an 18 MB install
down to the variant-free art. Adding a font to that same precache is fine at
25 KB and is not fine at 200 KB, so subset before committing, and check the
built `sw.js` precache manifest rather than trusting the file size.

**The contrast test is a floor, not a design.** Ten hues that each clear
4.5:1 can still be ten hues nobody can tell apart. The test cannot check that
and a person has to.

## Working between sessions

This plan was written on Opus in plan mode. Build it in a fresh Sonnet
session: "Read CLAUDE.md and docs/plan/phase-3.md and build phase 3. Commit
per sub-step." Come back to Opus only for a real architectural knot.

Everything in this plan is decided, the serif included. There is nothing left
to ask before building.
